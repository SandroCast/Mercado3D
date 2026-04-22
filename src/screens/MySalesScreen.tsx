import React, { useState, useEffect } from "react";
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { useSales } from "../contexts/SalesContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { Order, OrderStatus } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: string }> = {
  pending_payment: { label: "Aguardando Pagamento", color: "#f59e0b", icon: "time-outline" },
  paid:            { label: "Pago",                  color: "#3b82f6", icon: "checkmark-circle-outline" },
  processing:      { label: "Processando",           color: "#6366f1", icon: "construct-outline" },
  shipped:         { label: "Enviado",               color: "#06b6d4", icon: "bicycle-outline" },
  delivered:       { label: "Entregue",              color: "#22c55e", icon: "checkmark-done-outline" },
  cancelled:       { label: "Cancelado",             color: "#ef4444", icon: "close-circle-outline" },
  refunded:        { label: "Reembolsado",           color: "#94a3b8", icon: "return-down-back-outline" },
};

// Next status the seller can advance to
const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string; color: string }>> = {
  paid:       { status: "processing", label: "Confirmar Processamento", color: "#6366f1" },
  processing: { status: "shipped",    label: "Marcar como Enviado",     color: "#06b6d4" },
  shipped:    { status: "delivered",  label: "Confirmar Entrega",       color: "#22c55e" },
};

type FilterKey = "all" | "pending" | "active" | "done" | "cancelled";

const FILTERS: { key: FilterKey; label: string; statuses: OrderStatus[] }[] = [
  { key: "all",       label: "Todos",        statuses: [] },
  { key: "pending",   label: "Aguardando",   statuses: ["pending_payment"] },
  { key: "active",    label: "Em andamento", statuses: ["paid", "processing", "shipped"] },
  { key: "done",      label: "Entregue",     statuses: ["delivered"] },
  { key: "cancelled", label: "Cancelado",    statuses: ["cancelled", "refunded"] },
];

function formatPrice(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function shortId(id: string) {
  const parts = id.split("-");
  return `#${parts[1] ?? id}`;
}

// ─── SaleDetailModal ──────────────────────────────────────────────────────────

function SaleDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const Colors = useColors();
  const { updateOrderStatus } = useSales();
  const { sendPush } = useNotifications();
  const status    = STATUS_CONFIG[order.status];
  const nextStep  = NEXT_STATUS[order.status];
  const [updating, setUpdating] = useState(false);

  const handleAdvance = () => {
    if (!nextStep) return;
    Alert.alert(
      nextStep.label,
      `Deseja avançar o pedido ${shortId(order.id)} para "${STATUS_CONFIG[nextStep.status].label}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setUpdating(true);
            try {
              const { buyerId } = await updateOrderStatus(order.id, nextStep.status);
              const statusLabel = STATUS_CONFIG[nextStep.status].label;
              await sendPush({
                toUserId: buyerId,
                title: "📦 Pedido atualizado",
                body: `Seu pedido ${shortId(order.id)} está agora: ${statusLabel}.`,
                data: { orderId: order.id },
              });
              onClose();
            } catch {
              Alert.alert("Erro", "Não foi possível atualizar o status.");
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

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
              Detalhes da Venda
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 1 }}>
              {shortId(order.id)} · {formatDate(order.createdAt)}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

          {/* Status atual */}
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
              <Text style={{ color: status.color + "99", fontSize: 12, marginTop: 2 }}>
                Status atual do pedido
              </Text>
            </View>
          </View>

          {/* Progresso visual */}
          <View style={{
            backgroundColor: Colors.bgCard, borderRadius: 14,
            borderWidth: 1, borderColor: Colors.bgBorder, padding: 14,
          }}>
            <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
              Progresso do Pedido
            </Text>
            {(["paid", "processing", "shipped", "delivered"] as OrderStatus[]).map((s, i, arr) => {
              const cfg = STATUS_CONFIG[s];
              const isReached = ["paid", "processing", "shipped", "delivered"].indexOf(order.status) >= i
                || order.status === s;
              const isDone = ["paid", "processing", "shipped", "delivered"].indexOf(order.status) > i;
              return (
                <View key={s} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  {/* Line + dot */}
                  <View style={{ alignItems: "center", width: 20 }}>
                    <View style={{
                      width: 20, height: 20, borderRadius: 10,
                      backgroundColor: isReached ? cfg.color : Colors.bgBorder,
                      alignItems: "center", justifyContent: "center",
                    }}>
                      {isDone
                        ? <Ionicons name="checkmark" size={12} color={Colors.bg} />
                        : isReached
                          ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.bg }} />
                          : null
                      }
                    </View>
                    {i < arr.length - 1 && (
                      <View style={{ width: 2, height: 24, backgroundColor: isReached ? cfg.color + "66" : Colors.bgBorder, marginTop: 2 }} />
                    )}
                  </View>
                  <Text style={{
                    color: isReached ? Colors.white : Colors.textMuted,
                    fontSize: 13, fontWeight: isReached ? "700" : "400",
                    paddingBottom: i < arr.length - 1 ? 24 : 0,
                  }}>
                    {cfg.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Itens da venda (apenas os do vendedor) */}
          <View style={{
            backgroundColor: Colors.bgCard, borderRadius: 14,
            borderWidth: 1, borderColor: Colors.bgBorder, padding: 14, gap: 10,
          }}>
            <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Itens Vendidos
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
                  <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>
                    {item.type === "digital" ? "Digital" : "Físico"} · {item.quantity}x
                  </Text>
                </View>
                <Text style={{ color: Colors.cyan, fontSize: 13, fontWeight: "700" }}>
                  {formatPrice(item.unitPrice * item.quantity)}
                </Text>
              </View>
            ))}
          </View>

          {/* Endereço de entrega */}
          {order.shippingAddress && (
            <View style={{
              backgroundColor: Colors.bgCard, borderRadius: 14,
              borderWidth: 1, borderColor: Colors.bgBorder, padding: 14, gap: 6,
            }}>
              <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                Endereço de Entrega
              </Text>
              <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "600" }}>
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
              {order.shippingAddress.phone && (
                <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                  Tel: {order.shippingAddress.phone}
                </Text>
              )}
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

          {/* Total */}
          <View style={{
            backgroundColor: Colors.bgCard, borderRadius: 14,
            borderWidth: 1, borderColor: Colors.bgBorder, padding: 14, gap: 8,
          }}>
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
        </ScrollView>

        {/* Botão avançar status */}
        {nextStep && (
          <View style={{
            paddingHorizontal: 16, paddingVertical: 12,
            borderTopWidth: 1, borderTopColor: Colors.bgBorder,
            backgroundColor: Colors.bgCard,
          }}>
            <TouchableOpacity
              onPress={handleAdvance}
              disabled={updating}
              activeOpacity={0.85}
              style={{
                backgroundColor: nextStep.color,
                borderRadius: 14, paddingVertical: 15,
                alignItems: "center", justifyContent: "center",
                flexDirection: "row", gap: 8,
                opacity: updating ? 0.7 : 1,
              }}
            >
              {updating
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Ionicons name="arrow-forward-circle-outline" size={18} color="#fff" />
                    <Text style={{ color: "#fff", fontSize: 15, fontWeight: "900" }}>{nextStep.label}</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── SaleCard ─────────────────────────────────────────────────────────────────

function SaleCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const Colors = useColors();
  const status = STATUS_CONFIG[order.status];
  const thumbs = order.items.slice(0, 3).map((i) => i.imageUrl).filter(Boolean) as string[];
  const extra  = order.items.length - 3;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: Colors.bgCard,
        borderRadius: 14, borderWidth: 1, borderColor: Colors.bgBorder,
        padding: 14, gap: 10,
      }}
    >
      {/* Top: ID + date + status */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: "700", flex: 1 }}>
          {shortId(order.id)}
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{formatDate(order.createdAt)}</Text>
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 4,
          backgroundColor: status.color + "22", borderRadius: 6,
          paddingHorizontal: 7, paddingVertical: 3,
          borderWidth: 1, borderColor: status.color + "44",
        }}>
          <Ionicons name={status.icon as any} size={11} color={status.color} />
          <Text style={{ color: status.color, fontSize: 10, fontWeight: "800" }}>{status.label}</Text>
        </View>
      </View>

      {/* Thumbnails + titles */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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

      {/* Bottom: total + next action hint */}
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        borderTopWidth: 1, borderTopColor: Colors.bgBorder, paddingTop: 10,
      }}>
        <Text style={{ color: Colors.cyan, fontSize: 15, fontWeight: "900" }}>
          {formatPrice(order.total)}
        </Text>
        {NEXT_STATUS[order.status] && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ color: Colors.orange, fontSize: 12, fontWeight: "700" }}>Ação necessária</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.orange} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── MySalesScreen ────────────────────────────────────────────────────────────

interface MySalesScreenProps {
  visible: boolean;
  onClose: () => void;
}

export function MySalesScreen({ visible, onClose }: MySalesScreenProps) {
  const Colors = useColors();
  const { sales, loading, fetchSales } = useSales();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedSale, setSelectedSale] = useState<Order | null>(null);

  useEffect(() => {
    if (visible) fetchSales();
  }, [visible]);

  const filtered = activeFilter === "all"
    ? sales
    : sales.filter((o) => {
        const f = FILTERS.find((f) => f.key === activeFilter);
        return f ? f.statuses.includes(o.status) : true;
      });

  const totalRevenue = sales
    .filter((o) => !["cancelled", "refunded"].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);

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
            <Text style={{ color: Colors.white, fontSize: 18, fontWeight: "800" }}>Minhas Vendas</Text>
            {sales.length > 0 && (
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 1 }}>
                {sales.length} {sales.length === 1 ? "venda" : "vendas"} · {formatPrice(totalRevenue)} em receita
              </Text>
            )}
          </View>
        </View>

        {/* Filtros */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
          style={{ borderBottomWidth: 1, borderBottomColor: Colors.bgBorder, flexGrow: 0 }}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            const count  = f.key === "all"
              ? sales.length
              : sales.filter((o) => f.statuses.includes(o.status)).length;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                  backgroundColor: active ? Colors.success : Colors.bgCard,
                  borderWidth: 1, borderColor: active ? Colors.success : Colors.bgBorder,
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
        {loading && sales.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
            <ActivityIndicator size="large" color={Colors.success} />
            <Text style={{ color: Colors.textMuted, fontSize: 14 }}>Carregando vendas...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 16 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.bgBorder,
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="trending-up-outline" size={36} color={Colors.textMuted} />
            </View>
            <Text style={{ color: Colors.white, fontSize: 17, fontWeight: "800", textAlign: "center" }}>
              {activeFilter === "all" ? "Nenhuma venda ainda" : "Nenhuma venda nessa categoria"}
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              {activeFilter === "all"
                ? "Suas vendas aparecerão aqui quando alguém comprar seus produtos."
                : "Tente outro filtro para encontrar suas vendas."}
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={fetchSales} tintColor={Colors.success} />
            }
          >
            {filtered.map((sale) => (
              <SaleCard key={sale.id} order={sale} onPress={() => setSelectedSale(sale)} />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      {selectedSale && (
        <SaleDetailModal
          order={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </Modal>
  );
}
