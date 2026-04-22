import React, { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { Review } from "../types";

interface ReviewsContextValue {
  fetchReviews: (productId: string) => Promise<Review[]>;
  submitReview: (input: {
    productId: string;
    productType: "physical" | "digital";
    rating: number;
    text: string;
  }) => Promise<Review>;
  hasReviewed: (productId: string) => boolean;
  /** Check if user has a delivered order containing this product */
  canReview: (productId: string) => Promise<boolean>;
  reviewsByProduct: Record<string, Review[]>;
}

const ReviewsContext = createContext<ReviewsContextValue | null>(null);

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [reviewsByProduct, setReviewsByProduct] = useState<Record<string, Review[]>>({});

  const fetchReviews = useCallback(async (productId: string): Promise<Review[]> => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const reviews: Review[] = (data ?? []).map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      productId: r.product_id as string,
      productType: r.product_type as "physical" | "digital",
      rating: r.rating as number,
      text: r.text as string,
      authorName: r.author_name as string,
      createdAt: r.created_at as string,
    }));

    setReviewsByProduct((prev) => ({ ...prev, [productId]: reviews }));
    return reviews;
  }, []);

  const canReview = useCallback(async (productId: string): Promise<boolean> => {
    if (!user) return false;
    // Check if user has a delivered order that contains this productId in items JSONB
    const { data, error } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "delivered")
      .contains("items", JSON.stringify([{ productId }]))
      .limit(1);

    if (error) return false;
    return (data ?? []).length > 0;
  }, [user]);

  const submitReview = useCallback(async ({
    productId, productType, rating, text,
  }: { productId: string; productType: "physical" | "digital"; rating: number; text: string }): Promise<Review> => {
    if (!user) throw new Error("Você precisa estar logado para avaliar.");

    const authorName: string =
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "Usuário";

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        user_id: user.id,
        product_id: productId,
        product_type: productType,
        rating,
        text: text.trim(),
        author_name: authorName,
      })
      .select()
      .single();

    if (error) throw error;

    const review: Review = {
      id: data.id,
      userId: data.user_id,
      productId: data.product_id,
      productType: data.product_type,
      rating: data.rating,
      text: data.text,
      authorName: data.author_name,
      createdAt: data.created_at,
    };

    setReviewsByProduct((prev) => ({
      ...prev,
      [productId]: [review, ...(prev[productId] ?? [])],
    }));

    return review;
  }, [user]);

  const hasReviewed = useCallback((productId: string): boolean => {
    if (!user) return false;
    return (reviewsByProduct[productId] ?? []).some((r) => r.userId === user.id);
  }, [user, reviewsByProduct]);

  return (
    <ReviewsContext.Provider value={{ fetchReviews, submitReview, hasReviewed, canReview, reviewsByProduct }}>
      {children}
    </ReviewsContext.Provider>
  );
}

export function useReviews() {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error("useReviews must be used within ReviewsProvider");
  return ctx;
}
