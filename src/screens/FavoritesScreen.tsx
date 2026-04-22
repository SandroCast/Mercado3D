import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { useFavorites, FavoriteItem } from "../contexts/FavoritesContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── FavoriteCard ─────────────────────────────────────────────────────────────

function FavoriteCard({ item, onRemove }: { item: FavoriteItem; onRemove: () => void }) {
  const Colors = useColors();

  return (
    <View style={{
      flexDirection: "row",
      backgroundColor: Colors.bgCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.bgBorder,
      padding: 12,
      gap: 12,
      alignItems: "center",
    }}>
      {/* Thumbnail */}
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={{ width: 64, height: 64, borderRadius: 10 }}
          resizeMode="cover"
        />
      ) : (
        <View style={{
          width: 64, height: 64, borderRadius: 10,
          backgroundColor: Colors.bgCardAlt,
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons
            name={item.productType === "digital" ? "document-outline" : "cube-outline"}
            size={26}
            color={Colors.textMuted}
          />
        </View>
      )}

      {/* Info */}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "600" }} numberOfLines={2}>
          {item.title}
        </Text>
        {item.sellerName && (
          <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{item.sellerName}</Text>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
          <View style={{
            backgroundColor: item.productType === "digital" ? "#7c3aed22" : "#f9731622",
            borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
          }}>
            <Text style={{
              color: item.productType === "digital" ? "#a78bfa" : "#fb923c",
              fontSize: 10, fontWeight: "700",
            }}>
              {item.productType === "digital" ? "Digital" : "Físico"}
            </Text>
          </View>
          <Text style={{ color: Colors.cyan, fontSize: 14, fontWeight: "900" }}>
            {formatPrice(item.price)}
          </Text>
        </View>
      </View>

      {/* Remove */}
      <TouchableOpacity
        onPress={onRemove}
        activeOpacity={0.7}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        style={{
          width: 34, height: 34, borderRadius: 17,
          backgroundColor: "#ef444415",
          borderWidth: 1, borderColor: "#ef444433",
          alignItems: "center", justifyContent: "center",
        }}
      >
        <Ionicons name="heart" size={16} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
}

// ─── FavoritesScreen ──────────────────────────────────────────────────────────

export function FavoritesScreen() {
  const Colors = useColors();
  const { favorites, loading, toggleFavorite, fetchFavorites } = useFavorites();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top"]}>

      {/* Header */}
      <View style={{
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: Colors.bgBorder,
      }}>
        <Text style={{ color: Colors.white, fontSize: 18, fontWeight: "800" }}>Favoritos</Text>
        {favorites.length > 0 && (
          <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 1 }}>
            {favorites.length} {favorites.length === 1 ? "item salvo" : "itens salvos"}
          </Text>
        )}
      </View>

        {/* Body */}
        {loading && favorites.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
            <ActivityIndicator size="large" color={Colors.cyan} />
            <Text style={{ color: Colors.textMuted, fontSize: 14 }}>Carregando favoritos...</Text>
          </View>
        ) : favorites.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 16 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.bgBorder,
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="heart-outline" size={36} color={Colors.textMuted} />
            </View>
            <Text style={{ color: Colors.white, fontSize: 17, fontWeight: "800", textAlign: "center" }}>
              Nenhum favorito ainda
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              Toque no coração em qualquer produto para salvá-lo aqui.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={fetchFavorites} tintColor={Colors.cyan} />
            }
          >
            {favorites.map((item) => (
              <FavoriteCard
                key={item.id}
                item={item}
                onRemove={() => toggleFavorite({
                  productId:   item.productId,
                  productType: item.productType,
                  title:       item.title,
                  price:       item.price,
                  imageUrl:    item.imageUrl,
                  sellerName:  item.sellerName,
                })}
              />
            ))}

            {/* Tip */}
            <View style={{
              flexDirection: "row", alignItems: "flex-start", gap: 8,
              backgroundColor: Colors.bgCard, borderRadius: 10, padding: 12,
              borderWidth: 1, borderColor: Colors.bgBorder, marginTop: 4,
            }}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} style={{ marginTop: 1 }} />
              <Text style={{ color: Colors.textMuted, fontSize: 12, flex: 1, lineHeight: 18 }}>
                Toque no coração vermelho para remover um item dos favoritos.
              </Text>
            </View>
          </ScrollView>
        )}
    </SafeAreaView>
  );
}
