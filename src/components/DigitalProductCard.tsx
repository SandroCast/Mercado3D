import React from "react";
import { View, Text, Image, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DigitalProduct } from "../types";
import { Colors } from "../constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const difficultyLabel: Record<DigitalProduct["printDifficulty"], string> = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
  expert: "Expert",
};

const difficultyColor: Record<DigitalProduct["printDifficulty"], string> = {
  easy: "text-green-600",
  medium: "text-yellow-600",
  hard: "text-orange-600",
  expert: "text-red-600",
};

interface DigitalProductCardProps {
  product: DigitalProduct;
  onPress?: (product: DigitalProduct) => void;
}

export function DigitalProductCard({ product, onPress }: DigitalProductCardProps) {
  const formattedPrice =
    product.price === 0
      ? "Grátis"
      : product.price.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });

  const formattedOriginal = product.originalPrice?.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress?.(product)}
      style={{ width: CARD_WIDTH }}
      className="bg-dark-900 rounded-2xl overflow-hidden border border-dark-700 mb-4"
    >
      {/* Thumbnail */}
      <View className="relative">
        <Image
          source={{ uri: product.thumbnail }}
          style={{ width: CARD_WIDTH, height: CARD_WIDTH * 0.85 }}
          resizeMode="cover"
        />
        {/* Format badges */}
        <View className="absolute bottom-2 left-2 flex-row gap-1">
          {product.formats.slice(0, 2).map((fmt) => (
            <View key={fmt} className="bg-primary-500/90 px-1.5 py-0.5 rounded">
              <Text className="text-white text-[9px] font-bold">{fmt}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Info */}
      <View className="p-2.5">
        <Text
          className="text-white text-xs font-medium leading-tight"
          numberOfLines={2}
        >
          {product.title}
        </Text>

        {/* Difficulty + Downloads */}
        <View className="flex-row items-center justify-between mt-1.5">
          <Text className={`text-[10px] font-semibold ${difficultyColor[product.printDifficulty]}`}>
            {difficultyLabel[product.printDifficulty]}
          </Text>
          <View className="flex-row items-center gap-0.5">
            <Ionicons name="download-outline" size={10} color={Colors.textMuted} />
            <Text className="text-dark-400 text-[10px]">
              {product.downloadCount.toLocaleString("pt-BR")}
            </Text>
          </View>
        </View>

        {/* Rating */}
        <View className="flex-row items-center gap-1 mt-1">
          <Ionicons name="star" size={11} color={Colors.warning} />
          <Text className="text-dark-300 text-[11px] font-semibold">
            {product.rating.toFixed(1)}
          </Text>
          <Text className="text-dark-500 text-[11px]">
            ({product.reviewCount})
          </Text>
        </View>

        {/* Price */}
        <View className="mt-1.5">
          {formattedOriginal && (
            <Text className="text-dark-500 text-[11px] line-through">
              {formattedOriginal}
            </Text>
          )}
          <Text
            className={`text-sm font-bold ${
              formattedPrice === "Grátis" ? "text-green-400" : "text-primary-400"
            }`}
          >
            {formattedPrice}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
