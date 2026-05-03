import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { useFavorites, FavoriteItem } from "../contexts/FavoritesContext";
import { supabase } from "../lib/supabase";
import { ProductDetailScreen, ProductDetailItem } from "./ProductDetailScreen";
import { useAuth } from "../contexts/AuthContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function fetchProductById(
  productId: string,
  productType: "physical" | "digital"
): Promise<ProductDetailItem | null> {
  try {
    if (productType === "digital") {
      const { data } = await supabase
        .from("digital_products")
        .select("*, profiles(id, name, avatar_url, verified)")
        .eq("id", productId)
        .single();
      if (!data) return null;
      return {
        id: data.id,
        title: data.title,
        description: data.description ?? "",
        price: data.price,
        originalPrice: data.original_price ?? undefined,
        thumbnail: data.thumbnail_url ?? "",
        fileFormat: data.file_format ?? "STL",
        fileSize: data.file_size ?? "",
        difficulty: data.difficulty ?? "easy",
        printTime: data.print_time ?? "",
        downloadCount: data.download_count ?? 0,
        rating: data.rating ?? 0,
        reviewCount: data.review_count ?? 0,
        tags: data.tags ?? [],
        previewImages: data.preview_images ?? [],
        seller: {
          id: data.profiles?.id ?? "",
          name: data.profiles?.name ?? "Vendedor",
          avatar: data.profiles?.avatar_url ?? undefined,
          rating: 0,
          totalSales: 0,
          verified: data.profiles?.verified ?? false,
        },
        createdAt: data.created_at ?? "",
      } as ProductDetailItem;
    } else {
      const { data } = await supabase
        .from("products")
        .select("*, profiles(id, name, avatar_url, verified)")
        .eq("id", productId)
        .single();
      if (!data) return null;
      return {
        id: data.id,
        title: data.title,
        description: data.description ?? "",
        price: data.price,
        originalPrice: data.original_price ?? undefined,
        images: data.images ?? [],
        category: data.category ?? "acessorios",
        rating: data.rating ?? 0,
        reviewCount: data.review_count ?? 0,
        inStock: data.in_stock ?? true,
        freeShipping: data.free_shipping ?? false,
        condition: data.condition ?? "new",
        seller: {
          id: data.profiles?.id ?? "",
          name: data.profiles?.name ?? "Vendedor",
          avatar: data.profiles?.avatar_url ?? undefined,
          rating: 0,
          totalSales: 0,
          verified: data.profiles?.verified ?? false,
          postalCode: data.seller_postal_code ?? undefined,
        },
        createdAt: data.created_at ?? "",
      } as ProductDetailItem;
    }
  } catch {
    return null;
  }
}

// ─── FavoriteCard ─────────────────────────────────────────────────────────────

function FavoriteCard({
  item,
  onPress,
  onRemove,
}: {
  item: FavoriteItem;
  onPress: () => void;
  onRemove: () => void;
}) {
  const Colors = useColors();

  return (
    <TouchableOpacity
      onPress={item.deleted ? undefined : onPress}
      activeOpacity={item.deleted ? 1 : 0.8}
      style={{
        flexDirection: "row",
        backgroundColor: Colors.bgCard,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: item.deleted ? Colors.bgBorder : Colors.bgBorder,
        padding: 12,
        gap: 12,
        alignItems: "center",
        opacity: item.deleted ? 0.55 : 1,
      }}
    >
      {/* Thumbnail */}
      {item.imageUrl && !item.deleted ? (
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
            name={item.deleted ? "trash-outline" : item.productType === "digital" ? "document-outline" : "cube-outline"}
            size={26}
            color={item.deleted ? Colors.error : Colors.textMuted}
          />
        </View>
      )}

      {/* Info */}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "600" }} numberOfLines={2}>
          {item.title}
        </Text>
        {item.deleted ? (
          <Text style={{ color: Colors.error, fontSize: 11, fontWeight: "600" }}>
            Produto removido pelo vendedor
          </Text>
        ) : (
          <>
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
          </>
        )}
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
    </TouchableOpacity>
  );
}

// ─── FavoritesScreen ──────────────────────────────────────────────────────────

interface FavoritesScreenProps {
  visible?: boolean;
  onClose?: () => void;
}

export function FavoritesScreen({ visible, onClose }: FavoritesScreenProps = {}) {
  const Colors = useColors();
  const { session } = useAuth();
  const { favorites, loading, toggleFavorite, fetchFavorites } = useFavorites();
  const [openProduct, setOpenProduct] = useState<ProductDetailItem | null>(null);
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null);

  const handlePress = async (item: FavoriteItem) => {
    setLoadingProduct(item.id);
    const product = await fetchProductById(item.productId, item.productType);
    setLoadingProduct(null);
    if (product) setOpenProduct(product);
  };

  const isModal = visible !== undefined;

  const content = (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top"]}>
      {isModal && <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />}

      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 12, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: Colors.bgBorder,
        backgroundColor: Colors.bgCard,
      }}>
        {isModal && onClose && (
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ padding: 6 }}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.white, fontSize: 18, fontWeight: "800" }}>Favoritos</Text>
          {favorites.length > 0 && (
            <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 1 }}>
              {favorites.length} {favorites.length === 1 ? "item salvo" : "itens salvos"}
            </Text>
          )}
        </View>
      </View>

      {!session ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 16 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.bgBorder,
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="heart-outline" size={36} color={Colors.textMuted} />
          </View>
          <Text style={{ color: Colors.white, fontSize: 17, fontWeight: "800", textAlign: "center" }}>
            Faça login para ver favoritos
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
            Entre na sua conta para salvar e visualizar seus produtos favoritos.
          </Text>
        </View>
      ) : loading && favorites.length === 0 ? (
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
          {loadingProduct && (
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <ActivityIndicator size="small" color={Colors.cyan} />
            </View>
          )}

          {favorites.map((item) => (
            <FavoriteCard
              key={item.id}
              item={item}
              onPress={() => handlePress(item)}
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

      <ProductDetailScreen
        visible={openProduct !== null}
        product={openProduct}
        onClose={() => setOpenProduct(null)}
        onLoginRequired={() => setOpenProduct(null)}
      />
    </SafeAreaView>
  );

  if (isModal) {
    return (
      <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
        {content}
      </Modal>
    );
  }

  return content;
}
