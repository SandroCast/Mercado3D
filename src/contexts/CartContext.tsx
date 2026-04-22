import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Product, DigitalProduct } from "../types";

const CART_STORAGE_KEY = "@mercado3d:cart_v2";
const MAX_QUANTITY = 99;
const MAX_CART_ITEMS = 50;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectedVariant {
  id:         string;
  attributes: Record<string, string>;
  price?:     number;
  stock:      number;
  images:     string[];
}

export interface CartItem {
  cartId:   string; // productId + optional variantId
  product:  Product | DigitalProduct;
  type:     "physical" | "digital";
  quantity: number;
  addedAt:  string;
  variant?: SelectedVariant;
}

interface CartContextValue {
  items:          CartItem[];
  totalItems:     number;
  totalPrice:     number;
  addItem:        (product: Product | DigitalProduct, type: "physical" | "digital", variant?: SelectedVariant) => void;
  removeItem:     (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  clearCart:      () => void;
  isInCart:       (productId: string, variantId?: string) => boolean;
  getQuantity:    (productId: string, variantId?: string) => number;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue>({
  items:          [],
  totalItems:     0,
  totalPrice:     0,
  addItem:        () => {},
  removeItem:     () => {},
  updateQuantity: () => {},
  clearCart:      () => {},
  isInCart:       () => false,
  getQuantity:    () => 0,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCartId(productId: string, variantId?: string): string {
  return variantId ? `${productId}__${variantId}` : productId;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items,  setItems]  = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const valid = parsed.filter(
                (i) =>
                  i &&
                  typeof i.cartId === "string" &&
                  typeof i.type === "string" &&
                  typeof i.quantity === "number" &&
                  i.product?.id
              ) as CartItem[];
              setItems(valid);
            }
          } catch {
            // Corrupted storage — start empty
          }
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)).catch(() => {});
  }, [items, loaded]);

  const addItem = useCallback(
    (product: Product | DigitalProduct, type: "physical" | "digital", variant?: SelectedVariant) => {
      if (!product?.id || typeof product.id !== "string") return;

      const cartId = makeCartId(product.id, variant?.id);

      setItems((prev) => {
        const existing = prev.find((i) => i.cartId === cartId);

        if (existing) {
          return prev.map((i) =>
            i.cartId === cartId
              ? { ...i, quantity: Math.min(i.quantity + 1, MAX_QUANTITY) }
              : i
          );
        }

        if (prev.length >= MAX_CART_ITEMS) return prev;

        return [...prev, {
          cartId,
          product,
          type,
          quantity: 1,
          addedAt: new Date().toISOString(),
          variant,
        }];
      });
    },
    []
  );

  const removeItem = useCallback((cartId: string) => {
    if (!cartId || typeof cartId !== "string") return;
    setItems((prev) => prev.filter((i) => i.cartId !== cartId));
  }, []);

  const updateQuantity = useCallback((cartId: string, quantity: number) => {
    if (!cartId || typeof cartId !== "string") return;
    const safeQty = Math.max(1, Math.min(Math.floor(Number(quantity)), MAX_QUANTITY));
    if (!isFinite(safeQty)) return;
    setItems((prev) =>
      prev.map((i) => (i.cartId === cartId ? { ...i, quantity: safeQty } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const isInCart = useCallback(
    (productId: string, variantId?: string) =>
      items.some((i) => i.cartId === makeCartId(productId, variantId)),
    [items]
  );

  const getQuantity = useCallback(
    (productId: string, variantId?: string) =>
      items.find((i) => i.cartId === makeCartId(productId, variantId))?.quantity ?? 0,
    [items]
  );

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => {
    const price = Number(i.variant?.price ?? i.product?.price);
    return sum + (isFinite(price) ? price * i.quantity : 0);
  }, 0);

  return (
    <CartContext.Provider value={{
      items, totalItems, totalPrice,
      addItem, removeItem, updateQuantity, clearCart,
      isInCart, getQuantity,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
