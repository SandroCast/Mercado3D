import React, { createContext, useContext, useEffect, useRef } from "react";
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

interface NotificationsContextValue {
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

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!user) return;
    registerToken(user.id);

    notificationListener.current = Notifications.addNotificationReceivedListener((_n) => {});
    responseListener.current = Notifications.addNotificationResponseReceivedListener((_r) => {});

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
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
    } catch (err) {
      console.warn("sendPush error:", err);
    }
  }

  return (
    <NotificationsContext.Provider value={{ sendPush }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
