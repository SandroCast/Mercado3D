import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { DigitalProduct } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DBDigitalProduct {
  id:              string;
  userId:          string;
  title:           string;
  description:     string;
  price:           number;
  originalPrice?:  number;
  category:        string;
  thumbnail:       string;
  previewImages:   string[];
  formats:         string[];
  formatFiles:     Record<string, string>; // format -> public file URL
  printDifficulty: "easy" | "medium" | "hard" | "expert";
  supportRequired: boolean;
  license?:        string;
  downloadCount:   number;
  rating:          number;
  reviewCount:     number;
  createdAt:       string;
  sellerName:      string;
  sellerAvatar?:   string;
}

export interface CreateDigitalProductInput {
  title:           string;
  description:     string;
  price:           number;
  originalPrice?:  number;
  category:        string;
  thumbnail:       string;
  previewImages:   string[];
  formats:         string[];
  formatFiles?:    Record<string, string>;
  printDifficulty: "easy" | "medium" | "hard" | "expert";
  supportRequired: boolean;
  license?:        string;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function fromRow(row: any): DBDigitalProduct {
  return {
    id:              row.id,
    userId:          row.user_id,
    title:           row.title,
    description:     row.description,
    price:           Number(row.price),
    originalPrice:   row.original_price ? Number(row.original_price) : undefined,
    category:        row.category,
    thumbnail:       row.thumbnail,
    previewImages:   row.preview_images ?? [],
    formats:         row.formats ?? [],
    formatFiles:     row.format_files ?? {},
    printDifficulty: row.print_difficulty,
    supportRequired: row.support_required,
    license:         row.license ?? undefined,
    downloadCount:   row.download_count,
    rating:          Number(row.rating),
    reviewCount:     row.review_count,
    createdAt:       row.created_at,
    sellerName:      row.profiles?.full_name ?? row.profiles?.email ?? "Vendedor",
    sellerAvatar:    row.profiles?.avatar_url ?? undefined,
  };
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

export function dbToDigitalProduct(p: DBDigitalProduct): DigitalProduct {
  return {
    id:              p.id,
    title:           p.title,
    description:     p.description,
    price:           p.price,
    originalPrice:   p.originalPrice,
    thumbnail:       p.thumbnail,
    previewImages:   p.previewImages,
    category:        p.category as DigitalProduct["category"],
    formats:         p.formats,
    formatFiles:     p.formatFiles,
    printDifficulty: p.printDifficulty,
    supportRequired: p.supportRequired,
    license:         p.license,
    downloadCount:   p.downloadCount,
    rating:          p.rating,
    reviewCount:     p.reviewCount,
    createdAt:       p.createdAt,
    seller: {
      id:         p.userId,
      name:       p.sellerName,
      avatar:     p.sellerAvatar,
      rating:     0,
      totalSales: 0,
      verified:   false,
    },
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface DigitalProductsContextValue {
  digitalProducts:   DBDigitalProduct[];
  myDigitalProducts: DBDigitalProduct[];
  loading:           boolean;
  fetchDigitalProducts:   () => Promise<void>;
  fetchMyDigitalProducts: () => Promise<void>;
  createDigitalProduct:   (input: CreateDigitalProductInput) => Promise<DBDigitalProduct>;
  updateDigitalProduct:   (id: string, input: Partial<CreateDigitalProductInput>) => Promise<void>;
  deleteDigitalProduct:   (id: string) => Promise<void>;
}

const DigitalProductsContext = createContext<DigitalProductsContextValue>({
  digitalProducts:        [],
  myDigitalProducts:      [],
  loading:                false,
  fetchDigitalProducts:   async () => {},
  fetchMyDigitalProducts: async () => {},
  createDigitalProduct:   async () => { throw new Error("not ready"); },
  updateDigitalProduct:   async () => {},
  deleteDigitalProduct:   async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

const QUERY = `
  *,
  profiles:user_id (
    full_name,
    avatar_url,
    email
  )
`;

export function DigitalProductsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [digitalProducts,   setDigitalProducts]   = useState<DBDigitalProduct[]>([]);
  const [myDigitalProducts, setMyDigitalProducts] = useState<DBDigitalProduct[]>([]);
  const [loading,           setLoading]           = useState(false);

  const fetchDigitalProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("digital_products")
        .select(QUERY)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDigitalProducts((data ?? []).map(fromRow));
    } catch (err) {
      console.warn("fetchDigitalProducts error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyDigitalProducts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("digital_products")
        .select(QUERY)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMyDigitalProducts((data ?? []).map(fromRow));
    } catch (err) {
      console.warn("fetchMyDigitalProducts error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchDigitalProducts(); }, []);
  useEffect(() => { if (user) fetchMyDigitalProducts(); else setMyDigitalProducts([]); }, [user?.id]);

  const createDigitalProduct = useCallback(async (input: CreateDigitalProductInput): Promise<DBDigitalProduct> => {
    if (!user) throw new Error("Não autenticado");
    const { data, error } = await supabase
      .from("digital_products")
      .insert({
        user_id:          user.id,
        title:            input.title,
        description:      input.description,
        price:            input.price,
        original_price:   input.originalPrice ?? null,
        category:         input.category,
        thumbnail:        input.thumbnail,
        preview_images:   input.previewImages,
        formats:          input.formats,
        format_files:     input.formatFiles ?? {},
        print_difficulty: input.printDifficulty,
        support_required: input.supportRequired,
        license:          input.license ?? null,
      })
      .select(QUERY)
      .single();
    if (error) throw error;
    const product = fromRow(data);
    setDigitalProducts((prev) => [product, ...prev]);
    setMyDigitalProducts((prev) => [product, ...prev]);
    return product;
  }, [user]);

  const updateDigitalProduct = useCallback(async (id: string, input: Partial<CreateDigitalProductInput>) => {
    const patch: any = {};
    if (input.title           !== undefined) patch.title            = input.title;
    if (input.description     !== undefined) patch.description      = input.description;
    if (input.price           !== undefined) patch.price            = input.price;
    if (input.originalPrice   !== undefined) patch.original_price   = input.originalPrice;
    if (input.category        !== undefined) patch.category         = input.category;
    if (input.thumbnail       !== undefined) patch.thumbnail        = input.thumbnail;
    if (input.previewImages   !== undefined) patch.preview_images   = input.previewImages;
    if (input.formats         !== undefined) patch.formats          = input.formats;
    if (input.formatFiles     !== undefined) patch.format_files     = input.formatFiles;
    if (input.printDifficulty !== undefined) patch.print_difficulty = input.printDifficulty;
    if (input.supportRequired !== undefined) patch.support_required = input.supportRequired;
    if (input.license         !== undefined) patch.license          = input.license;

    const { data, error } = await supabase
      .from("digital_products")
      .update(patch)
      .eq("id", id)
      .select(QUERY)
      .single();
    if (error) throw error;
    const updated = fromRow(data);
    setDigitalProducts((prev) => prev.map((p) => p.id === id ? updated : p));
    setMyDigitalProducts((prev) => prev.map((p) => p.id === id ? updated : p));
  }, []);

  const deleteDigitalProduct = useCallback(async (id: string) => {
    const { error } = await supabase.from("digital_products").delete().eq("id", id);
    if (error) throw error;
    setDigitalProducts((prev) => prev.filter((p) => p.id !== id));
    setMyDigitalProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <DigitalProductsContext.Provider value={{
      digitalProducts, myDigitalProducts, loading,
      fetchDigitalProducts, fetchMyDigitalProducts,
      createDigitalProduct, updateDigitalProduct, deleteDigitalProduct,
    }}>
      {children}
    </DigitalProductsContext.Provider>
  );
}

export function useDigitalProducts() {
  return useContext(DigitalProductsContext);
}
