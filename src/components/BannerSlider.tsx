import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Image,
} from "react-native";
import { Banner } from "../types";
import { Colors } from "../constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 32;

interface BannerSliderProps {
  banners: Banner[];
  onBannerPress?: (banner: Banner) => void;
}

export function BannerSlider({ banners, onBannerPress }: BannerSliderProps) {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % banners.length;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeIndex, banners.length]);

  return (
    <View className="mt-4 px-4">
      <FlatList
        ref={flatListRef}
        data={banners}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={BANNER_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={{ gap: 12 }}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / (BANNER_WIDTH + 12)
          );
          setActiveIndex(index);
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => onBannerPress?.(item)}
            style={{ width: BANNER_WIDTH }}
            className="rounded-2xl overflow-hidden bg-dark-800"
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={{ width: BANNER_WIDTH, height: 150 }}
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-dark-950/40 justify-end p-4 rounded-2xl">
              <Text className="text-white text-base font-bold leading-tight">
                {item.title}
              </Text>
              {item.subtitle && (
                <Text className="text-dark-200 text-xs mt-0.5">
                  {item.subtitle}
                </Text>
              )}
              <View className="mt-2 self-start bg-primary-500 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-semibold">
                  {item.actionLabel}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Pagination dots */}
      <View className="flex-row justify-center gap-1.5 mt-3">
        {banners.map((_, i) => (
          <View
            key={i}
            className={`rounded-full transition-all ${
              i === activeIndex
                ? "w-5 h-2 bg-primary-500"
                : "w-2 h-2 bg-dark-200"
            }`}
          />
        ))}
      </View>
    </View>
  );
}
