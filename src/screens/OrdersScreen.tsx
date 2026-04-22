import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { useOrders } from "../contexts/OrdersContext";
import { Order, OrderStatus } from "../types";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: string }> = {
  pending_payment: { label: "Aguardando Pagamento", color: "#f59e0b", icon: "time-outline" },
  paid:            { label: "Pago",                  color: "#3b82f6", icon: "checkmark-circle-outline" },
  processing:      { label: "Processando",           color: "#6366f1", icon: "construct-outline" },
  shipped:         { label: "Enviado",               color: "#06b6d4", icon: "bicycle-outline" },
  delivered:       { label: "Entregue",              color: "#22c55e", icon: "checkmark-done-outline" },
  cancelled:       { label: "Cancelado",             color: "#ef4444", icon: "close-circle-outline" },
  refunded:        { label: "Reembolsado",           color: "#94a3b8", icon: "return-down-back-outline" },
};

type FilterKey = "all" | "pending" | "active" | "done" | "cancelled";

const FILTERS: { key: FilterKey; label: string; statuses: OrderStatus[] }[] = [
  { key: "all",       label: "Todos",         statuses: [] },
  { key: "pending",   label: "Aguardando",    statuses: ["pending_payment"] },
  { key: "active",    label: "Em andamento",  statuses: ["paid", "processing", "shipped"] },
  { key: "done",      label: "Concluído",     statuses: ["delivered"] },
  { key: "cancelled", label: "Cancelado",     statuses: ["cancelled", "refunded"] },
];

function formatPrice(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function shortId(id: string) {
  // ORD-ABC123-XYZ → #ABC123
  const parts = id.split("-");
  return `#${parts[1] ?? id}`;
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const Colors  = useColors();
  const status  = STATUS_CONFIG[order.status];
  const thumbs  = order.items.slice(0, 3).map((i) => i.imageUrl).filter(Boolean) as string[];
  const extra   = order.items.length - 3;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: Colors.bgCard,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.bgBorder,
        padding: 14,
        gap: 10,
      }}
    >
      {/* Top row: ID + date + status */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: "700", flex: 1 }}>
          {shortId(order.id)}
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{formatDate(order.createdAt)}</Text>
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 4,
          backgroundColor: status.color + "22",
          borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
          borderWidth: 1, borderColor: status.color + "44",
        }}>
          <Ionicons name={status.icon as any} size={11} color={status.color} />
          <Text style={{ color: status.color, fontSize: 10, fontWeight: "800" }}>{status.label}</Text>
        </View>
      </View>

      {/* Thumbnails + item names */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {/* Thumbnail stack */}
        {thumbs.length > 0 && (
          <View style={{ flexDirection: "row" }}>
            {thumbs.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={{
                  width: 40, height: 40, borderRadius: 8,
                  borderWidth: 2, borderColor: Colors.bg,
                  marginLeft: i > 0 ? -10 : 0,
                }}
                resizeMode="cover"
              />
            ))}
            {extra > 0 && (
              <View style={{
                width: 40, height: 40, borderRadius: 8, marginLeft: -10,
                backgroundColor: Colors.bgCardAlt,
                borderWidth: 2, borderColor: Colors.bg,
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700" }}>+{extra}</Text>
              </View>
            )}
          </View>
        )}

        {/* Item list */}
        <View style={{ flex: 1, gap: 2 }}>
          {order.items.slice(0, 2).map((item, i) => (
            <Text key={i} style={{ color: Colors.textGray, fontSize: 12 }} numberOfLines={1}>
              {item.quantity > 1 ? `${item.quantity}x ` : ""}{item.title}
            </Text>
          ))}
          {order.items.length > 2 && (
            <Text style={{ color: Colors.textMuted, fontSize: 11 }}>
              + {order.items.length - 2} {order.items.length - 2 === 1 ? "item" : "itens"}
            </Text>
          )}
        </View>
      </View>

      {/* Bottom row: payment + total */}
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        borderTopWidth: 1, borderTopColor: Colors.bgBorder, paddingTop: 10,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons
            name={order.paymentMethod === "pix" ? "qr-code-outline" : "card-outline"}
            size={14}
            color={Colors.textMuted}
          />
          <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
            {order.paymentMethod === "pix" ? "PIX" : "Cartão de crédito"}
          </Text>
        </View>
        <Text style={{ color: Colors.cyan, fontSize: 15, fontWeight: "900" }}>
          {formatPrice(order.total)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── OrderDetailModal ─────────────────────────────────────────────────────────

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const Colors = useColors();
  const status = STATUS_CONFIG[order.status];

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: 16, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: Colors.bgBorder, gap: 12,
        }}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.white, fontSize: 17, fontWeight: "800" }}>
              Detalhes do Pedido
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 1 }}>
              {shortId(order.id)} · {formatDate(order.createdAt)}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

          {/* Status */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 12,
            backgroundColor: status.color + "15",
            borderRadius: 14, padding: 14,
            borderWidth: 1, borderColor: status.color + "33",
          }}>
            <View style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: status.color + "25",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name={status.icon as any} size={22} color={status.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: status.color, fontSize: 15, fontWeight: "800" }}>{status.label}</Text>
              {order.status === "pending_payment" && (
                <Text style={{ color: status.color + "bb", fontSize: 12, marginTop: 2 }}>
                  Aguardando confirmação do pagamento
                </Text>
              )}
              {order.status === "shipped" && order.selectedShipping && (
                <Text style={{ color: status.color + "bb", fontSize: 12, marginTop: 2 }}>
                  {order.selectedShipping.name} · {order.selectedShipping.deliveryDays}
                </Text>
              )}
            </View>
          </View>

          {/* Items */}
          <View style={{
            backgroundColor: Colors.bgCard, borderRadius: 14,
            borderWidth: 1, borderColor: Colors.bgBorder, padding: 14, gap: 10,
          }}>
            <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Itens do Pedido
            </Text>
            {order.items.map((item, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={{ width: 44, height: 44, borderRadius: 8 }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: Colors.bgCardAlt, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={item.type === "digital" ? "document-outline" : "cube-outline"} size={18} color={Colors.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "600" }} numberOfLines={2}>{item.title}</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>{item.sellerName}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  {item.quantity > 1 && (
                    <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{item.quantity}x</Text>
                  )}
                  <Text style={{ color: Colors.cyan, fontSize: 13, fontWeight: "700" }}>
                    {formatPrice(item.unitPrice * item.quantity)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Shipping address */}
          {order.shippingAddress && (
            <View style={{
              backgroundColor: Colors.bgCard, borderRadius: 14,
              borderWidth: 1, borderColor: Colors.bgBorder, padding: 14, gap: 6,
            }}>
              <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                Endereço de Entrega
              </Text>
              <Text style={{ color: Colors.textGray, fontSize: 13 }}>
                {order.shippingAddress.recipientName}
              </Text>
              <Text style={{ color: Colors.textGray, fontSize: 13 }}>
                {order.shippingAddress.street}, {order.shippingAddress.number}
                {order.shippingAddress.complement ? ` — ${order.shippingAddress.complement}` : ""}
              </Text>
              <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                {order.shippingAddress.neighborhood} · {order.shippingAddress.city}/{order.shippingAddress.state}
              </Text>
              <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                CEP {order.shippingAddress.postalCode.replace(/(\d{5})(\d{3})/, "$1-$2")}
              </Text>
              {order.selectedShipping && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.bgBorder }}>
                  <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                    {order.selectedShipping.name} ({order.selectedShipping.deliveryDays})
                  </Text>
                  <Text style={{ color: Colors.textGray, fontSize: 12, fontWeight: "600" }}>
                    {formatPrice(order.selectedShipping.price)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Payment + totals */}
          <View style={{
            backgroundColor: Colors.bgCard, borderRadius: 14,
            borderWidth: 1, borderColor: Colors.bgBorder, padding: 14, gap: 10,
          }}>
            <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Pagamento
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <Ionicons
                name={order.paymentMethod === "pix" ? "qr-code-outline" : "card-outline"}
                size={16} color={Colors.textGray}
              />
              <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600" }}>
                {order.paymentMethod === "pix" ? "PIX" : "Cartão de crédito"}
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: Colors.bgBorder }} />

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Subtotal</Text>
              <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600" }}>{formatPrice(order.subtotal)}</Text>
            </View>
            {order.shippingCost > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Frete</Text>
                <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600" }}>{formatPrice(order.shippingCost)}</Text>
              </View>
            )}
            <View style={{ height: 1, backgroundColor: Colors.bgBorder }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "700" }}>Total</Text>
              <Text style={{ color: Colors.cyan, fontSize: 20, fontWeight: "900" }}>{formatPrice(order.total)}</Text>
            </View>
          </View>

          {/* Order ID */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: Colors.bgCard, borderRadius: 10, padding: 12,
            borderWidth: 1, borderColor: Colors.bgBorder,
          }}>
            <Ionicons name="receipt-outline" size={14} color={Colors.textMuted} />
            <Text style={{ color: Colors.textMuted, fontSize: 12, flex: 1 }}>
              ID do pedido: <Text style={{ color: Colors.textGray }}>{order.id}</Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── OrdersScreen ─────────────────────────────────────────────────────────────

interface OrdersScreenProps {
  visible: boolean;
  onClose: () => void;
}

export function OrdersScreen({ visible, onClose }: OrdersScreenProps) {
  const Colors = useColors();
  const { orders, loading, fetchOrders } = useOrders();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = activeFilter === "all"
    ? orders
    : orders.filter((o) => {
        const f = FILTERS.find((f) => f.key === activeFilter);
        return f ? f.statuses.includes(o.status) : true;
      });

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top", "bottom"]}>

        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: 16, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: Colors.bgBorder, gap: 12,
        }}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.white, fontSize: 18, fontWeight: "800" }}>Minhas Compras</Text>
            {orders.length > 0 && (
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 1 }}>
                {orders.length} {orders.length === 1 ? "pedido" : "pedidos"} no total
              </Text>
            )}
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
          style={{ borderBottomWidth: 1, borderBottomColor: Colors.bgBorder, flexGrow: 0 }}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            const count  = f.key === "all"
              ? orders.length
              : orders.filter((o) => f.statuses.includes(o.status)).length;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                  backgroundColor: active ? Colors.cyan : Colors.bgCard,
                  borderWidth: 1, borderColor: active ? Colors.cyan : Colors.bgBorder,
                }}
              >
                <Text style={{ color: active ? Colors.bg : Colors.textGray, fontSize: 13, fontWeight: "700" }}>
                  {f.label}
                </Text>
                {count > 0 && (
                  <View style={{
                    backgroundColor: active ? Colors.bg + "44" : Colors.bgCardAlt,
                    borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1,
                  }}>
                    <Text style={{ color: active ? Colors.bg : Colors.textMuted, fontSize: 10, fontWeight: "800" }}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Body */}
        {loading && orders.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
            <ActivityIndicator size="large" color={Colors.cyan} />
            <Text style={{ color: Colors.textMuted, fontSize: 14 }}>Carregando pedidos...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 16 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.bgBorder,
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="bag-handle-outline" size={36} color={Colors.textMuted} />
            </View>
            <Text style={{ color: Colors.white, fontSize: 17, fontWeight: "800", textAlign: "center" }}>
              {activeFilter === "all" ? "Nenhum pedido ainda" : "Nenhum pedido nessa categoria"}
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              {activeFilter === "all"
                ? "Suas compras aparecerão aqui após a confirmação do pedido."
                : "Tente outro filtro para encontrar seus pedidos."}
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={fetchOrders} tintColor={Colors.cyan} />
            }
          >
            {filtered.map((order) => (
              <OrderCard key={order.id} order={order} onPress={() => setSelectedOrder(order)} />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </Modal>
  );
}
