import React, { useState, useEffect, useCallback } from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Linking from "expo-linking";

import { HomeScreen } from "./src/screens/HomeScreen";
import { DigitalScreen } from "./src/screens/DigitalScreen";
import { SearchScreen } from "./src/screens/SearchScreen";
import { MoreScreen } from "./src/screens/MoreScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { CartScreen } from "./src/screens/CartScreen";
import { CheckoutScreen } from "./src/screens/CheckoutScreen";
import { ForumScreen } from "./src/screens/ForumScreen";
import { OrderConfirmScreen } from "./src/screens/OrderConfirmScreen";
import { ProductDetailScreen, ProductDetailItem } from "./src/screens/ProductDetailScreen";
import { BottomNavBar, TabName } from "./src/components/BottomNavBar";
import { ThemeProvider, useColors } from "./src/contexts/ThemeContext";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { CartProvider } from "./src/contexts/CartContext";
import { AddressProvider } from "./src/contexts/AddressContext";
import { OrdersProvider } from "./src/contexts/OrdersContext";
import { FavoritesProvider } from "./src/contexts/FavoritesContext";
import { FollowsProvider } from "./src/contexts/FollowsContext";
import { ProductsProvider } from "./src/contexts/ProductsContext";
import { DigitalProductsProvider } from "./src/contexts/DigitalProductsContext";
import { DigitalPurchasesProvider } from "./src/contexts/DigitalPurchasesContext";
import { ReviewsProvider } from "./src/contexts/ReviewsContext";
import { QuestionsProvider } from "./src/contexts/QuestionsContext";
import { SalesProvider } from "./src/contexts/SalesContext";
import { NotificationsProvider, useNotifications } from "./src/contexts/NotificationsContext";
import { ForumProvider } from "./src/contexts/ForumContext";
import { PendingQuestionsScreen } from "./src/screens/PendingQuestionsScreen";
import { supabase } from "./src/lib/supabase";
import { dbToProduct } from "./src/contexts/ProductsContext";
import { NotificationsScreen } from "./src/screens/NotificationsScreen";
import { configureGoogleSignIn } from "./src/lib/googleSignIn";
import { mockProducts, mockDigitalProducts } from "./src/constants/mockData";
import { Order } from "./src/types";

configureGoogleSignIn();

// ─── Deep link resolver ───────────────────────────────────────────────────────

function resolveProduct(url: string): ProductDetailItem | null {
  try {
    const parsed = Linking.parse(url);
    const params = parsed.queryParams ?? {};
    const id   = typeof params.id   === "string" ? params.id   : null;
    const type = typeof params.type === "string" ? params.type : null;

    if (!id || !type) return null;

    if (type === "digital") {
      return mockDigitalProducts.find((p) => p.id === id) ?? null;
    }
    return mockProducts.find((p) => p.id === id) ?? null;
  } catch {
    return null;
  }
}

// ─── AppContent ───────────────────────────────────────────────────────────────

function AppContent() {
  const Colors = useColors();
  const { session, loading } = useAuth();
  const { pendingTapAction, clearPendingTapAction } = useNotifications();
  const [activeTab, setActiveTab]             = useState<TabName>("home");
  const [cartVisible, setCartVisible]         = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [confirmedOrder, setConfirmedOrder]   = useState<Order | null>(null);
  const [deepLinkProduct, setDeepLinkProduct]   = useState<ProductDetailItem | null>(null);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [pendingQuestionsVisible, setPendingQuestionsVisible] = useState(false);

  const handleDeepLink = useCallback((url: string) => {
    const product = resolveProduct(url);
    if (product) setDeepLinkProduct(product);
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, [handleDeepLink]);

  // Handle push notification tap — navigate to the relevant screen
  useEffect(() => {
    if (!pendingTapAction) return;
    const action = pendingTapAction;
    clearPendingTapAction();

    if (action.type === "question") {
      setPendingQuestionsVisible(true);
      return;
    }

    if (action.type === "answer") {
      const { productId, productType } = action;
      (async () => {
        try {
          if (productType === "physical") {
            const { data, error } = await supabase
              .from("products")
              .select("*, profiles:user_id(full_name, avatar_url, email)")
              .eq("id", productId)
              .single();
            if (!error && data) {
              setDeepLinkProduct(dbToProduct({
                id: data.id, userId: data.user_id, title: data.title, description: data.description,
                price: Number(data.price), originalPrice: data.original_price ? Number(data.original_price) : undefined,
                brand: data.brand ?? undefined, category: data.category, condition: data.condition,
                images: data.images ?? [], inStock: data.in_stock, freeShipping: data.free_shipping,
                variantAttributes: data.variant_attributes ?? [], rating: Number(data.rating),
                reviewCount: data.review_count, createdAt: data.created_at,
                sellerName: (data.profiles as any)?.full_name ?? (data.profiles as any)?.email ?? "Vendedor",
                sellerAvatar: (data.profiles as any)?.avatar_url ?? undefined,
              }));
            }
          } else {
            const { data, error } = await supabase
              .from("digital_products")
              .select("*, profiles:user_id(full_name, avatar_url, email)")
              .eq("id", productId)
              .single();
            if (!error && data) {
              const { dbToDigitalProduct } = await import("./src/contexts/DigitalProductsContext");
              setDeepLinkProduct(dbToDigitalProduct({
                id: data.id, userId: data.user_id, title: data.title, description: data.description,
                price: Number(data.price), originalPrice: data.original_price ? Number(data.original_price) : undefined,
                category: data.category, thumbnail: data.thumbnail, previewImages: data.preview_images ?? [],
                formats: data.formats ?? [], formatFiles: data.format_files ?? {},
                printDifficulty: data.print_difficulty, supportRequired: data.support_required,
                license: data.license ?? undefined, downloadCount: data.download_count,
                rating: Number(data.rating), reviewCount: data.review_count, createdAt: data.created_at,
                sellerName: (data.profiles as any)?.full_name ?? (data.profiles as any)?.email ?? "Vendedor",
                sellerAvatar: (data.profiles as any)?.avatar_url ?? undefined,
              }));
            }
          }
        } catch (err) {
          console.warn("notification tap error:", err);
        }
      })();
    }

    // "sale" and "order" types will be handled here in the future
  }, [pendingTapAction]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={Colors.cyan} />
      </View>
    );
  }

  const isDigital = activeTab === "stl";
  const profileRequiresLogin = activeTab === "profile" && !session;

  const handleCheckout = () => {
    // Open checkout on top of cart — no delay, no flash
    setCheckoutVisible(true);
  };

  const handleOrderPlaced = (order: Order) => {
    setCartVisible(false);
    setCheckoutVisible(false);
    setTimeout(() => setConfirmedOrder(order), 120);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ flex: 1, display: activeTab === "home" ? "flex" : "none" }}>
        <HomeScreen
          onProfilePress={() => setActiveTab("profile")}
          onLoginRequired={() => setActiveTab("profile")}
          onCartPress={() => setCartVisible(true)}
          onNotificationsPress={() => setNotificationsVisible(true)}
        />
      </View>
      <View style={{ flex: 1, display: activeTab === "search" ? "flex" : "none" }}>
        <SearchScreen
          isActive={activeTab === "search"}
          onLoginRequired={() => setActiveTab("profile")}
        />
      </View>
      <View style={{ flex: 1, display: activeTab === "stl" ? "flex" : "none" }}>
        <DigitalScreen onLoginRequired={() => setActiveTab("profile")} />
      </View>
      <View style={{ flex: 1, display: activeTab === "forum" ? "flex" : "none" }}>
        <ForumScreen />
      </View>
      <View style={{ flex: 1, display: activeTab === "profile" ? "flex" : "none" }}>
        {profileRequiresLogin ? <LoginScreen /> : <MoreScreen />}
      </View>

      <NotificationsScreen
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        onOpenSales={() => setActiveTab("profile")}
        onOpenPurchases={() => setActiveTab("profile")}
      />

      {/* Notificação de pergunta — abre perguntas pendentes */}
      <PendingQuestionsScreen
        visible={pendingQuestionsVisible}
        onClose={() => setPendingQuestionsVisible(false)}
      />

      {/* Deep link / notificação de resposta — abre produto de qualquer tab */}
      <ProductDetailScreen
        visible={deepLinkProduct !== null}
        product={deepLinkProduct}
        onClose={() => setDeepLinkProduct(null)}
        onLoginRequired={() => setActiveTab("profile")}
      />

      <CartScreen
        visible={cartVisible}
        onClose={() => setCartVisible(false)}
        onCheckout={handleCheckout}
        onLoginRequired={() => setActiveTab("profile")}
      />

      <CheckoutScreen
        visible={checkoutVisible}
        onClose={() => setCheckoutVisible(false)}
        onOrderPlaced={handleOrderPlaced}
      />

      <OrderConfirmScreen
        visible={confirmedOrder !== null}
        order={confirmedOrder}
        onClose={() => setConfirmedOrder(null)}
        onViewOrders={() => setActiveTab("profile")}
      />

      <BottomNavBar
        activeTab={activeTab}
        onTabPress={setActiveTab}
        isDigital={isDigital}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <AddressProvider>
              <OrdersProvider>
                <FavoritesProvider>
                  <FollowsProvider>
                    <ProductsProvider>
                      <DigitalProductsProvider>
                        <DigitalPurchasesProvider>
                          <ReviewsProvider>
                            <QuestionsProvider>
                              <SalesProvider>
                                <NotificationsProvider>
                                  <ForumProvider>
                                    <AppContent />
                                  </ForumProvider>
                                </NotificationsProvider>
                              </SalesProvider>
                            </QuestionsProvider>
                          </ReviewsProvider>
                        </DigitalPurchasesProvider>
                      </DigitalProductsProvider>
                    </ProductsProvider>
                  </FollowsProvider>
                </FavoritesProvider>
              </OrdersProvider>
            </AddressProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
