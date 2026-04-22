import React, { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { ProductQuestion } from "../types";

interface QuestionsContextValue {
  fetchQuestions: (productId: string) => Promise<ProductQuestion[]>;
  askQuestion: (input: { productId: string; productType: "physical" | "digital"; question: string }) => Promise<ProductQuestion>;
  answerQuestion: (questionId: string, answer: string) => Promise<void>;
  questionsByProduct: Record<string, ProductQuestion[]>;
}

const QuestionsContext = createContext<QuestionsContextValue | null>(null);

function rowToQuestion(r: Record<string, unknown>): ProductQuestion {
  return {
    id: r.id as string,
    productId: r.product_id as string,
    productType: r.product_type as "physical" | "digital",
    askerId: r.asker_id as string,
    askerName: r.asker_name as string,
    question: r.question as string,
    answer: r.answer as string | null,
    answeredAt: r.answered_at as string | null,
    createdAt: r.created_at as string,
  };
}

export function QuestionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [questionsByProduct, setQuestionsByProduct] = useState<Record<string, ProductQuestion[]>>({});

  const fetchQuestions = useCallback(async (productId: string): Promise<ProductQuestion[]> => {
    const { data, error } = await supabase
      .from("product_questions")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const questions = (data ?? []).map(rowToQuestion);
    setQuestionsByProduct((prev) => ({ ...prev, [productId]: questions }));
    return questions;
  }, []);

  const askQuestion = useCallback(async ({
    productId, productType, question,
  }: { productId: string; productType: "physical" | "digital"; question: string }): Promise<ProductQuestion> => {
    if (!user) throw new Error("Você precisa estar logado para perguntar.");

    const askerName: string =
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "Usuário";

    const { data, error } = await supabase
      .from("product_questions")
      .insert({
        product_id: productId,
        product_type: productType,
        asker_id: user.id,
        asker_name: askerName,
        question: question.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    const q = rowToQuestion(data as Record<string, unknown>);
    setQuestionsByProduct((prev) => ({
      ...prev,
      [productId]: [q, ...(prev[productId] ?? [])],
    }));
    return q;
  }, [user]);

  const answerQuestion = useCallback(async (questionId: string, answer: string): Promise<void> => {
    if (!user) throw new Error("Não autorizado.");

    const { error } = await supabase
      .from("product_questions")
      .update({ answer: answer.trim(), answered_at: new Date().toISOString() })
      .eq("id", questionId);

    if (error) throw error;

    // Update local cache
    setQuestionsByProduct((prev) => {
      const updated = { ...prev };
      for (const pid of Object.keys(updated)) {
        updated[pid] = updated[pid].map((q) =>
          q.id === questionId
            ? { ...q, answer: answer.trim(), answeredAt: new Date().toISOString() }
            : q
        );
      }
      return updated;
    });
  }, [user]);

  return (
    <QuestionsContext.Provider value={{ fetchQuestions, askQuestion, answerQuestion, questionsByProduct }}>
      {children}
    </QuestionsContext.Provider>
  );
}

export function useQuestions() {
  const ctx = useContext(QuestionsContext);
  if (!ctx) throw new Error("useQuestions must be used within QuestionsProvider");
  return ctx;
}
