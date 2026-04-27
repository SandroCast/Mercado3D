import React, { useEffect, useState } from "react";
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../contexts/ThemeContext";
import { useNotifications, AppNotification } from "../contexts/NotificationsContext";
import { PendingQuestionsScreen } from "./PendingQuestionsScreen";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  const h    = Math.floor(diff / 3600000);
  const d    = Math.floor(diff / 86400000);
  if (min < 1)  return "agora";
  if (min < 60) return `${min}min atrás`;
  if (h < 24)   return `${h}h atrás`;
  if (d < 7)    return `${d}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function iconFromTitle(title: string): { name: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap; color: string } {
  if (title.includes("venda") || title.includes("🛒")) return { name: "bag-check-outline",           color: "#22c55e" };
  if (title.includes("pedido") || title.includes("📦")) return { name: "cube-outline",               color: "#06b6d4" };
  if (title.includes("pergunta") || title.includes("❓")) return { name: "help-circle-outline",      color: "#f59e0b" };
  if (title.includes("respondida") || title.includes("💬")) return { name: "chatbubble-outline",     color: "#7c3aed" };
  return { name: "notifications-outline", color: "#94a3b8" };
}

// ─── NotificationRow ──────────────────────────────────────────────────────────

function NotificationRow({ item, onPress, hasAction }: { item: AppNotification; onPress: () => void; hasAction: boolean }) {
  const Colors = useColors();
  const { name: iconName, color } = iconFromTitle(item.title);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        backgroundColor: item.read ? "transparent" : color + "11",
      }}
    >
      {/* Ícone */}
      <View style={{
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: color + "22",
        alignItems: "center", justifyContent: "center",
        marginTop: 2,
      }}>
        <Ionicons name={iconName} size={20} color={color} />
      </View>

      {/* Texto */}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: Colors.white, fontSize: 14, fontWeight: item.read ? "500" : "700" }}>
          {item.title}
        </Text>
        <Text style={{ color: Colors.textGray, fontSize: 13, lineHeight: 18 }}>
          {item.body}
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>
          {timeAgo(item.createdAt)}
        </Text>
      </View>

      {/* Indicador direito */}
      <View style={{ alignItems: "center", justifyContent: "center", gap: 4 }}>
        {!item.read && (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        )}
        {hasAction && (
          <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────

type NotificationAction = "questions" | "orders" | null;

function resolveAction(n: AppNotification): NotificationAction {
  const title = n.title.toLowerCase();
  const data = n.data as Record<string, unknown>;
  if (title.includes("pergunta") || data?.type === "question") return "questions";
  if (title.includes("venda") || title.includes("pedido") || data?.orderId) return "orders";
  return null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenOrders?: () => void;
}

export function NotificationsScreen({ visible, onClose, onOpenOrders }: Props) {
  const Colors = useColors();
  const { notifications, loading, unreadCount, fetchNotifications, markRead, markAllRead } = useNotifications();
  const [pendingQuestionsVisible, setPendingQuestionsVisible] = useState(false);

  useEffect(() => {
    if (visible) fetchNotifications();
  }, [visible]);

  const handlePress = (item: AppNotification) => {
    if (!item.read) markRead(item.id);
    const action = resolveAction(item);
    if (action === "questions") {
      setPendingQuestionsVisible(true);
    } else if (action === "orders") {
      onClose();
      onOpenOrders?.();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top", "bottom"]}>

        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: 16, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: Colors.bgBorder,
          gap: 12,
        }}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={{ flex: 1, color: Colors.white, fontSize: 18, fontWeight: "800" }}>
            Notificações
            {unreadCount > 0 && (
              <Text style={{ color: Colors.cyan, fontSize: 14, fontWeight: "600" }}>
                {" "}({unreadCount})
              </Text>
            )}
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} hitSlop={8}>
              <Text style={{ color: Colors.cyan, fontSize: 13, fontWeight: "700" }}>
                Marcar tudo
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Conteúdo */}
        {loading && notifications.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={Colors.cyan} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: Colors.bgCard,
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="notifications-off-outline" size={34} color={Colors.textMuted} />
            </View>
            <Text style={{ color: Colors.textMuted, fontSize: 15, textAlign: "center", lineHeight: 22 }}>
              Nenhuma notificação ainda.{"\n"}Elas aparecerão aqui quando houver novidades.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={fetchNotifications}
                tintColor={Colors.cyan}
              />
            }
          >
            {notifications.map((item, index) => (
              <View key={item.id}>
                <NotificationRow
                  item={item}
                  onPress={() => handlePress(item)}
                  hasAction={resolveAction(item) !== null}
                />
                {index < notifications.length - 1 && (
                  <View style={{ height: 1, backgroundColor: Colors.bgBorder, marginLeft: 68 }} />
                )}
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>

      <PendingQuestionsScreen
        visible={pendingQuestionsVisible}
        onClose={() => setPendingQuestionsVisible(false)}
      />
    </Modal>
  );
}
