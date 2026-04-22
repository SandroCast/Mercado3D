import React from "react";
import { View, Text, Modal, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { Order } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(value: number): string {
  if (value === 0) return "GRÁTIS";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── OrderConfirmScreen ───────────────────────────────────────────────────────

interface OrderConfirmScreenProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onViewOrders?: () => void;
}

export function OrderConfirmScreen({ visible, order, onClose, onViewOrders }: OrderConfirmScreenProps) {
  const Colors = useColors();

  if (!order) return null;

  const isPix = order.paymentMethod === "pix";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Success icon */}
          <View style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: Colors.success + "20",
            borderWidth: 2,
            borderColor: Colors.success + "55",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Ionicons name="checkmark-circle" size={52} color={Colors.success} />
          </View>

          {/* Title */}
          <View style={{ alignItems: "center", gap: 8 }}>
            <Text style={{ color: Colors.white, fontSize: 22, fontWeight: "900", textAlign: "center" }}>
              Pedido realizado!
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              {isPix
                ? "Seu pedido foi criado. Complete o pagamento via PIX para confirmar."
                : "Seu pedido foi criado e o pagamento está sendo processado."}
            </Text>
          </View>

          {/* Order ID */}
          <View style={{
            backgroundColor: Colors.bgCard,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: Colors.bgBorder,
            padding: 16,
            width: "100%",
            gap: 8,
          }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Nº do pedido
              </Text>
              <Text style={{ color: Colors.cyan, fontSize: 13, fontWeight: "800", letterSpacing: 0.5 }}>
                {order.id}
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: Colors.bgBorder }} />

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Total</Text>
              <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "700" }}>
                {formatPrice(order.total)}
              </Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Pagamento</Text>
              <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "700" }}>
                {isPix ? "PIX" : "Cartão de crédito"}
              </Text>
            </View>

            {order.selectedShipping && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Entrega</Text>
                <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "700" }}>
                  {order.selectedShipping.deliveryDays}
                </Text>
              </View>
            )}
          </View>

          {/* PIX notice */}
          {isPix && (
            <View style={{
              backgroundColor: Colors.success + "15",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: Colors.success + "44",
              padding: 16,
              width: "100%",
              gap: 10,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="qr-code-outline" size={20} color={Colors.success} />
                <Text style={{ color: Colors.success, fontSize: 14, fontWeight: "700" }}>
                  Aguardando pagamento PIX
                </Text>
              </View>
              <Text style={{ color: Colors.success + "cc", fontSize: 13, lineHeight: 18 }}>
                O QR Code PIX será enviado por e-mail e estará disponível na tela de pedidos.
                O pedido é confirmado automaticamente após o pagamento.
              </Text>
            </View>
          )}

          {/* Card notice */}
          {!isPix && (
            <View style={{
              backgroundColor: Colors.cyan + "15",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: Colors.cyan + "44",
              padding: 16,
              width: "100%",
              gap: 10,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="card-outline" size={20} color={Colors.cyan} />
                <Text style={{ color: Colors.cyan, fontSize: 14, fontWeight: "700" }}>
                  Pagamento em processamento
                </Text>
              </View>
              <Text style={{ color: Colors.cyan + "cc", fontSize: 13, lineHeight: 18 }}>
                O pagamento está sendo processado pelo Mercado Pago.
                Você receberá uma confirmação por e-mail em instantes.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Actions */}
        <View style={{
          paddingHorizontal: 24,
          paddingVertical: 16,
          borderTopWidth: 1,
          borderTopColor: Colors.bgBorder,
          gap: 10,
        }}>
          <TouchableOpacity
            onPress={() => { onViewOrders?.(); onClose(); }}
            style={{
              backgroundColor: Colors.cyan,
              borderRadius: 14,
              paddingVertical: 15,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Ionicons name="receipt-outline" size={18} color={Colors.bg} />
            <Text style={{ color: Colors.bg, fontSize: 15, fontWeight: "900" }}>
              Ver meus pedidos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={{
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: Colors.textGray, fontSize: 14, fontWeight: "600" }}>
              Continuar comprando
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
