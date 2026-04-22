import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FavoriteItem {
  id: string;
  productId: string;
  productType: "physical" | "digital";
  title: string;
  price: number;
  imageUrl?: string;
  sellerName?: string;
  createdAt: string;
}

export interface FavoriteInput {
  productId: string;
  productType: "physical" | "digital";
  title: string;
  price: number;
  imageUrl?: string;
  sellerName?: string;
}

// ─── DB mapper ────────────────────────────────────────────────────────────────

function fromRow(row: Record<string, any>): FavoriteItem {
  return {
    id:          row.id,
    productId:   row.product_id,
    productType: row.product_type,
    title:       row.title,
    price:       row.price,
    imageUrl:    row.image_url ?? undefined,
    sellerName:  row.seller_name ?? undefined,
    createdAt:   row.created_at,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface FavoritesContextValue {
  favorites: FavoriteItem[];
  loading: boolean;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (input: FavoriteInput) => Promise<void>;
  fetchFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favorites:      [],
  loading:        false,
  isFavorite:     () => false,
  toggleFavorite: async () => {},
  fetchFavorites: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading]     = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFavorites((data ?? []).map(fromRow));
    } catch (err) {
      console.warn("fetchFavorites error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchFavorites();
    else setFavorites([]);
  }, [user?.id]);

  const isFavorite = useCallback(
    (productId: string) => favorites.some((f) => f.productId === productId),
    [favorites]
  );

  const toggleFavorite = useCallback(async (input: FavoriteInput) => {
    if (!user) return;

    const existing = favorites.find((f) => f.productId === input.productId);

    if (existing) {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
      setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
    } else {
      const { data, error } = await supabase
        .from("user_favorites")
        .insert({
          user_id:      user.id,
          product_id:   input.productId,
          product_type: input.productType,
          title:        input.title,
          price:        input.price,
          image_url:    input.imageUrl ?? null,
          seller_name:  input.sellerName ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      setFavorites((prev) => [fromRow(data), ...prev]);
    }
  }, [user, favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, loading, isFavorite, toggleFavorite, fetchFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFavorites() {
  return useContext(FavoritesContext);
}
