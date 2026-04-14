import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Product } from "../types";
import { Colors } from "../constants/colors";

interface ProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
  onFavorite?: (product: Product) => void;
  isFavorited?: boolean;
  width: number;
}

export function ProductCard({ product, onPress, onFavorite, isFavorited = false, width }: ProductCardProps) {
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  const price = product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const originalPrice = product.originalPrice?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const badge = product.freeShipping
    ? { label: "FRETE GRÁTIS", color: Colors.blue }
    : discount && discount >= 20
    ? { label: "MUITO BARATO", color: Colors.success }
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress?.(product)}
      style={{ width, backgroundColor: Colors.bgCard, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: Colors.bgBorder }}
    >
      {/* Image */}
      <View style={{ position: "relative" }}>
        <Image
          source={{ uri: product.images[0] }}
          style={{ width, height: width * 0.8 }}
          resizeMode="cover"
        />
        {/* Badge */}
        {badge && (
          <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: badge.color, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
            <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.3 }}>{badge.label}</Text>
          </View>
        )}
        {/* Discount */}
        {discount && (
          <View style={{ position: "absolute", top: badge ? 30 : 8, left: 8, backgroundColor: Colors.orange, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
            <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>-{discount}%</Text>
          </View>
        )}
        {/* Favorite */}
        <TouchableOpacity
          onPress={() => onFavorite?.(product)}
          activeOpacity={0.7}
          style={{ position: "absolute", top: 8, right: 8, backgroundColor: Colors.bgCard + "cc", borderRadius: 20, padding: 6 }}
        >
          <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={16} color={isFavorited ? Colors.error : Colors.textGray} />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={{ padding: 10 }}>
        <Text style={{ color: Colors.white, fontSize: 12, fontWeight: "600", lineHeight: 17 }} numberOfLines={2}>
          {product.title}
        </Text>

        {/* Rating */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 6 }}>
          <Ionicons name="star" size={11} color={Colors.warning} />
          <Text style={{ color: Colors.white, fontSize: 11, fontWeight: "700" }}>{product.rating.toFixed(1)}</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 11 }}>({product.reviewCount})</Text>
        </View>

        {/* Price */}
        <View style={{ marginTop: 6 }}>
          {originalPrice && (
            <Text style={{ color: Colors.textMuted, fontSize: 11, textDecorationLine: "line-through" }}>{originalPrice}</Text>
          )}
          <Text style={{ color: Colors.cyan, fontSize: 15, fontWeight: "800" }}>{price}</Text>
        </View>

        {/* Seller */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.bgBorder }}>
          {product.seller.verified && (
            <Ionicons name="checkmark-circle" size={12} color={Colors.cyan} />
          )}
          <Text style={{ color: Colors.textMuted, fontSize: 10, flex: 1 }} numberOfLines={1}>
            {product.seller.name}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
