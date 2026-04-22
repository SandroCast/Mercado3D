import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  sendPush: (params: {
    toUserId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

async function registerToken(userId: string) {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    const finalStatus =
      existing === "granted"
        ? existing
        : (await Notifications.requestPermissionsAsync()).status;

    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    const platform = Platform.OS === "ios" ? "ios" : "android";

    await supabase.from("push_tokens").upsert(
      { user_id: userId, token, platform, updated_at: new Date().toISOString() },
      { onConflict: "user_id,token" }
    );
  } catch (err) {
    console.warn("registerToken error:", err);
  }
}

function rowToNotification(r: Record<string, unknown>): AppNotification {
  return {
    id: r.id as string,
    title: r.title as string,
    body: r.body as string,
    data: (r.data ?? {}) as Record<string, unknown>,
    read: r.read as boolean,
    createdAt: r.created_at as string,
  };
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) return;
    registerToken(user.id);
    fetchNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener((_n) => {
      fetchNotifications();
    });
    responseListener.current = Notifications.addNotificationResponseReceivedListener((_r) => {});

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data ?? []).map((r) => rowToNotification(r as Record<string, unknown>)));
    } catch (err) {
      console.warn("fetchNotifications error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [user]);

  async function sendPush({
    toUserId,
    title,
    body,
    data = {},
  }: {
    toUserId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    try {
      await supabase.functions.invoke("send-push", {
        body: { toUserId, title, body, data },
      });
      // If sending to self, refresh immediately
      if (toUserId === user?.id) fetchNotifications();
    } catch (err) {
      console.warn("sendPush error:", err);
    }
  }

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead, sendPush }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
