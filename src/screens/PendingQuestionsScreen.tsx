import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, RefreshControl, KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useQuestions } from "../contexts/QuestionsContext";
import { supabase } from "../lib/supabase";
import { ProductQuestion } from "../types";

interface PendingQuestion extends ProductQuestion {
  productTitle: string;
  productImage?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  if (h < 24) return `${h}h atrás`;
  if (d < 7) return `${d}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function PendingQuestionsScreen({ visible, onClose }: Props) {
  const Colors = useColors();
  const { user } = useAuth();
  const { answerQuestion } = useQuestions();

  const [questions, setQuestions] = useState<PendingQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Busca IDs e títulos dos produtos do vendedor
      const [physProds, digProds] = await Promise.all([
        supabase.from("products").select("id, title, images").eq("user_id", user.id),
        supabase.from("digital_products").select("id, title, thumbnail_url").eq("user_id", user.id),
      ]);

      const physIds = (physProds.data ?? []).map((p) => p.id as string);
      const digIds  = (digProds.data ?? []).map((p) => p.id as string);
      const physTitles: Record<string, string> = Object.fromEntries((physProds.data ?? []).map((p) => [p.id, p.title]));
      const digTitles:  Record<string, string> = Object.fromEntries((digProds.data ?? []).map((p) => [p.id, p.title]));
      const physImages: Record<string, string> = Object.fromEntries((physProds.data ?? []).filter((p) => p.images?.[0]).map((p) => [p.id, p.images[0]]));
      const digImages:  Record<string, string> = Object.fromEntries((digProds.data ?? []).filter((p) => p.thumbnail_url).map((p) => [p.id, p.thumbnail_url]));

      const results: PendingQuestion[] = [];

      if (physIds.length > 0) {
        const { data } = await supabase
          .from("product_questions")
          .select("*")
          .in("product_id", physIds)
          .eq("product_type", "physical")
          .is("answer", null)
          .order("created_at", { ascending: false });
        (data ?? []).forEach((r) => results.push({
          id: r.id,
          productId: r.product_id,
          productType: "physical",
          askerId: r.asker_id,
          askerName: r.asker_name,
          question: r.question,
          answer: null,
          answeredAt: null,
          createdAt: r.created_at,
          productTitle: physTitles[r.product_id] ?? "Produto",
          productImage: physImages[r.product_id],
        }));
      }

      if (digIds.length > 0) {
        const { data } = await supabase
          .from("product_questions")
          .select("*")
          .in("product_id", digIds)
          .eq("product_type", "digital")
          .is("answer", null)
          .order("created_at", { ascending: false });
        (data ?? []).forEach((r) => results.push({
          id: r.id,
          productId: r.product_id,
          productType: "digital",
          askerId: r.asker_id,
          askerName: r.asker_name,
          question: r.question,
          answer: null,
          answeredAt: null,
          createdAt: r.created_at,
          productTitle: digTitles[r.product_id] ?? "Produto",
          productImage: digImages[r.product_id],
        }));
      }

      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setQuestions(results);
    } catch (err) {
      console.warn("fetchPending error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (visible) fetchPending();
  }, [visible, fetchPending]);

  const handleAnswer = async (q: PendingQuestion) => {
    const text = answerTexts[q.id]?.trim();
    if (!text || submitting) return;
    setSubmitting(q.id);
    try {
      await answerQuestion(q.id, text, { askerId: q.askerId, productId: q.productId, productType: q.productType });
      setQuestions((prev) => prev.filter((item) => item.id !== q.id));
      setAnswerTexts((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
    } catch (err) {
      console.warn("handleAnswer error:", err);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top", "bottom"]}>

        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: 16, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: Colors.bgBorder, gap: 12,
        }}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.white, fontSize: 18, fontWeight: "800" }}>
              Perguntas pendentes
            </Text>
            {questions.length > 0 && (
              <Text style={{ color: Colors.textGray, fontSize: 12 }}>
                {questions.length} aguardando resposta
              </Text>
            )}
          </View>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {loading && questions.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={Colors.cyan} />
            </View>
          ) : questions.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 }}>
              <View style={{
                width: 72, height: 72, borderRadius: 36,
                backgroundColor: Colors.bgCard,
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="checkmark-circle-outline" size={34} color="#22c55e" />
              </View>
              <Text style={{ color: Colors.textMuted, fontSize: 15, textAlign: "center", lineHeight: 22 }}>
                Nenhuma pergunta pendente.{"\n"}Você está em dia!
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={fetchPending} tintColor={Colors.cyan} />
              }
              contentContainerStyle={{ padding: 16, gap: 12 }}
            >
              {questions.map((q) => (
                <View key={q.id} style={{
                  backgroundColor: Colors.bgCard,
                  borderRadius: 12,
                  padding: 16,
                  gap: 12,
                  borderWidth: 1,
                  borderColor: Colors.bgBorder,
                }}>
                  {/* Produto */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {q.productImage ? (
                      <Image
                        source={{ uri: q.productImage }}
                        style={{ width: 36, height: 36, borderRadius: 6 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{
                        width: 36, height: 36, borderRadius: 6,
                        backgroundColor: Colors.bgCardAlt,
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Ionicons name="cube-outline" size={18} color={Colors.cyan} />
                      </View>
                    )}
                    <Text style={{ color: Colors.cyan, fontSize: 12, fontWeight: "700", flex: 1 }} numberOfLines={1}>
                      {q.productTitle}
                    </Text>
                    <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{timeAgo(q.createdAt)}</Text>
                  </View>

                  {/* Pergunta */}
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: Colors.textGray, fontSize: 11, fontWeight: "600" }}>
                      {q.askerName} perguntou:
                    </Text>
                    <Text style={{ color: Colors.white, fontSize: 14, lineHeight: 20 }}>
                      {q.question}
                    </Text>
                  </View>

                  {/* Campo de resposta */}
                  <View style={{
                    backgroundColor: Colors.bg,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: Colors.bgBorder,
                    padding: 10,
                  }}>
                    <TextInput
                      value={answerTexts[q.id] ?? ""}
                      onChangeText={(t) => setAnswerTexts((prev) => ({ ...prev, [q.id]: t }))}
                      placeholder="Escreva sua resposta..."
                      placeholderTextColor={Colors.textMuted}
                      style={{ color: Colors.white, fontSize: 13, minHeight: 60 }}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Botão responder */}
                  <TouchableOpacity
                    onPress={() => handleAnswer(q)}
                    disabled={!answerTexts[q.id]?.trim() || submitting === q.id}
                    style={{
                      backgroundColor: answerTexts[q.id]?.trim() ? Colors.cyan : Colors.bgBorder,
                      borderRadius: 8,
                      paddingVertical: 10,
                      alignItems: "center",
                    }}
                    activeOpacity={0.8}
                  >
                    {submitting === q.id ? (
                      <ActivityIndicator size="small" color={Colors.bg} />
                    ) : (
                      <Text style={{ color: Colors.bg, fontSize: 14, fontWeight: "700" }}>
                        Responder
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
