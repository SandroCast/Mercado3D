import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useNotifications } from "../contexts/NotificationsContext";

interface HeaderProps {
  onCartPress?: () => void;
  onProfilePress?: () => void;
  onNotificationsPress?: () => void;
}

export function Header({ onCartPress, onProfilePress, onNotificationsPress }: HeaderProps) {
  const Colors = useColors();
  const { user } = useAuth();
  const { totalItems: cartCount } = useCart();
  const { unreadCount } = useNotifications();

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName: string = user?.user_metadata?.full_name ?? user?.email ?? "";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View style={{ backgroundColor: Colors.bgCard, borderBottomColor: Colors.bgBorder, borderBottomWidth: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgCard} />

      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 10 }}>
        {/* Logo */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
          <View style={{ backgroundColor: Colors.cyan, borderRadius: 6, width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: Colors.bg, fontSize: 11, fontWeight: "900" }}>3D</Text>
          </View>
          <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "800", letterSpacing: -0.5 }}>
            MERCADO<Text style={{ color: Colors.cyan }}>3D</Text>
          </Text>
        </View>

        {/* Notificações — apenas para usuários logados */}
        {!!user && (
          <TouchableOpacity onPress={onNotificationsPress} activeOpacity={0.7} style={{ padding: 6, position: "relative" }}>
            <Ionicons name="notifications-outline" size={22} color={Colors.textGray} />
            {unreadCount > 0 && (
              <View style={{ position: "absolute", top: 2, right: 2, backgroundColor: Colors.cyan, borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: Colors.bg, fontSize: 9, fontWeight: "700" }}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Cart — apenas para usuários logados */}
        {!!user && (
          <TouchableOpacity onPress={onCartPress} activeOpacity={0.7} style={{ padding: 6, position: "relative" }}>
            <Ionicons name="cart-outline" size={22} color={Colors.textGray} />
            {cartCount > 0 && (
              <View style={{ position: "absolute", top: 2, right: 2, backgroundColor: Colors.orange, borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Perfil */}
        <TouchableOpacity onPress={onProfilePress} activeOpacity={0.7} style={{ padding: 4 }}>
          {!user ? (
            <Ionicons name="log-in-outline" size={26} color={Colors.textGray} />
          ) : avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: Colors.cyan }}
            />
          ) : (
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.cyan, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: Colors.bg, fontSize: 13, fontWeight: "800" }}>{initial}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
