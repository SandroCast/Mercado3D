import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { useCart, CartItem } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Product, DigitalProduct } from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getImage(item: CartItem): string | null {
  if (item.variant?.images?.[0]) return item.variant.images[0];
  if (item.type === "digital") return (item.product as DigitalProduct).thumbnail ?? null;
  return (item.product as Product).images?.[0] ?? null;
}

function formatPrice(value: number): string {
  if (value === 0) return "GRÁTIS";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── CartItemRow ──────────────────────────────────────────────────────────────

function CartItemRow({
  item,
  onRequestRemove,
}: {
  item: CartItem;
  onRequestRemove: (item: CartItem) => void;
}) {
  const Colors = useColors();
  const { updateQuantity } = useCart();
  const imageUri = getImage(item);
  const isDigital = item.type === "digital";
  const isFree = item.product.price === 0;

  return (
    <View style={{
      flexDirection: "row",
      backgroundColor: Colors.bgCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.bgBorder,
      padding: 12,
      gap: 12,
    }}>
      {/* Imagem */}
      <View style={{ borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: Colors.bgBorder }}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: 72, height: 72 }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: 72, height: 72, backgroundColor: Colors.bgCardAlt, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="cube-outline" size={28} color={Colors.textMuted} />
          </View>
        )}
      </View>

      {/* Conteúdo */}
      <View style={{ flex: 1, gap: 4 }}>
        {/* Título + delete */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <Text
            style={{ flex: 1, color: Colors.white, fontSize: 13, fontWeight: "600", lineHeight: 18 }}
            numberOfLines={2}
          >
            {item.product.title}
          </Text>
          <TouchableOpacity onPress={() => onRequestRemove(item)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
          </TouchableOpacity>
        </View>

        {/* Vendedor + badge tipo */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 11 }} numberOfLines={1}>
            {item.product.seller.name}
          </Text>
          <View style={{
            backgroundColor: isDigital ? "#7c3aed22" : "#f9731622",
            borderRadius: 4,
            paddingHorizontal: 6,
            paddingVertical: 1,
          }}>
            <Text style={{ color: isDigital ? Colors.purple : Colors.orange, fontSize: 10, fontWeight: "700" }}>
              {isDigital ? "Digital" : "Físico"}
            </Text>
          </View>
        </View>

        {/* Atributos da variante selecionada */}
        {item.variant && Object.keys(item.variant.attributes).length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
            {Object.entries(item.variant.attributes).map(([key, val]) => (
              <View key={key} style={{
                backgroundColor: Colors.bgCardAlt,
                borderRadius: 6,
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: Colors.bgBorder,
              }}>
                <Text style={{ color: Colors.textGray, fontSize: 11 }}>
                  {key}: <Text style={{ color: Colors.white, fontWeight: "600" }}>{val}</Text>
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Preço + controles de quantidade */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          {/* Preço */}
          <Text style={{ color: isFree ? Colors.success : Colors.cyan, fontSize: 15, fontWeight: "800" }}>
            {formatPrice((item.variant?.price ?? item.product.price) * item.quantity)}
          </Text>

          {/* Qty: – / N / + */}
          {!isFree && !isDigital && (
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: Colors.bgCardAlt,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: Colors.bgBorder,
              overflow: "hidden",
            }}>
              <TouchableOpacity
                onPress={() => {
                  if (item.quantity <= 1) {
                    onRequestRemove(item);
                  } else {
                    updateQuantity(item.cartId, item.quantity - 1);
                  }
                }}
                style={{ paddingHorizontal: 10, paddingVertical: 6 }}
              >
                <Ionicons name="remove" size={14} color={Colors.textGray} />
              </TouchableOpacity>

              <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "700", minWidth: 22, textAlign: "center" }}>
                {item.quantity}
              </Text>

              <TouchableOpacity
                onPress={() => updateQuantity(item.cartId, item.quantity + 1)}
                style={{ paddingHorizontal: 10, paddingVertical: 6 }}
              >
                <Ionicons name="add" size={14} color={Colors.cyan} />
              </TouchableOpacity>
            </View>
          )}

          {/* Produtos digitais: qty sempre 1, não editável */}
          {isDigital && (
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: Colors.bgCardAlt,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}>
              <Ionicons name="download-outline" size={12} color={Colors.textMuted} />
              <Text style={{ color: Colors.textMuted, fontSize: 11 }}>
                {(() => {
                  const lic = (item.product as DigitalProduct).license;
                  const MAP: Record<string, string> = {
                    "cc0":        "CC0",
                    "cc-by":      "CC BY",
                    "cc-by-sa":   "CC BY-SA",
                    "cc-by-nc":   "CC BY-NC",
                    "personal":   "Uso Pessoal",
                    "commercial": "Uso Comercial",
                    "all-rights": "© Reservados",
                  };
                  return lic ? (MAP[lic] ?? lic.toUpperCase()) : "Digital";
                })()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── CartScreen ───────────────────────────────────────────────────────────────

interface CartScreenProps {
  visible: boolean;
  onClose: () => void;
  onCheckout?: () => void;
  onLoginRequired?: () => void;
}

export function CartScreen({ visible, onClose, onCheckout, onLoginRequired }: CartScreenProps) {
  const Colors = useColors();
  const { session } = useAuth();
  const { items, totalItems, totalPrice, clearCart, removeItem } = useCart();
  const [modalReady, setModalReady] = useState(false);

  // Estado dos dialogs de confirmação
  const [removeTarget, setRemoveTarget] = useState<CartItem | null>(null);
  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);

  const isEmpty = items.length === 0;

  const physicalItems = items.filter((i) => i.type === "physical");
  const digitalItems = items.filter((i) => i.type === "digital");

  const physicalTotal = physicalItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const digitalTotal = digitalItems.reduce((sum, i) => sum + i.product.price, 0);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      onShow={() => setModalReady(true)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: Colors.bgBorder,
          gap: 12,
        }}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.white, fontSize: 18, fontWeight: "800" }}>
              Meu Carrinho
            </Text>
            {!isEmpty && (
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 1 }}>
                {totalItems} {totalItems === 1 ? "item" : "itens"}
              </Text>
            )}
          </View>

          {!isEmpty && (
            <TouchableOpacity
              onPress={() => setClearConfirmVisible(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: "#ef444420",
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Ionicons name="trash-outline" size={14} color={Colors.error} />
              <Text style={{ color: Colors.error, fontSize: 12, fontWeight: "700" }}>Limpar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Corpo */}
        {modalReady && !session && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: Colors.bgCard,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              borderWidth: 1,
              borderColor: Colors.bgBorder,
            }}>
              <Ionicons name="lock-closed-outline" size={36} color={Colors.textMuted} />
            </View>
            <Text style={{ color: Colors.white, fontSize: 18, fontWeight: "800", textAlign: "center" }}>
              Faça login para ver o carrinho
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
              Você precisa estar logado para adicionar produtos e finalizar compras.
            </Text>
            <TouchableOpacity
              onPress={() => { onClose(); onLoginRequired?.(); }}
              style={{ marginTop: 24, borderRadius: 14, overflow: "hidden", width: "100%" }}
            >
              <LinearGradient
                colors={["#7c3aed", "#a855f7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8 }}
              >
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "900" }}>Entrar na conta</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {modalReady && !!session && (
          <>
            {isEmpty ? (
              /* Estado vazio */
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
                <View style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: Colors.bgCard,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: Colors.bgBorder,
                }}>
                  <Ionicons name="cart-outline" size={36} color={Colors.textMuted} />
                </View>
                <Text style={{ color: Colors.white, fontSize: 18, fontWeight: "800", textAlign: "center" }}>
                  Seu carrinho está vazio
                </Text>
                <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
                  Explore o catálogo e adicione produtos ou arquivos digitais ao carrinho.
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    marginTop: 24,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: Colors.cyan,
                  }}
                >
                  <Text style={{ color: Colors.cyan, fontWeight: "700", fontSize: 14 }}>Explorar produtos</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Lista */}
                <FlatList
                  data={items}
                  keyExtractor={(item) => item.cartId}
                  contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
                  ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={
                    physicalItems.length > 0 && digitalItems.length > 0 ? (
                      <View style={{ marginBottom: 14 }}>
                        <View style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          backgroundColor: Colors.bgCard,
                          borderRadius: 10,
                          padding: 10,
                          borderWidth: 1,
                          borderColor: Colors.bgBorder,
                        }}>
                          <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
                          <Text style={{ color: Colors.textMuted, fontSize: 12, flex: 1 }}>
                            Itens físicos e digitais serão processados separadamente.
                          </Text>
                        </View>
                      </View>
                    ) : null
                  }
                  renderItem={({ item }) => (
                    <CartItemRow item={item} onRequestRemove={setRemoveTarget} />
                  )}
                />

                {/* Rodapé — resumo + CTA */}
                <View style={{
                  backgroundColor: Colors.bgCard,
                  borderTopWidth: 1,
                  borderTopColor: Colors.bgBorder,
                  paddingHorizontal: 16,
                  paddingTop: 16,
                  paddingBottom: 8,
                  gap: 10,
                }}>
                  {/* Resumo de valores */}
                  <View style={{ gap: 6 }}>
                    {physicalItems.length > 0 && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
                          Produtos físicos ({physicalItems.reduce((s, i) => s + i.quantity, 0)}x)
                        </Text>
                        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600" }}>
                          {formatPrice(physicalTotal)}
                        </Text>
                      </View>
                    )}
                    {digitalItems.length > 0 && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
                          Arquivos digitais ({digitalItems.length}x)
                        </Text>
                        <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600" }}>
                          {formatPrice(digitalTotal)}
                        </Text>
                      </View>
                    )}
                    <View style={{ height: 1, backgroundColor: Colors.bgBorder, marginVertical: 2 }} />
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "700" }}>Total</Text>
                      <Text style={{ color: Colors.cyan, fontSize: 20, fontWeight: "900" }}>
                        {formatPrice(totalPrice)}
                      </Text>
                    </View>
                  </View>

                  {/* Frete info */}
                  {physicalItems.length > 0 && (
                    <View style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: "#22c55e15",
                      borderRadius: 8,
                      padding: 8,
                    }}>
                      <Ionicons name="car-outline" size={14} color={Colors.success} />
                      <Text style={{ color: Colors.success, fontSize: 12, fontWeight: "600" }}>
                        Frete calculado no checkout
                      </Text>
                    </View>
                  )}

                  {/* Botão checkout */}
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={onCheckout}
                    style={{ borderRadius: 14, overflow: "hidden" }}
                  >
                    <LinearGradient
                      colors={["#06b6d4", "#22d3ee"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 15,
                        gap: 8,
                      }}
                    >
                      <Ionicons name="lock-closed" size={16} color="#0d1117" />
                      <Text style={{ color: "#0d1117", fontSize: 15, fontWeight: "900" }}>
                        Finalizar Compra
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}

        {/* Placeholder enquanto modal anima */}
        {!modalReady && (
          <View style={{ flex: 1, backgroundColor: Colors.bg }} />
        )}

        {/* Dialog: remover item */}
        <ConfirmDialog
          visible={removeTarget !== null}
          title="Remover item"
          message={`Remover "${removeTarget?.product.title}" do carrinho?`}
          confirmLabel="Remover"
          cancelLabel="Cancelar"
          destructive
          icon="trash-outline"
          onCancel={() => setRemoveTarget(null)}
          onConfirm={() => {
            if (removeTarget) removeItem(removeTarget.cartId);
            setRemoveTarget(null);
          }}
        />

        {/* Dialog: limpar carrinho */}
        <ConfirmDialog
          visible={clearConfirmVisible}
          title="Limpar carrinho"
          message="Deseja remover todos os itens do carrinho?"
          confirmLabel="Limpar tudo"
          cancelLabel="Cancelar"
          destructive
          icon="trash-outline"
          onCancel={() => setClearConfirmVisible(false)}
          onConfirm={() => {
            clearCart();
            setClearConfirmVisible(false);
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
