import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DigitalPurchase {
  id:          string;
  userId:      string;
  productId:   string | null;
  title:       string;
  thumbnail:   string;
  formats:     string[];
  formatFiles: Record<string, string>;
  pricePaid:   number;
  acquiredAt:  string;
}

export interface AcquireInput {
  productId:   string;
  title:       string;
  thumbnail:   string;
  formats:     string[];
  formatFiles: Record<string, string>;
  pricePaid:   number;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface DigitalPurchasesContextValue {
  purchases:      DigitalPurchase[];
  loading:        boolean;
  fetchPurchases: () => Promise<void>;
  acquire:        (input: AcquireInput) => Promise<void>;
  hasPurchased:   (productId: string) => boolean;
}

const DigitalPurchasesContext = createContext<DigitalPurchasesContextValue>({
  purchases:      [],
  loading:        false,
  fetchPurchases: async () => {},
  acquire:        async () => {},
  hasPurchased:   () => false,
});

// ─── Mapper ───────────────────────────────────────────────────────────────────

function fromRow(row: any): DigitalPurchase {
  return {
    id:          row.id,
    userId:      row.user_id,
    productId:   row.product_id ?? null,
    title:       row.title,
    thumbnail:   row.thumbnail,
    formats:     row.formats ?? [],
    formatFiles: row.format_files ?? {},
    pricePaid:   Number(row.price_paid),
    acquiredAt:  row.acquired_at,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DigitalPurchasesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<DigitalPurchase[]>([]);
  const [loading,   setLoading]   = useState(false);

  const fetchPurchases = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("digital_purchases")
        .select("*")
        .eq("user_id", user.id)
        .order("acquired_at", { ascending: false });
      if (error) throw error;
      setPurchases((data ?? []).map(fromRow));
    } catch (err) {
      console.warn("fetchPurchases error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchPurchases();
    else setPurchases([]);
  }, [user?.id]);

  const hasPurchased = useCallback(
    (productId: string) => purchases.some((p) => p.productId === productId),
    [purchases],
  );

  const acquire = useCallback(async (input: AcquireInput) => {
    if (!user) throw new Error("Não autenticado");

    // Idempotent: skip if already owned
    if (hasPurchased(input.productId)) return;

    const { data, error } = await supabase
      .from("digital_purchases")
      .insert({
        user_id:      user.id,
        product_id:   input.productId,
        title:        input.title,
        thumbnail:    input.thumbnail,
        formats:      input.formats,
        format_files: input.formatFiles,
        price_paid:   input.pricePaid,
      })
      .select("*")
      .single();

    if (error) throw error;
    setPurchases((prev) => [fromRow(data), ...prev]);
  }, [user, hasPurchased]);

  return (
    <DigitalPurchasesContext.Provider value={{ purchases, loading, fetchPurchases, acquire, hasPurchased }}>
      {children}
    </DigitalPurchasesContext.Provider>
  );
}

export function useDigitalPurchases() {
  return useContext(DigitalPurchasesContext);
}
