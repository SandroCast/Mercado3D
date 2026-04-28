import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { ProductCard } from "../components/ProductCard";
import { mockProducts, mockDigitalProducts } from "../constants/mockData";
import { Seller, Product, DigitalProduct } from "../types";
import { useFavorites } from "../contexts/FavoritesContext";
import { useFollows } from "../contexts/FollowsContext";
import { useAuth } from "../contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = "all" | "physical" | "digital";

type ProductDetailItem = Product | DigitalProduct;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const { width: SW } = Dimensions.get("window");
const CARD_W = (SW - 16 * 2 - 12) / 2;

// ─── SellerProfileScreen ──────────────────────────────────────────────────────

interface SellerProfileScreenProps {
  visible: boolean;
  seller: Seller | null;
  onClose: () => void;
  onLoginRequired?: () => void;
  onProductPress?: (product: ProductDetailItem) => void;
}

export function SellerProfileScreen({
  visible,
  seller,
  onClose,
  onLoginRequired,
  onProductPress,
}: SellerProfileScreenProps) {
  const Colors = useColors();
  const { session } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isFollowing, toggleFollow, loading: followLoading } = useFollows();

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  if (!seller) return null;

  const initial = seller.name.charAt(0).toUpperCase();

  const physicalProducts = mockProducts.filter((p) => p.seller.id === seller.id);
  const digitalProducts  = mockDigitalProducts.filter((p) => p.seller.id === seller.id);
  const allProducts: ProductDetailItem[] =
    activeFilter === "physical" ? physicalProducts :
    activeFilter === "digital"  ? digitalProducts  :
    [...physicalProducts, ...digitalProducts];

  const totalProducts = physicalProducts.length + digitalProducts.length;

  const FILTERS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",      label: "Todos",    count: totalProducts },
    { key: "physical", label: "Físicos",  count: physicalProducts.length },
    { key: "digital",  label: "Digitais", count: digitalProducts.length },
  ];

  const handleFavorite = (product: ProductDetailItem) => {
    if (!session) return;
    const isDigitalProduct = "downloadCount" in product;
    toggleFavorite({
      productId:   product.id,
      productType: isDigitalProduct ? "digital" : "physical",
      title:       product.title,
      price:       product.price,
      imageUrl:    isDigitalProduct
        ? (product as DigitalProduct).thumbnail
        : (product as Product).images?.[0],
      sellerName:  product.seller.name,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top", "bottom"]}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: Colors.bgBorder,
          gap: 12,
        }}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={{ flex: 1, color: Colors.white, fontSize: 16, fontWeight: "700" }} numberOfLines={1}>
            Perfil do Vendedor
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

          {/* ── Hero ─────────────────────────────────────────────────────────── */}
          <View style={{
            alignItems: "center",
            paddingTop: 32,
            paddingBottom: 24,
            paddingHorizontal: 24,
            gap: 12,
          }}>
            {/* Avatar */}
            <View style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: Colors.purple + "33",
              borderWidth: 3,
              borderColor: Colors.purple,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}>
              {seller.avatar ? (
                <Image
                  source={{ uri: seller.avatar }}
                  style={{ width: 88, height: 88 }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ color: Colors.purple, fontSize: 36, fontWeight: "900" }}>
                  {initial}
                </Text>
              )}
            </View>

            {/* Nome + verificado */}
            <View style={{ alignItems: "center", gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ color: Colors.white, fontSize: 22, fontWeight: "800" }}>
                  {seller.name}
                </Text>
                {seller.verified && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.cyan} />
                )}
              </View>
              {seller.verified && (
                <View style={{
                  backgroundColor: Colors.cyan + "22",
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderWidth: 1,
                  borderColor: Colors.cyan + "44",
                }}>
                  <Text style={{ color: Colors.cyan, fontSize: 11, fontWeight: "700" }}>
                    Vendedor Verificado
                  </Text>
                </View>
              )}
            </View>

            {/* Stats */}
            <View style={{
              flexDirection: "row",
              gap: 1,
              backgroundColor: Colors.bgCard,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: Colors.bgBorder,
              overflow: "hidden",
              marginTop: 4,
              alignSelf: "stretch",
            }}>
              {[
                { icon: "star" as const,         value: seller.rating.toFixed(1), label: "Avaliação",  color: Colors.warning },
                { icon: "bag-check-outline" as const, value: seller.totalSales.toLocaleString("pt-BR"), label: "Vendas", color: Colors.cyan },
                { icon: "cube-outline" as const,  value: String(totalProducts),   label: "Produtos",   color: Colors.purple },
              ].map((stat, i) => (
                <View key={stat.label} style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 14,
                  borderLeftWidth: i > 0 ? 1 : 0,
                  borderLeftColor: Colors.bgBorder,
                  gap: 4,
                }}>
                  <Ionicons name={stat.icon} size={18} color={stat.color} />
                  <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "800" }}>
                    {stat.value}
                  </Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 10, fontWeight: "600" }}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Action buttons — only when logged in */}
            {session && <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch", marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => toggleFollow(seller.id)}
                activeOpacity={0.8}
                disabled={followLoading}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: isFollowing(seller.id) ? Colors.cyan : Colors.bgBorder,
                  backgroundColor: isFollowing(seller.id) ? Colors.cyan + "22" : "transparent",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Ionicons
                  name={isFollowing(seller.id) ? "person-remove-outline" : "person-add-outline"}
                  size={16}
                  color={isFollowing(seller.id) ? Colors.cyan : Colors.textGray}
                />
                <Text style={{
                  color: isFollowing(seller.id) ? Colors.cyan : Colors.textGray,
                  fontSize: 14,
                  fontWeight: "700",
                }}>
                  {isFollowing(seller.id) ? "Seguindo" : "Seguir"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: Colors.bgBorder,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Ionicons name="chatbubble-outline" size={16} color={Colors.textGray} />
                <Text style={{ color: Colors.textGray, fontSize: 14, fontWeight: "700" }}>
                  Mensagem
                </Text>
              </TouchableOpacity>
            </View>}
          </View>

          {/* ── Divider ──────────────────────────────────────────────────────── */}
          <View style={{ height: 1, backgroundColor: Colors.bgBorder, marginHorizontal: 16, marginBottom: 16 }} />

          {/* ── Filter chips ─────────────────────────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 16 }}
          >
            {FILTERS.map((f) => {
              const active = activeFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setActiveFilter(f.key)}
                  activeOpacity={0.75}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: active ? Colors.cyan : Colors.bgBorder,
                    backgroundColor: active ? Colors.cyan + "22" : Colors.bgCard,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Text style={{
                    color: active ? Colors.cyan : Colors.textMuted,
                    fontSize: 13,
                    fontWeight: active ? "700" : "500",
                  }}>
                    {f.label}
                  </Text>
                  <View style={{
                    backgroundColor: active ? Colors.cyan : Colors.bgBorder,
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{
                      color: active ? Colors.bg : Colors.textMuted,
                      fontSize: 10,
                      fontWeight: "800",
                    }}>
                      {f.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Product grid ─────────────────────────────────────────────────── */}
          {allProducts.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
              <View style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: Colors.bgCard,
                borderWidth: 1,
                borderColor: Colors.bgBorder,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Ionicons name="cube-outline" size={28} color={Colors.textMuted} />
              </View>
              <Text style={{ color: Colors.textMuted, fontSize: 14 }}>
                Nenhum produto nesta categoria
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {/* Grid manual em pares para evitar FlatList aninhada */}
              {chunk(allProducts, 2).map((pair, rowIdx) => (
                <View key={rowIdx} style={{ flexDirection: "row", gap: 12 }}>
                  {pair.map((item) => {
                    const isDigitalItem = "downloadCount" in item;
                    const cardProduct: Product = isDigitalItem
                      ? {
                          ...(item as DigitalProduct),
                          images:       [(item as DigitalProduct).thumbnail ?? ""],
                          freeShipping: false,
                          inStock:      true,
                          condition:    "new" as const,
                          category:     "acessorios" as const,
                        }
                      : (item as Product);
                    return (
                      <ProductCard
                        key={item.id}
                        product={cardProduct}
                        width={CARD_W}
                        onPress={() => onProductPress?.(item)}
                        onFavorite={() => handleFavorite(item)}
                        isFavorited={isFavorite(item.id)}
                      />
                    );
                  })}
                  {/* Preenche espaço se par incompleto */}
                  {pair.length === 1 && <View style={{ width: CARD_W }} />}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

      </SafeAreaView>
    </Modal>
  );
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}
