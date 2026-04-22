import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  Dimensions,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { ProductDetailScreen, ProductDetailItem } from "./ProductDetailScreen";
import { useProducts, dbToProduct } from "../contexts/ProductsContext";
import { useDigitalProducts, dbToDigitalProduct } from "../contexts/DigitalProductsContext";
import { Product, DigitalProduct } from "../types";

const { width } = Dimensions.get("window");
const CARD_W = (width - 16 * 2 - 12) / 2;

// ─── Categorias ───────────────────────────────────────────────────────────────

const PHYSICAL_CATS = [
  { id: "impressoras", label: "Impressoras" },
  { id: "filamentos",  label: "Filamentos"  },
  { id: "pecas",       label: "Peças"       },
  { id: "hardware",    label: "Hardware"    },
  { id: "acessorios",  label: "Acessórios"  },
  { id: "resinas",     label: "Resinas"     },
];

const DIGITAL_CATS = [
  { id: "stl",    label: "STL"    },
  { id: "obj",    label: "OBJ"    },
  { id: "step",   label: "STEP"   },
  { id: "gcode",  label: "GCode"  },
  { id: "bundle", label: "Bundle" },
];

const SORT_OPTIONS = [
  { id: "relevance", label: "Relevância"     },
  { id: "price_asc", label: "Menor preço"    },
  { id: "price_dsc", label: "Maior preço"    },
  { id: "rating",    label: "Mais avaliados" },
];

type TypeFilter = "all" | "physical" | "digital";
type SortOption = "relevance" | "price_asc" | "price_dsc" | "rating";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isDigitalProduct(p: ProductDetailItem): p is DigitalProduct {
  return "downloadCount" in p;
}

function getThumb(p: ProductDetailItem): string | null {
  if (isDigitalProduct(p)) return p.thumbnail ?? null;
  return (p as Product).images?.[0] ?? null;
}

function formatPrice(price: number): string {
  if (price === 0) return "GRÁTIS";
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function matchesQuery(p: ProductDetailItem, q: string): boolean {
  const s = q.toLowerCase();
  return (
    p.title.toLowerCase().includes(s) ||
    p.description.toLowerCase().includes(s) ||
    p.seller.name.toLowerCase().includes(s)
  );
}

// ─── ResultCard ───────────────────────────────────────────────────────────────

function ResultCard({ item, cardWidth, onPress }: {
  item: ProductDetailItem;
  cardWidth: number;
  onPress: (p: ProductDetailItem) => void;
}) {
  const Colors = useColors();
  const digital = isDigitalProduct(item);
  const thumb   = getThumb(item);
  const price   = item.price;
  const originalPrice = (item as Product).originalPrice;
  const discount = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress(item)}
      style={{
        width: cardWidth,
        backgroundColor: Colors.bgCard,
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: Colors.bgBorder,
      }}
    >
      <View style={{ position: "relative" }}>
        {thumb ? (
          <Image
            source={{ uri: thumb }}
            style={{ width: cardWidth, height: cardWidth * 0.8 }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: cardWidth, height: cardWidth * 0.8, backgroundColor: Colors.bgCardAlt, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="cube-outline" size={36} color={Colors.textMuted} />
          </View>
        )}
        {discount && (
          <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: Colors.error, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>-{discount}%</Text>
          </View>
        )}
        <View style={{
          position: "absolute", top: 8, right: 8,
          backgroundColor: digital ? "#7c3aed99" : "#f9731699",
          borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2,
        }}>
          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>
            {digital ? "Digital" : "Físico"}
          </Text>
        </View>
      </View>

      <View style={{ padding: 10, gap: 4 }}>
        <Text style={{ color: Colors.white, fontSize: 12, fontWeight: "600" }} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={{ color: price === 0 ? Colors.success : Colors.cyan, fontSize: 14, fontWeight: "800" }}>
          {formatPrice(price)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 10 }} numberOfLines={1}>
            {item.seller.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <Ionicons name="star" size={10} color={Colors.warning} />
            <Text style={{ color: Colors.white, fontSize: 10, fontWeight: "700" }}>
              {item.rating.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── SearchScreen ─────────────────────────────────────────────────────────────

interface SearchScreenProps {
  isActive?: boolean;
  onLoginRequired?: () => void;
}

export function SearchScreen({ isActive, onLoginRequired }: SearchScreenProps) {
  const Colors = useColors();
  const inputRef = useRef<TextInput>(null);

  const { products }        = useProducts();
  const { digitalProducts } = useDigitalProducts();

  const [query,           setQuery]           = useState("");
  const [typeFilter,      setTypeFilter]      = useState<TypeFilter>("all");
  const [selectedCat,     setSelectedCat]     = useState<string | null>(null);
  const [sort,            setSort]            = useState<SortOption>("relevance");
  const [sortOpen,        setSortOpen]        = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetailItem | null>(null);

  useEffect(() => {
    if (isActive) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isActive]);

  useEffect(() => { setSelectedCat(null); }, [typeFilter]);

  const categories = typeFilter === "digital" ? DIGITAL_CATS
    : typeFilter === "physical" ? PHYSICAL_CATS
    : [];

  const pool: ProductDetailItem[] = useMemo(() => {
    const physical = products.map(dbToProduct);
    const digital  = digitalProducts.map(dbToDigitalProduct);
    if (typeFilter === "physical") return physical;
    if (typeFilter === "digital")  return digital;
    return [...physical, ...digital];
  }, [products, digitalProducts, typeFilter]);

  const results: ProductDetailItem[] = useMemo(() => {
    if (!query.trim()) return [];
    let filtered = pool.filter((p) => matchesQuery(p, query.trim()));
    if (selectedCat) filtered = filtered.filter((p) => p.category === selectedCat);
    switch (sort) {
      case "price_asc": return [...filtered].sort((a, b) => a.price - b.price);
      case "price_dsc": return [...filtered].sort((a, b) => b.price - a.price);
      case "rating":    return [...filtered].sort((a, b) => b.rating - a.rating);
      default:          return filtered;
    }
  }, [pool, query, selectedCat, sort]);

  const hasQuery = query.trim().length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top"]}>

      {/* Barra de busca */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
        gap: 10, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder,
      }}>
        <View style={{
          flex: 1, flexDirection: "row", alignItems: "center",
          backgroundColor: Colors.bgCard, borderRadius: 12,
          borderWidth: 1, borderColor: Colors.bgBorder,
          paddingHorizontal: 12, gap: 8, height: 44,
        }}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={{ flex: 1, color: Colors.white, fontSize: 15 }}
            placeholder="Impressoras, filamentos, STL..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            autoCorrect={false}
          />
          {hasQuery && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => setSortOpen((v) => !v)}
          style={{
            width: 44, height: 44,
            backgroundColor: sortOpen ? Colors.cyan : Colors.bgCard,
            borderRadius: 12, borderWidth: 1,
            borderColor: sortOpen ? Colors.cyan : Colors.bgBorder,
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons name="options-outline" size={20} color={sortOpen ? Colors.bg : Colors.textGray} />
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: Colors.bgBorder }}>
        <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 8 }}>
          {(["all", "physical", "digital"] as TypeFilter[]).map((t) => {
            const labels: Record<TypeFilter, string> = { all: "Todos", physical: "Físico", digital: "Digital" };
            const active = typeFilter === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTypeFilter(t)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                  backgroundColor: active ? Colors.cyan : Colors.bgCard,
                  borderWidth: 1, borderColor: active ? Colors.cyan : Colors.bgBorder,
                }}
              >
                <Text style={{ color: active ? Colors.bg : Colors.textGray, fontSize: 13, fontWeight: "700" }}>
                  {labels[t]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {categories.length > 0 && (
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}
          >
            {categories.map((cat) => {
              const active = selectedCat === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCat(active ? null : cat.id)}
                  activeOpacity={0.8}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16,
                    backgroundColor: active ? Colors.purple : Colors.bgCardAlt,
                    borderWidth: 1, borderColor: active ? Colors.purple : Colors.bgBorder,
                  }}
                >
                  <Text style={{ color: active ? "#fff" : Colors.textGray, fontSize: 12, fontWeight: "600" }}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {sortOpen && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Ordenar por
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SORT_OPTIONS.map((opt) => {
                const active = sort === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => { setSort(opt.id as SortOption); setSortOpen(false); }}
                    activeOpacity={0.8}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
                      backgroundColor: active ? Colors.blue : Colors.bgCardAlt,
                      borderWidth: 1, borderColor: active ? Colors.blue : Colors.bgBorder,
                    }}
                  >
                    <Text style={{ color: active ? "#fff" : Colors.textGray, fontSize: 12, fontWeight: "600" }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* Resultados */}
      {!hasQuery ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <Ionicons name="search-outline" size={52} color={Colors.bgBorder} />
          <Text style={{ color: Colors.textMuted, fontSize: 15, fontWeight: "600", marginTop: 16, textAlign: "center" }}>
            Busque por impressoras, filamentos, arquivos STL e muito mais
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <Ionicons name="cube-outline" size={52} color={Colors.bgBorder} />
          <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "700", marginTop: 16 }}>Nenhum resultado</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: "center", marginTop: 8 }}>
            Tente outros termos ou remova os filtros
          </Text>
          <TouchableOpacity
            onPress={() => { setQuery(""); setTypeFilter("all"); setSelectedCat(null); }}
            style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.bgBorder }}
          >
            <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600" }}>Limpar filtros</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
                <Text style={{ color: Colors.white, fontWeight: "700" }}>{results.length}</Text>
                {" "}resultado{results.length !== 1 ? "s" : ""} para{" "}
                <Text style={{ color: Colors.cyan, fontWeight: "700" }}>"{query.trim()}"</Text>
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ResultCard item={item} cardWidth={CARD_W} onPress={setSelectedProduct} />
          )}
        />
      )}

      <ProductDetailScreen
        visible={selectedProduct !== null}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onLoginRequired={onLoginRequired}
      />
    </SafeAreaView>
  );
}
