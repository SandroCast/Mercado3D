import React, { useState } from "react";
import { View, FlatList, RefreshControl, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Header } from "../components/Header";
import { BannerCarousel } from "../components/BannerCarousel";
import { CategoryGrid } from "../components/CategoryGrid";
import { ProductCard } from "../components/ProductCard";
import { SectionHeader } from "../components/SectionHeader";
import { ProductDetailScreen } from "./ProductDetailScreen";

import { useColors } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useFavorites } from "../contexts/FavoritesContext";
import { useProducts, dbToProduct } from "../contexts/ProductsContext";
import { Product } from "../types";

const { width } = Dimensions.get("window");
const CARD_W = (width - 16 * 2 - 12) / 2;

interface HomeScreenProps {
  onNavigateToDigital?: () => void;
  onProfilePress?: () => void;
  onLoginRequired?: () => void;
  onCartPress?: () => void;
}

export function HomeScreen({ onNavigateToDigital, onProfilePress, onLoginRequired, onCartPress }: HomeScreenProps) {
  const Colors = useColors();
  const { session } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { products, loading, fetchProducts } = useProducts();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const displayProducts = products.map(dbToProduct);

  const handleFavorite = (product: Product) => {
    if (!session) { onLoginRequired?.(); return; }
    toggleFavorite({
      productId:   product.id,
      productType: "physical",
      title:       product.title,
      price:       product.price,
      imageUrl:    product.images[0],
      sellerName:  product.seller.name,
    });
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
      <Header onProfilePress={onProfilePress} onCartPress={onCartPress} />

      <FlatList
        data={displayProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchProducts}
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
            onPress={setSelectedProduct}
            onFavorite={handleFavorite}
            isFavorited={isFavorite(item.id)}
          />
        )}
      />

      <ProductDetailScreen
        visible={selectedProduct !== null}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onLoginRequired={onLoginRequired}
      />
    </SafeAreaView>
  );
}
