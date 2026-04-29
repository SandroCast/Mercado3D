import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { Product } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductVariant {
  id:         string;
  productId:  string;
  attributes: Record<string, string>;
  stock:      number;
  price?:     number;
  sku?:       string;
  images:     string[];
}

export interface VariantInput {
  attributes: Record<string, string>;
  stock:      number;
  price?:     number;
  sku?:       string;
  images?:    string[];
}

export interface DBProduct {
  id:                string;
  userId:            string;
  title:             string;
  description:       string;
  price:             number;
  originalPrice?:    number;
  brand?:            string;
  category:          string;
  condition:         "new" | "used";
  images:            string[];
  inStock:           boolean;
  freeShipping:      boolean;
  variantAttributes: string[];
  rating:            number;
  reviewCount:       number;
  createdAt:         string;
  sellerName:        string;
  sellerAvatar?:     string;
  weightKg?:         number;
  lengthCm?:         number;
  widthCm?:          number;
  heightCm?:         number;
}

export interface CreateProductInput {
  title:              string;
  description:        string;
  price:              number;
  originalPrice?:     number;
  brand?:             string;
  category:           string;
  condition:          "new" | "used";
  images:             string[];
  inStock:            boolean;
  freeShipping:       boolean;
  variantAttributes?: string[];
  variants?:          VariantInput[];
  weightKg?:          number;
  lengthCm?:          number;
  widthCm?:           number;
  heightCm?:          number;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function fromRow(row: any): DBProduct {
  return {
    id:            row.id,
    userId:        row.user_id,
    title:         row.title,
    description:   row.description,
    price:         Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    brand:         row.brand ?? undefined,
    category:      row.category,
    condition:     row.condition,
    images:        row.images ?? [],
    inStock:           row.in_stock,
    freeShipping:      row.free_shipping,
    variantAttributes: row.variant_attributes ?? [],
    rating:            Number(row.rating),
    reviewCount:       row.review_count,
    createdAt:         row.created_at,
    sellerName:    row.profiles?.full_name ?? row.profiles?.email ?? "Vendedor",
    sellerAvatar:  row.profiles?.avatar_url ?? undefined,
    weightKg:      row.weight_kg ? Number(row.weight_kg) : undefined,
    lengthCm:      row.length_cm ? Number(row.length_cm) : undefined,
    widthCm:       row.width_cm  ? Number(row.width_cm)  : undefined,
    heightCm:      row.height_cm ? Number(row.height_cm) : undefined,
  };
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

export function dbToProduct(p: DBProduct): Product {
  return {
    id:            p.id,
    title:         p.title,
    description:   p.description,
    price:         p.price,
    originalPrice: p.originalPrice,
    images:        p.images,
    category:      p.category as Product["category"],
    condition:     p.condition,
    inStock:       p.inStock,
    freeShipping:  p.freeShipping,
    rating:        p.rating,
    reviewCount:   p.reviewCount,
    createdAt:     p.createdAt,
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

interface ProductsContextValue {
  products:        DBProduct[];
  myProducts:      DBProduct[];
  loading:         boolean;
  fetchProducts:   () => Promise<void>;
  fetchMyProducts: () => Promise<void>;
  createProduct:   (input: CreateProductInput, variants?: VariantInput[]) => Promise<DBProduct>;
  updateProduct:   (id: string, input: Partial<CreateProductInput>, variants?: VariantInput[]) => Promise<void>;
  deleteProduct:   (id: string) => Promise<void>;
  fetchVariants:   (productId: string) => Promise<ProductVariant[]>;
}

const ProductsContext = createContext<ProductsContextValue>({
  products:        [],
  myProducts:      [],
  loading:         false,
  fetchProducts:   async () => {},
  fetchMyProducts: async () => {},
  createProduct:   async () => { throw new Error("not ready"); },
  updateProduct:   async () => {},
  deleteProduct:   async () => {},
  fetchVariants:   async () => [],
});

// ─── Provider ─────────────────────────────────────────────────────────────────

const PRODUCT_QUERY = `
  *,
  profiles:user_id (
    full_name,
    avatar_url,
    email
  )
`;

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [products,   setProducts]   = useState<DBProduct[]>([]);
  const [myProducts, setMyProducts] = useState<DBProduct[]>([]);
  const [loading,    setLoading]    = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_QUERY)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProducts((data ?? []).map(fromRow));
    } catch (err) {
      console.warn("fetchProducts error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyProducts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_QUERY)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMyProducts((data ?? []).map(fromRow));
    } catch (err) {
      console.warn("fetchMyProducts error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => { if (user) fetchMyProducts(); else setMyProducts([]); }, [user?.id]);

  const upsertVariants = async (productId: string, variants: VariantInput[]) => {
    await supabase.from("product_variants").delete().eq("product_id", productId);
    if (variants.length === 0) return;
    const rows = variants.map((v) => ({
      product_id:  productId,
      attributes:  v.attributes,
      stock:        v.stock,
      price:        v.price ?? null,
      sku:          v.sku ?? null,
      images:       v.images ?? [],
    }));
    const { error } = await supabase.from("product_variants").insert(rows);
    if (error) throw error;
  };

  const createProduct = useCallback(async (input: CreateProductInput, variants?: VariantInput[]): Promise<DBProduct> => {
    if (!user) throw new Error("Não autenticado");
    const hasVariants = (variants ?? []).length > 0;
    const { data, error } = await supabase
      .from("products")
      .insert({
        user_id:            user.id,
        title:              input.title,
        description:        input.description,
        price:              input.price,
        original_price:     input.originalPrice ?? null,
        brand:              input.brand ?? null,
        category:           input.category,
        condition:          input.condition,
        images:             input.images,
        in_stock:           hasVariants ? variants!.some((v) => v.stock > 0) : input.inStock,
        free_shipping:      input.freeShipping,
        variant_attributes: input.variantAttributes ?? [],
        weight_kg:          input.weightKg ?? null,
        length_cm:          input.lengthCm ?? null,
        width_cm:           input.widthCm  ?? null,
        height_cm:          input.heightCm ?? null,
      })
      .select(PRODUCT_QUERY)
      .single();
    if (error) throw error;
    if (variants && variants.length > 0) await upsertVariants(data.id, variants);
    const product = fromRow(data);
    setProducts((prev) => [product, ...prev]);
    setMyProducts((prev) => [product, ...prev]);
    return product;
  }, [user]);

  const updateProduct = useCallback(async (id: string, input: Partial<CreateProductInput>, variants?: VariantInput[]) => {
    const patch: any = {};
    if (input.title              !== undefined) patch.title              = input.title;
    if (input.description        !== undefined) patch.description        = input.description;
    if (input.price              !== undefined) patch.price              = input.price;
    if (input.originalPrice      !== undefined) patch.original_price     = input.originalPrice;
    if (input.brand              !== undefined) patch.brand              = input.brand ?? null;
    if (input.category           !== undefined) patch.category           = input.category;
    if (input.condition          !== undefined) patch.condition          = input.condition;
    if (input.images             !== undefined) patch.images             = input.images;
    if (input.inStock            !== undefined) patch.in_stock           = input.inStock;
    if (input.freeShipping       !== undefined) patch.free_shipping      = input.freeShipping;
    if (input.variantAttributes  !== undefined) patch.variant_attributes = input.variantAttributes;
    if (input.weightKg           !== undefined) patch.weight_kg          = input.weightKg ?? null;
    if (input.lengthCm           !== undefined) patch.length_cm          = input.lengthCm ?? null;
    if (input.widthCm            !== undefined) patch.width_cm           = input.widthCm  ?? null;
    if (input.heightCm           !== undefined) patch.height_cm          = input.heightCm ?? null;

    const { data, error } = await supabase
      .from("products")
      .update(patch)
      .eq("id", id)
      .select(PRODUCT_QUERY)
      .single();
    if (error) throw error;
    if (variants !== undefined) await upsertVariants(id, variants);
    const updated = fromRow(data);
    setProducts((prev) => prev.map((p) => p.id === id ? updated : p));
    setMyProducts((prev) => prev.map((p) => p.id === id ? updated : p));
  }, []);

  const fetchVariants = useCallback(async (productId: string): Promise<ProductVariant[]> => {
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id:         r.id,
      productId:  r.product_id,
      attributes: r.attributes,
      stock:      r.stock,
      price:      r.price ? Number(r.price) : undefined,
      sku:        r.sku ?? undefined,
      images:     r.images ?? [],
    }));
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setMyProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <ProductsContext.Provider value={{
      products, myProducts, loading,
      fetchProducts, fetchMyProducts,
      createProduct, updateProduct, deleteProduct, fetchVariants,
    }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  return useContext(ProductsContext);
}
