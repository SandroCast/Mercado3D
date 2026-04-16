import React, { useState } from "react";
import { View, FlatList, RefreshControl, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Header } from "../components/Header";
import { BannerCarousel } from "../components/BannerCarousel";
import { CategoryGrid } from "../components/CategoryGrid";
import { ProductCard } from "../components/ProductCard";
import { SectionHeader } from "../components/SectionHeader";

import { mockProducts } from "../constants/mockData";
import { useColors } from "../contexts/ThemeContext";
import { Product } from "../types";

const { width } = Dimensions.get("window");
const CARD_W = (width - 16 * 2 - 12) / 2;

interface HomeScreenProps {
  onNavigateToDigital?: () => void;
  onProfilePress?: () => void;
}

export function HomeScreen({ onNavigateToDigital, onProfilePress }: HomeScreenProps) {
  const Colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFavorite = (product: Product) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(product.id) ? next.delete(product.id) : next.add(product.id);
      return next;
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const ListHeader = () => (
    <View>
      <BannerCarousel />
      <CategoryGrid />
      <View style={{ marginTop: 24 }}>
        <SectionHeader title="Novidades" onSeeAll={() => {}} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top"]}>
      <Header cartCount={2} onProfilePress={onProfilePress} />

      <FlatList
        data={mockProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.cyan}
            colors={[Colors.cyan]}
          />
        }
        ListHeaderComponent={<ListHeader />}
        ListFooterComponent={<View style={{ height: 24 }} />}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            width={CARD_W}
            onFavorite={toggleFavorite}
            isFavorited={favorites.has(item.id)}
          />
        )}
      />
    </SafeAreaView>
  );
}
