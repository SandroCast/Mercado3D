import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useConversations, ConversationSummary } from "../contexts/ConversationsContext";
import { supabase } from "../lib/supabase";

interface DM {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt?: string;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  if (diffH < 24) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

interface ConversationScreenProps {
  conversation: ConversationSummary | null;
  onClose: () => void;
}

export function ConversationScreen({ conversation, onClose }: ConversationScreenProps) {
  const Colors = useColors();
  const { user } = useAuth();
  const { markRead } = useConversations();

  const [messages, setMessages] = useState<DM[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const convId = conversation?.id;

  const loadMessages = useCallback(async () => {
    if (!convId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("conversation_messages")
        .select("id, sender_id, content, created_at, read_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: false })
        .limit(100);

      setMessages(
        (data ?? []).map((r: any) => ({
          id: r.id,
          senderId: r.sender_id,
          content: r.content,
          createdAt: r.created_at,
          readAt: r.read_at ?? undefined,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [convId]);

  useEffect(() => {
    if (!convId) return;
    loadMessages();
    markRead(convId);

    const channel = supabase
      .channel(`conv:${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const row = payload.new as any;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [{ id: row.id, senderId: row.sender_id, content: row.content, createdAt: row.created_at }, ...prev];
          });
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
          if (row.sender_id !== user?.id) markRead(convId);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [convId, loadMessages, markRead, user]);

  const handleSend = async () => {
    const t = text.trim();
    if (!t || sending || !user || !convId) return;
    setSending(true);
    setText("");
    try {
      await supabase.from("conversation_messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        content: t,
      });
      await supabase
        .from("conversations")
        .update({ last_message: t, last_message_at: new Date().toISOString() })
        .eq("id", convId);
    } catch (err) {
      console.warn("send DM error:", err);
      setText(t);
    } finally {
      setSending(false);
    }
  };

  if (!conversation) return null;

  const initial = conversation.otherName.charAt(0).toUpperCase();

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: 12, paddingVertical: 10,
          borderBottomWidth: 1, borderBottomColor: Colors.bgBorder,
          backgroundColor: Colors.bgCard, gap: 10,
        }}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>

          <View style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: Colors.purple + "33",
            alignItems: "center", justifyContent: "center",
            overflow: "hidden", borderWidth: 1.5, borderColor: Colors.purple,
          }}>
            {conversation.otherAvatar ? (
              <Image source={{ uri: conversation.otherAvatar }} style={{ width: 38, height: 38 }} />
            ) : (
              <Text style={{ color: Colors.purple, fontSize: 16, fontWeight: "800" }}>{initial}</Text>
            )}
          </View>

          <Text style={{ flex: 1, color: Colors.white, fontSize: 16, fontWeight: "700" }} numberOfLines={1}>
            {conversation.otherName}
          </Text>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={Colors.cyan} />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              inverted
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 8 }}
              renderItem={({ item: msg }) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <View style={{
                    flexDirection: isMe ? "row-reverse" : "row",
                    alignItems: "flex-end",
                    marginBottom: 4,
                  }}>
                    <View style={{ maxWidth: "80%" }}>
                      <View style={{
                        backgroundColor: isMe ? Colors.cyan : Colors.bgCard,
                        borderRadius: 16,
                        borderBottomRightRadius: isMe ? 4 : 16,
                        borderBottomLeftRadius: isMe ? 16 : 4,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderWidth: isMe ? 0 : 1,
                        borderColor: Colors.bgBorder,
                      }}>
                        <Text style={{ color: isMe ? Colors.bg : Colors.white, fontSize: 14, lineHeight: 20 }}>
                          {msg.content}
                        </Text>
                      </View>
                      <Text style={{
                        color: Colors.textMuted, fontSize: 10, marginTop: 2,
                        textAlign: isMe ? "right" : "left",
                        marginHorizontal: 4,
                      }}>
                        {timeLabel(msg.createdAt)}{isMe && msg.readAt ? "  ✓✓" : ""}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", paddingVertical: 60, gap: 12 }}>
                  <Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.textMuted} />
                  <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "700" }}>
                    Inicie a conversa
                  </Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center" }}>
                    Envie uma mensagem para {conversation.otherName}.
                  </Text>
                </View>
              }
            />
          )}

          {/* Input */}
          <View style={{
            flexDirection: "row", alignItems: "flex-end", gap: 8,
            paddingHorizontal: 12, paddingVertical: 10,
            borderTopWidth: 1, borderTopColor: Colors.bgBorder,
            backgroundColor: Colors.bgCard,
          }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Mensagem..."
              placeholderTextColor={Colors.textMuted}
              style={{
                flex: 1, color: Colors.white, fontSize: 14,
                backgroundColor: Colors.bg,
                borderRadius: 20, borderWidth: 1, borderColor: Colors.bgBorder,
                paddingHorizontal: 14, paddingVertical: 10,
                maxHeight: 120,
              }}
              multiline
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: text.trim() ? Colors.cyan : Colors.bgBorder,
                alignItems: "center", justifyContent: "center",
              }}
            >
              {sending
                ? <ActivityIndicator size="small" color={Colors.bg} />
                : <Ionicons name="send" size={18} color={Colors.bg} />
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
