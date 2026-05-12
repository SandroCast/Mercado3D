import React from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Image, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useConversations, ConversationSummary } from "../contexts/ConversationsContext";

function timeLabel(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffH < 1) return "agora";
  if (diffH < 24) return `${diffH}h`;
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

interface ConversationsListScreenProps {
  onOpenConversation: (conv: ConversationSummary) => void;
  onLoginRequired?: () => void;
}

export function ConversationsListScreen({ onOpenConversation, onLoginRequired }: ConversationsListScreenProps) {
  const Colors = useColors();
  const { session } = useAuth();
  const { conversations, loading, refresh } = useConversations();

  const Header = (
    <View style={{
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: Colors.bgBorder,
      backgroundColor: Colors.bgCard,
      flexDirection: "row", alignItems: "center",
    }}>
      <Text style={{ flex: 1, color: Colors.white, fontSize: 16, fontWeight: "800" }}>Conversas</Text>
      {conversations.length > 0 && (
        <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
          {conversations.length} conversa{conversations.length !== 1 ? "s" : ""}
        </Text>
      )}
    </View>
  );

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        {Header}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: Colors.bgCard,
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="chatbubble-ellipses-outline" size={34} color={Colors.textMuted} />
          </View>
          <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "700" }}>Suas conversas</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
            Entre para ver suas conversas com vendedores e compradores.
          </Text>
          <TouchableOpacity
            onPress={onLoginRequired}
            style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.cyan }}
          >
            <Text style={{ color: Colors.bg, fontSize: 14, fontWeight: "700" }}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {Header}
      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.cyan} />}
        contentContainerStyle={conversations.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
        renderItem={({ item: conv }) => {
          const initial = conv.otherName.charAt(0).toUpperCase();
          return (
            <TouchableOpacity
              onPress={() => onOpenConversation(conv)}
              activeOpacity={0.75}
              style={{
                flexDirection: "row", alignItems: "center",
                paddingHorizontal: 16, paddingVertical: 14,
                borderBottomWidth: 1, borderBottomColor: Colors.bgBorder,
                gap: 12,
              }}
            >
              <View style={{
                width: 48, height: 48, borderRadius: 24,
                backgroundColor: Colors.purple + "33",
                alignItems: "center", justifyContent: "center",
                overflow: "hidden",
                borderWidth: 1.5, borderColor: Colors.purple + "66",
              }}>
                {conv.otherAvatar ? (
                  <Image source={{ uri: conv.otherAvatar }} style={{ width: 48, height: 48 }} />
                ) : (
                  <Text style={{ color: Colors.purple, fontSize: 18, fontWeight: "800" }}>{initial}</Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <Text
                    style={{ flex: 1, color: Colors.white, fontSize: 15, fontWeight: conv.unreadCount > 0 ? "800" : "600" }}
                    numberOfLines={1}
                  >
                    {conv.otherName}
                  </Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{timeLabel(conv.lastMessageAt)}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    style={{
                      flex: 1,
                      color: conv.unreadCount > 0 ? Colors.white : Colors.textMuted,
                      fontSize: 13,
                      fontWeight: conv.unreadCount > 0 ? "600" : "400",
                    }}
                    numberOfLines={1}
                  >
                    {conv.lastMessage ?? "Inicie uma conversa"}
                  </Text>
                  {conv.unreadCount > 0 && (
                    <View style={{
                      minWidth: 20, height: 20, borderRadius: 10,
                      backgroundColor: Colors.cyan,
                      alignItems: "center", justifyContent: "center",
                      paddingHorizontal: 5,
                    }}>
                      <Text style={{ color: Colors.bg, fontSize: 11, fontWeight: "800" }}>
                        {conv.unreadCount > 99 ? "99+" : String(conv.unreadCount)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={Colors.cyan} />
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 }}>
              <View style={{
                width: 72, height: 72, borderRadius: 36,
                backgroundColor: Colors.bgCard,
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="chatbubble-ellipses-outline" size={34} color={Colors.textMuted} />
              </View>
              <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "700" }}>Nenhuma conversa</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
                Inicie uma conversa pelo perfil de um vendedor ou página de produto.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}
