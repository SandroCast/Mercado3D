import React, { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { Order, OrderStatus } from "../types";

interface SalesContextValue {
  sales: Order[];
  loading: boolean;
  fetchSales: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<{ buyerId: string }>;
}

const SalesContext = createContext<SalesContextValue | null>(null);

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    status: row.status as OrderStatus,
    items: row.items as Order["items"],
    subtotal: Number(row.subtotal),
    shippingCost: Number(row.shipping_cost),
    total: Number(row.total),
    paymentMethod: row.payment_method as Order["paymentMethod"],
    shippingAddress: row.shipping_address as Order["shippingAddress"],
    selectedShipping: row.selected_shipping as Order["selectedShipping"],
    mpPreferenceId: row.mp_preference_id as string | undefined,
    mpPaymentId: row.mp_payment_id as string | undefined,
    createdAt: row.created_at as string,
  };
}

export function SalesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sales, setSales] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSales = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // RLS policy allows sellers to read orders where any item has their sellerId
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .neq("user_id", user.id) // exclude own purchases
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter client-side: only orders with at least one item belonging to this seller
      const mySales = (data ?? [])
        .map((r) => rowToOrder(r as Record<string, unknown>))
        .filter((o) => o.items.some((i) => i.sellerId === user.id));

      setSales(mySales);
    } catch (err) {
      console.warn("fetchSales error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select("user_id")
      .single();

    if (error) throw error;

    setSales((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );

    return { buyerId: (data as { user_id: string }).user_id };
  }, []);

  return (
    <SalesContext.Provider value={{ sales, loading, fetchSales, updateOrderStatus }}>
      {children}
    </SalesContext.Provider>
  );
}

export function useSales() {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error("useSales must be used within SalesProvider");
  return ctx;
}
