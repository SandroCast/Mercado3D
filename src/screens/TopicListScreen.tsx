import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useForum, ForumTopic } from "../contexts/ForumContext";
import { TopicDetailScreen } from "./TopicDetailScreen";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ForumCategory {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}

type FilterType = "recent" | "popular" | "unanswered" | "solved";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  return `${mo}m`;
}

// ─── TopicCard ────────────────────────────────────────────────────────────────

function TopicCard({ topic, onPress }: { topic: ForumTopic; onPress: () => void }) {
  const Colors = useColors();
  const initial = topic.authorName.charAt(0).toUpperCase();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: Colors.bgCard,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: topic.isPinned ? Colors.cyan + "44" : Colors.bgBorder,
        padding: 14,
        gap: 10,
      }}
    >
      {/* Badges row */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {topic.isPinned && (
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 3,
            backgroundColor: Colors.cyan + "18",
            borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
            borderWidth: 1, borderColor: Colors.cyan + "44",
          }}>
            <Ionicons name="pin" size={10} color={Colors.cyan} />
            <Text style={{ color: Colors.cyan, fontSize: 10, fontWeight: "700" }}>FIXADO</Text>
          </View>
        )}
        {topic.isLocked && (
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 3,
            backgroundColor: Colors.error + "18",
            borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
            borderWidth: 1, borderColor: Colors.error + "44",
          }}>
            <Ionicons name="lock-closed" size={10} color={Colors.error} />
            <Text style={{ color: Colors.error, fontSize: 10, fontWeight: "700" }}>ENCERRADO</Text>
          </View>
        )}
        {topic.hasSolution && (
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 3,
            backgroundColor: Colors.success + "18",
            borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
            borderWidth: 1, borderColor: Colors.success + "44",
          }}>
            <Ionicons name="checkmark-circle" size={10} color={Colors.success} />
            <Text style={{ color: Colors.success, fontSize: 10, fontWeight: "700" }}>RESOLVIDO</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "700", lineHeight: 20 }} numberOfLines={2}>
        {topic.title}
      </Text>

      {/* Body excerpt */}
      <Text style={{ color: Colors.textMuted, fontSize: 12, lineHeight: 18 }} numberOfLines={2}>
        {topic.body}
      </Text>

      {/* Footer */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{
          width: 22, height: 22, borderRadius: 11,
          backgroundColor: Colors.cyan + "33",
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ color: Colors.cyan, fontSize: 10, fontWeight: "700" }}>{initial}</Text>
        </View>
        <Text style={{ color: Colors.textMuted, fontSize: 11, flex: 1 }} numberOfLines={1}>
          {topic.authorName}
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{timeAgo(topic.updatedAt)}</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Ionicons name="eye-outline" size={12} color={Colors.textMuted} />
          <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{topic.viewCount}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Ionicons name="chatbubble-outline" size={12} color={Colors.textMuted} />
          <Text style={{
            color: topic.replyCount === 0 ? Colors.error : Colors.textMuted,
            fontSize: 11, fontWeight: topic.replyCount === 0 ? "700" : "400",
          }}>{topic.replyCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── NewTopicForm (inline View — no nested Modal) ─────────────────────────────

function NewTopicForm({
  categoryLabel,
  onClose,
  onSubmit,
}: {
  categoryLabel: string;
  onClose: () => void;
  onSubmit: (title: string, body: string) => Promise<void>;
}) {
  const Colors = useColors();
  const [title, setTitle]   = useState("");
  const [body, setBody]     = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});

  const reset = () => { setTitle(""); setBody(""); setErrors({}); };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    const errs: typeof errors = {};
    if (title.trim().length < 5)  errs.title = "Título deve ter pelo menos 5 caracteres";
    if (body.trim().length < 10)  errs.body  = "Mensagem deve ter pelo menos 10 caracteres";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSubmit(title, body);
      reset();
      onClose();
    } catch (e: any) {
      setErrors({ body: e?.message ?? "Erro ao criar tópico" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>

      {/* Header — fora do KAV para não tremer */}
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 12, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: Colors.bgBorder,
        backgroundColor: Colors.bgCard,
      }}>
        <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.white, fontSize: 17, fontWeight: "800" }}>Novo Tópico</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 1 }}>{categoryLabel}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Título */}
          <View style={{ gap: 6 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Título *
            </Text>
            <TextInput
              value={title}
              onChangeText={(v) => { setTitle(v); setErrors((e) => ({ ...e, title: undefined })); }}
              placeholder="Resumo claro do seu tópico..."
              placeholderTextColor={Colors.textMuted}
              maxLength={200}
              style={{
                backgroundColor: Colors.bgCard,
                borderWidth: 1.5,
                borderColor: errors.title ? Colors.error : Colors.bgBorder,
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
                color: Colors.white, fontSize: 15,
              }}
            />
            {errors.title && (
              <Text style={{ color: Colors.error, fontSize: 11 }}>{errors.title}</Text>
            )}
          </View>

          {/* Mensagem */}
          <View style={{ gap: 6 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Mensagem *
            </Text>
            <TextInput
              value={body}
              onChangeText={(v) => { setBody(v); setErrors((e) => ({ ...e, body: undefined })); }}
              placeholder="Detalhe sua dúvida, ideia ou discussão..."
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={5000}
              style={{
                backgroundColor: Colors.bgCard,
                borderWidth: 1.5,
                borderColor: errors.body ? Colors.error : Colors.bgBorder,
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
                color: Colors.white, fontSize: 15, minHeight: 160, textAlignVertical: "top",
              }}
            />
            {errors.body && (
              <Text style={{ color: Colors.error, fontSize: 11 }}>{errors.body}</Text>
            )}
            <Text style={{ color: Colors.textMuted, fontSize: 11, textAlign: "right" }}>
              {body.length}/5000
            </Text>
          </View>

          {/* Botão */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.85}
            style={{
              borderRadius: 14, backgroundColor: Colors.cyan,
              paddingVertical: 15, alignItems: "center",
              opacity: saving ? 0.7 : 1, marginTop: 8,
            }}
          >
            {saving
              ? <ActivityIndicator size="small" color={Colors.bg} />
              : <Text style={{ color: Colors.bg, fontSize: 15, fontWeight: "800" }}>Publicar Tópico</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── TopicListScreen ──────────────────────────────────────────────────────────

interface TopicListScreenProps {
  category: ForumCategory;
  onBack: () => void;
}

export function TopicListScreen({ category, onBack }: TopicListScreenProps) {
  const Colors = useColors();
  const { session } = useAuth();
  const { topicsByCategory, fetchTopics, createTopic } = useForum();

  const [filter, setFilter]             = useState<FilterType>("recent");
  const [loading, setLoading]           = useState(false);
  const [loaded, setLoaded]             = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [newTopicVisible, setNewTopicVisible] = useState(false);
  const [selectedTopic, setSelectedTopic]     = useState<ForumTopic | null>(null);

  const categoryId = category.id;
  const topics     = topicsByCategory[categoryId] ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fetchTopics(categoryId);
    } catch {}
    finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [categoryId, fetchTopics]);

  useEffect(() => {
    setLoaded(false);
    setNewTopicVisible(false);
    load();
  }, [categoryId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load().finally(() => setRefreshing(false));
  };

  const filtered = (() => {
    switch (filter) {
      case "popular":    return [...topics].sort((a, b) => (b.viewCount + b.replyCount * 3) - (a.viewCount + a.replyCount * 3));
      case "unanswered": return topics.filter((t) => t.replyCount === 0);
      case "solved":     return topics.filter((t) => t.hasSolution);
      default:           return topics;
    }
  })();

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "recent",     label: "Recentes"     },
    { key: "popular",    label: "Populares"    },
    { key: "unanswered", label: "Sem resposta" },
    { key: "solved",     label: "Resolvidos"   },
  ];

  if (newTopicVisible) {
    return (
      <NewTopicForm
        categoryLabel={category.label}
        onClose={() => setNewTopicVisible(false)}
        onSubmit={(title, body) => createTopic(categoryId, title, body).then(() => {})}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={{
        backgroundColor: Colors.bgCard,
        borderBottomWidth: 1, borderBottomColor: Colors.bgBorder,
        paddingHorizontal: 12, paddingVertical: 10,
        flexDirection: "row", alignItems: "center", gap: 8,
      }}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={{
          width: 32, height: 32, borderRadius: 8,
          backgroundColor: category.color + "22",
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name={category.icon} size={16} color={category.color} />
        </View>
        <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "800", flex: 1 }} numberOfLines={1}>
          {category.label}
        </Text>
        {session && (
          <TouchableOpacity
            onPress={() => setNewTopicVisible(true)}
            activeOpacity={0.8}
            style={{
              flexDirection: "row", alignItems: "center", gap: 5,
              backgroundColor: Colors.cyan + "18",
              borderWidth: 1, borderColor: Colors.cyan + "55",
              borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
            }}
          >
            <Ionicons name="add" size={15} color={Colors.cyan} />
            <Text style={{ color: Colors.cyan, fontSize: 12, fontWeight: "700" }}>Novo tópico</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: "center" }}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
              backgroundColor: filter === f.key ? Colors.cyan : Colors.bgCardAlt,
              borderWidth: 1, borderColor: filter === f.key ? Colors.cyan : Colors.bgBorder,
            }}
          >
            <Text style={{
              color: filter === f.key ? Colors.bg : Colors.textMuted,
              fontSize: 12, fontWeight: filter === f.key ? "700" : "500",
            }}>
              {f.label}
              {f.key === "unanswered" && topics.filter((t) => t.replyCount === 0).length > 0
                ? ` (${topics.filter((t) => t.replyCount === 0).length})`
                : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading && !loaded ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator size="large" color={Colors.cyan} />
          <Text style={{ color: Colors.textMuted, fontSize: 14 }}>Carregando tópicos...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.cyan} />
          }
        >
          {/* Stats bar */}
          <View style={{
            flexDirection: "row", gap: 10,
            backgroundColor: Colors.bgCard,
            borderRadius: 12, borderWidth: 1, borderColor: Colors.bgBorder,
            padding: 12,
          }}>
            {[
              { label: "Tópicos",     value: topics.length,                              color: category.color },
              { label: "Respostas",   value: topics.reduce((s, t) => s + t.replyCount, 0), color: "#a78bfa" },
              { label: "Resolvidos",  value: topics.filter((t) => t.hasSolution).length, color: Colors.success },
            ].map(({ label, value, color }) => (
              <View key={label} style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ color, fontSize: 18, fontWeight: "900" }}>{value}</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 10, marginTop: 1 }}>{label}</Text>
              </View>
            ))}
          </View>

          {filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.bgBorder,
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="chatbubbles-outline" size={28} color={Colors.textMuted} />
              </View>
              <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "700" }}>
                {filter === "unanswered" ? "Todos os tópicos têm resposta!" :
                 filter === "solved"     ? "Nenhum tópico resolvido ainda" :
                                           "Nenhum tópico ainda"}
              </Text>
              <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center" }}>
                {session ? "Seja o primeiro a criar um tópico nesta categoria." :
                           "Entre na sua conta para criar o primeiro tópico."}
              </Text>
            </View>
          ) : (
            filtered.map((topic) => (
              <TopicCard key={topic.id} topic={topic} onPress={() => setSelectedTopic(topic)} />
            ))
          )}
        </ScrollView>
      )}

      {selectedTopic && (
        <TopicDetailScreen
          topic={selectedTopic}
          category={category}
          onClose={() => setSelectedTopic(null)}
        />
      )}
    </View>
  );
}
