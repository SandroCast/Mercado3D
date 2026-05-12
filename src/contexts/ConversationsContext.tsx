import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export interface ConversationSummary {
  id: string;
  otherId: string;
  otherName: string;
  otherAvatar?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

interface ConversationsContextValue {
  conversations: ConversationSummary[];
  loading: boolean;
  totalUnread: number;
  openOrCreate: (otherId: string, otherName: string, otherAvatar?: string) => Promise<ConversationSummary>;
  refresh: () => Promise<void>;
  markRead: (conversationId: string) => Promise<void>;
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

export function useConversations() {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error("useConversations must be used within ConversationsProvider");
  return ctx;
}

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: convData } = await supabase
        .from("conversations")
        .select("id, user1_id, user2_id, last_message, last_message_at")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (!convData?.length) {
        setConversations([]);
        return;
      }

      const otherIds = convData.map((c) =>
        c.user1_id === user.id ? c.user2_id : c.user1_id
      );

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", otherIds);

      const pm: Record<string, { full_name?: string; avatar_url?: string }> =
        Object.fromEntries((profileData ?? []).map((p: any) => [p.id, p]));

      const summaries = await Promise.all(
        convData.map(async (conv) => {
          const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
          const p = pm[otherId] ?? {};

          const { count } = await supabase
            .from("conversation_messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("sender_id", otherId)
            .is("read_at", null);

          return {
            id: conv.id,
            otherId,
            otherName: (p as any).full_name ?? "Usuário",
            otherAvatar: (p as any).avatar_url ?? undefined,
            lastMessage: conv.last_message ?? undefined,
            lastMessageAt: conv.last_message_at ?? undefined,
            unreadCount: count ?? 0,
          } as ConversationSummary;
        })
      );

      setConversations(summaries);
    } catch (err) {
      console.warn("ConversationsContext fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }
    fetch();

    const channel = supabase
      .channel(`conversations-ctx:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, fetch)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_messages" }, fetch)
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [user, fetch]);

  const openOrCreate = useCallback(
    async (otherId: string, otherName: string, otherAvatar?: string): Promise<ConversationSummary> => {
      if (!user) throw new Error("Not authenticated");

      const [u1, u2] = user.id < otherId ? [user.id, otherId] : [otherId, user.id];

      const { data: existing } = await supabase
        .from("conversations")
        .select("id, last_message, last_message_at")
        .eq("user1_id", u1)
        .eq("user2_id", u2)
        .maybeSingle();

      if (existing) {
        return {
          id: existing.id,
          otherId,
          otherName,
          otherAvatar,
          lastMessage: existing.last_message ?? undefined,
          lastMessageAt: existing.last_message_at ?? undefined,
          unreadCount: 0,
        };
      }

      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ user1_id: u1, user2_id: u2 })
        .select()
        .single();

      if (error || !created) throw error ?? new Error("Failed to create conversation");

      fetch();
      return {
        id: created.id,
        otherId,
        otherName,
        otherAvatar,
        lastMessage: undefined,
        lastMessageAt: undefined,
        unreadCount: 0,
      };
    },
    [user, fetch]
  );

  const markRead = useCallback(
    async (conversationId: string) => {
      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv || !user) return;

      await supabase
        .from("conversation_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("sender_id", conv.otherId)
        .is("read_at", null);

      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );
    },
    [user, conversations]
  );

  return (
    <ConversationsContext.Provider
      value={{
        conversations,
        loading,
        totalUnread: conversations.reduce((s, c) => s + c.unreadCount, 0),
        openOrCreate,
        refresh: fetch,
        markRead,
      }}
    >
      {children}
    </ConversationsContext.Provider>
  );
}
