import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { SectionHeader } from "../components/SectionHeader";
import { mockDigitalProducts } from "../constants/mockData";
import { useColors } from "../contexts/ThemeContext";
import { DigitalProduct } from "../types";

const { width } = Dimensions.get("window");
const CARD_W = (width - 16 * 2 - 12) / 2;

const digitalCategories = [
  { id: "all", label: "Todos" },
  { id: "miniaturas", label: "Miniaturas" },
  { id: "decoracao", label: "Decoração" },
  { id: "engenharia", label: "Engenharia" },
  { id: "cosplay", label: "Cosplay" },
  { id: "funcional", label: "Funcional" },
];

function DigitalCard({ product, cardWidth }: { product: DigitalProduct; cardWidth: number }) {
  const Colors = useColors();
  const price = product.price === 0
    ? "FREE"
    : product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const isFree = product.price === 0;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={{ width: cardWidth, backgroundColor: Colors.bgCard, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: Colors.bgBorder }}
    >
      <View style={{ position: "relative" }}>
        <Image
          source={{ uri: product.thumbnail }}
          style={{ width: cardWidth, height: cardWidth * 0.8 }}
          resizeMode="cover"
        />
        {/* Price badge */}
        <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: isFree ? Colors.success : Colors.blue, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{price}</Text>
        </View>
        {/* Format */}
        <View style={{ position: "absolute", bottom: 8, left: 8, flexDirection: "row", gap: 4 }}>
          {product.formats.slice(0, 2).map((fmt) => (
            <View key={fmt} style={{ backgroundColor: "#000000aa", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
              <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{fmt}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ padding: 10 }}>
        <Text style={{ color: Colors.white, fontSize: 12, fontWeight: "600" }} numberOfLines={2}>
          {product.title}
        </Text>

        {/* Seller + rating */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.purple, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontSize: 8, fontWeight: "700" }}>{product.seller.name[0]}</Text>
            </View>
            <Text style={{ color: Colors.textMuted, fontSize: 10 }} numberOfLines={1}>
              {product.seller.name}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <Ionicons name="star" size={10} color={Colors.warning} />
            <Text style={{ color: Colors.white, fontSize: 10, fontWeight: "700" }}>{product.rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Downloads */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
          <Ionicons name="download-outline" size={11} color={Colors.textMuted} />
          <Text style={{ color: Colors.textMuted, fontSize: 10 }}>{product.downloadCount.toLocaleString("pt-BR")} downloads</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface DigitalScreenProps {
  onBack?: () => void;
}

export function DigitalScreen({ onBack }: DigitalScreenProps) {
  const Colors = useColors();
  const [selectedCat, setSelectedCat] = useState("all");

  const filtered = selectedCat === "all"
    ? mockDigitalProducts
    : mockDigitalProducts.filter((p) => p.category === selectedCat);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top"]}>
      {/* Header hero */}
      <LinearGradient
        colors={["#1e1b4b", "#312e81", "#1e1b4b"]}
        style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.white, fontSize: 22, fontWeight: "900" }}>
              STL{" "}
              <Text style={{ color: Colors.cyan }}>UNIVERSE</Text>
            </Text>
            <Text style={{ color: "#a5b4fc", fontSize: 12, marginTop: 2 }}>
              O maior hub de arquivos digitais para sua impressora 3D.
            </Text>
          </View>
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {digitalCategories.map((cat) => {
            const active = selectedCat === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCat(cat.id)}
                activeOpacity={0.8}
                style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: active ? Colors.cyan : "#ffffff15", borderWidth: 1, borderColor: active ? Colors.cyan : "#ffffff20" }}
              >
                <Text style={{ color: active ? Colors.bg : "#fff", fontWeight: "700", fontSize: 13 }}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* Products grid */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <SectionHeader title="Arquivos Populares" subtitle="Os modelos mais baixados pela comunidade" onSeeAll={() => {}} />
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <Ionicons name="cube-outline" size={52} color={Colors.textMuted} />
            <Text style={{ color: Colors.textMuted, fontSize: 16, fontWeight: "700", marginTop: 12 }}>Nenhum arquivo encontrado</Text>
          </View>
        }
        renderItem={({ item }) => <DigitalCard product={item} cardWidth={CARD_W} />}
      />
    </SafeAreaView>
  );
}
