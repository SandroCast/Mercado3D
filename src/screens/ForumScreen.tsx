import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar,
  ActivityIndicator, BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useForum, ForumSearchResult } from "../contexts/ForumContext";
import { TopicListScreen, ForumCategory } from "./TopicListScreen";
import { TopicDetailScreen } from "./TopicDetailScreen";

// ─── Categories ───────────────────────────────────────────────────────────────

export const FORUM_CATEGORIES: ForumCategory[] = [
  { id: "geral",       icon: "chatbubbles-outline", label: "Geral",                color: "#22d3ee" },
  { id: "ajuda",       icon: "help-circle-outline", label: "Ajuda & Suporte",      color: "#f59e0b" },
  { id: "showcase",    icon: "images-outline",      label: "Showcase",             color: "#a78bfa" },
  { id: "filamentos",  icon: "layers-outline",      label: "Filamentos & Materiais", color: "#34d399" },
  { id: "impressoras", icon: "print-outline",       label: "Impressoras",          color: "#f97316" },
  { id: "modelagem",   icon: "cube-outline",        label: "Modelagem 3D",         color: "#60a5fa" },
  { id: "vendedores",  icon: "storefront-outline",  label: "Vendedores",           color: "#22c55e" },
  { id: "off-topic",   icon: "compass-outline",     label: "Off-topic",            color: "#94a3b8" },
];

// ─── CategoryCard ─────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  topicCount,
  replyCount,
  onPress,
}: {
  category: ForumCategory;
  topicCount: number;
  replyCount: number;
  onPress: () => void;
}) {
  const Colors = useColors();

  const DESCRIPTIONS: Record<string, string> = {
    geral:       "Discussões livres sobre impressão 3D e o Mercado3D",
    ajuda:       "Tire dúvidas com a comunidade",
    showcase:    "Mostre suas impressões e projetos",
    filamentos:  "Reviews, dicas e comparativos de materiais",
    impressoras: "Dicas, configurações e troubleshooting",
    modelagem:   "CAD, sculpting, slicers e ferramentas",
    vendedores:  "Dicas para anunciar e vender melhor",
    "off-topic": "Assuntos variados fora do universo 3D",
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: Colors.bgCard,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.bgBorder,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}
    >
      <View style={{
        width: 46, height: 46, borderRadius: 12,
        backgroundColor: category.color + "22",
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: category.color + "44",
      }}>
        <Ionicons name={category.icon} size={22} color={category.color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "700" }}>
          {category.label}
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 17 }} numberOfLines={2}>
          {DESCRIPTIONS[category.id] ?? ""}
        </Text>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 11 }}>
            {topicCount} {topicCount === 1 ? "tópico" : "tópicos"}
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 11 }}>
            {replyCount} {replyCount === 1 ? "resposta" : "respostas"}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─── SearchResultCard ─────────────────────────────────────────────────────────

function SearchResultCard({
  result,
  onPress,
}: {
  result: ForumSearchResult;
  onPress: () => void;
}) {
  const Colors = useColors();
  const { topic, matchIn, snippet } = result;
  const cat = FORUM_CATEGORIES.find((c) => c.id === topic.categoryId);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: Colors.bgCard,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.bgBorder,
        padding: 14,
        gap: 8,
      }}
    >
      {/* Category badge */}
      {cat && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            backgroundColor: cat.color + "18",
            borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
            borderWidth: 1, borderColor: cat.color + "44",
          }}>
            <Ionicons name={cat.icon} size={10} color={cat.color} />
            <Text style={{ color: cat.color, fontSize: 10, fontWeight: "700" }}>{cat.label}</Text>
          </View>
          {matchIn === "post" && (
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 4,
              backgroundColor: Colors.bgCardAlt,
              borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
              borderWidth: 1, borderColor: Colors.bgBorder,
            }}>
              <Ionicons name="chatbubble-outline" size={10} color={Colors.textMuted} />
              <Text style={{ color: Colors.textMuted, fontSize: 10, fontWeight: "600" }}>Em resposta</Text>
            </View>
          )}
        </View>
      )}

      {/* Title */}
      <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "700", lineHeight: 20 }} numberOfLines={2}>
        {topic.title}
      </Text>

      {/* Snippet */}
      {snippet.length > 0 && (
        <Text style={{ color: Colors.textMuted, fontSize: 12, lineHeight: 18 }} numberOfLines={2}>
          {snippet}
        </Text>
      )}

      {/* Footer */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{
          width: 20, height: 20, borderRadius: 10,
          backgroundColor: Colors.cyan + "33",
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ color: Colors.cyan, fontSize: 9, fontWeight: "700" }}>
            {topic.authorName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={{ color: Colors.textMuted, fontSize: 11, flex: 1 }} numberOfLines={1}>
          {topic.authorName}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Ionicons name="chatbubble-outline" size={11} color={Colors.textMuted} />
          <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{topic.replyCount}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Ionicons name="eye-outline" size={11} color={Colors.textMuted} />
          <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{topic.viewCount}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

// ─── ForumScreen ──────────────────────────────────────────────────────────────

export function ForumScreen() {
  const Colors = useColors();
  const { session } = useAuth();
  const { topicsByCategory, searchTopics } = useForum();

  const [search, setSearch]                   = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ForumCategory | null>(null);
  const [searchResults, setSearchResults]       = useState<ForumSearchResult[]>([]);
  const [searchLoading, setSearchLoading]       = useState(false);
  const [searchTopic, setSearchTopic]           = useState<{ topic: typeof searchResults[0]["topic"]; category: ForumCategory } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!selectedCategory && !searchTopic) return;
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (searchTopic) { setSearchTopic(null); return true; }
      if (selectedCategory) { setSelectedCategory(null); return true; }
      return false;
    });
    return () => handler.remove();
  }, [selectedCategory, searchTopic]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = search.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchTopics(q);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const totalTopics  = Object.values(topicsByCategory).reduce((s, t) => s + t.length, 0);
  const totalReplies = Object.values(topicsByCategory).reduce(
    (s, topics) => s + topics.reduce((ss, t) => ss + t.replyCount, 0), 0
  );
  const totalSolved = Object.values(topicsByCategory).reduce(
    (s, topics) => s + topics.filter((t) => t.hasSolution).length, 0
  );

  const isSearching = search.trim().length >= 2;

  if (selectedCategory) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <TopicListScreen
          category={selectedCategory}
          onBack={() => setSelectedCategory(null)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top"]}>

      {/* Header */}
      <View style={{
        backgroundColor: Colors.bgCard,
        borderBottomWidth: 1, borderBottomColor: Colors.bgBorder,
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
        gap: 12,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: Colors.white, fontSize: 22, fontWeight: "900" }}>Fórum</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 1 }}>
              Comunidade Mercado3D
            </Text>
          </View>
        </View>

        {/* Busca */}
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 8,
          backgroundColor: Colors.bgCardAlt,
          borderRadius: 10, borderWidth: 1, borderColor: Colors.bgBorder,
          paddingHorizontal: 12, paddingVertical: 8,
        }}>
          {searchLoading
            ? <ActivityIndicator size="small" color={Colors.textMuted} />
            : <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          }
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar tópicos e mensagens..."
            placeholderTextColor={Colors.textMuted}
            style={{ flex: 1, color: Colors.white, fontSize: 14 }}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(""); setSearchResults([]); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {isSearching ? (
          /* ── Search results ── */
          <>
            <Text style={{
              color: Colors.textMuted, fontSize: 11, fontWeight: "700",
              letterSpacing: 0.8, textTransform: "uppercase",
            }}>
              {searchLoading
                ? "Buscando..."
                : `${searchResults.length} resultado${searchResults.length !== 1 ? "s" : ""} para "${search.trim()}"`
              }
            </Text>

            {!searchLoading && searchResults.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
                <Ionicons name="search-outline" size={36} color={Colors.textMuted} />
                <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "700" }}>
                  Nenhum resultado encontrado
                </Text>
                <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center" }}>
                  Tente outras palavras ou explore as categorias abaixo.
                </Text>
              </View>
            )}

            {searchResults.map((r) => (
              <SearchResultCard
                key={`${r.matchIn}-${r.topic.id}`}
                result={r}
                onPress={() => {
                  const cat = FORUM_CATEGORIES.find((c) => c.id === r.topic.categoryId);
                  if (cat) setSearchTopic({ topic: r.topic, category: cat });
                }}
              />
            ))}
          </>
        ) : (
          /* ── Category list ── */
          <>
            {/* Stats */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[
                { icon: "chatbubbles-outline" as const,      label: "Tópicos",    value: totalTopics,  color: "#22d3ee" },
                { icon: "chatbubble-outline" as const,       label: "Respostas",  value: totalReplies, color: "#a78bfa" },
                { icon: "checkmark-circle-outline" as const, label: "Resolvidos", value: totalSolved,  color: "#22c55e" },
              ].map(({ icon, label, value, color }) => (
                <View key={label} style={{
                  flex: 1, backgroundColor: Colors.bgCard,
                  borderRadius: 12, borderWidth: 1, borderColor: Colors.bgBorder,
                  padding: 12, alignItems: "center", gap: 4,
                }}>
                  <Ionicons name={icon} size={18} color={color} />
                  <Text style={{ color: Colors.white, fontSize: 18, fontWeight: "900" }}>{value}</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 10, fontWeight: "600" }}>{label}</Text>
                </View>
              ))}
            </View>

            {!session && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  backgroundColor: Colors.cyan + "12",
                  borderRadius: 14, borderWidth: 1, borderColor: Colors.cyan + "33",
                  padding: 14, flexDirection: "row", alignItems: "center", gap: 12,
                }}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: Colors.cyan + "22",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name="person-circle-outline" size={22} color={Colors.cyan} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.cyan, fontSize: 13, fontWeight: "800" }}>
                    Entre para participar
                  </Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    Crie tópicos e responda discussões da comunidade.
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <Text style={{
              color: Colors.textMuted, fontSize: 11, fontWeight: "700",
              letterSpacing: 0.8, textTransform: "uppercase", marginTop: 4,
            }}>
              Categorias
            </Text>

            {FORUM_CATEGORIES.map((cat) => {
              const catTopics  = topicsByCategory[cat.id] ?? [];
              const catReplies = catTopics.reduce((s, t) => s + t.replyCount, 0);
              return (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  topicCount={catTopics.length}
                  replyCount={catReplies}
                  onPress={() => setSelectedCategory(cat)}
                />
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Open topic found via search */}
      {searchTopic && (
        <TopicDetailScreen
          topic={searchTopic.topic}
          category={searchTopic.category}
          onClose={() => setSearchTopic(null)}
        />
      )}
    </SafeAreaView>
  );
}
