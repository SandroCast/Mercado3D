import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { ConfirmModal } from "../components/ConfirmModal";
import { VerifyEmailModal } from "../components/VerifyEmailModal";
import { EditProfileScreen } from "./EditProfileScreen";
import { AddressesScreen } from "./AddressesScreen";
import { OrdersScreen } from "./OrdersScreen";
import { MyListingsScreen } from "./MyListingsScreen";
import { MyDigitalFilesScreen } from "./MyDigitalFilesScreen";
import { MySalesScreen } from "./MySalesScreen";
import { NotificationsScreen } from "./NotificationsScreen";
import { useNotifications } from "../contexts/NotificationsContext";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  badge?: string;
  onPress?: () => void;
}

interface Section {
  title: string;
  items: MenuItem[];
}

// ─── Dados ───────────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    title: "Minhas Atividades",
    items: [
      { icon: "bag-handle-outline",   label: "Minhas Compras",    color: "#22d3ee", badge: "3" },
      { icon: "cube-outline",         label: "Meus Arquivos STL", color: "#7c3aed" },
      { icon: "trending-up-outline",  label: "Minhas Vendas",     color: "#22c55e" },
      { icon: "megaphone-outline",    label: "Meus Anúncios",     color: "#f97316" },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { icon: "bar-chart-outline",    label: "Faturamento",           color: "#22c55e" },
      { icon: "wallet-outline",       label: "Carteira & Saldo",      color: "#22d3ee" },
      { icon: "card-outline",         label: "Métodos de Pagamento",  color: "#3b82f6" },
    ],
  },
  {
    title: "Minha Conta",
    items: [
      { icon: "person-outline",           label: "Dados Pessoais",          color: "#22d3ee" },
      { icon: "location-outline",         label: "Endereços",               color: "#f97316" },
      { icon: "shield-checkmark-outline", label: "Segurança",               color: "#22c55e" },
      { icon: "notifications-outline",    label: "Notificações",            color: "#f59e0b" },
      { icon: "settings-outline",         label: "Configurações",           color: "#94a3b8" },
    ],
  },
  {
    title: "Suporte",
    items: [
      { icon: "help-circle-outline",   label: "Central de Ajuda",        color: "#3b82f6" },
      { icon: "chatbubble-outline",    label: "Fale Conosco",            color: "#22d3ee" },
      { icon: "star-outline",          label: "Avalie o App",            color: "#f59e0b" },
      { icon: "document-text-outline", label: "Termos de Uso",           color: "#94a3b8" },
      { icon: "lock-closed-outline",   label: "Política de Privacidade", color: "#94a3b8" },
    ],
  },
];

// ─── Componentes internos ─────────────────────────────────────────────────────

function MenuItemRow({ item }: { item: MenuItem }) {
  const Colors = useColors();
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={item.onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 13,
        paddingHorizontal: 16,
        gap: 14,
      }}
    >
      {/* Ícone colorido */}
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: item.color + "22",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Ionicons name={item.icon} size={19} color={item.color} />
      </View>

      {/* Label */}
      <Text style={{ flex: 1, color: Colors.white, fontSize: 14, fontWeight: "500" }}>
        {item.label}
      </Text>

      {/* Badge opcional */}
      {item.badge && (
        <View style={{
          backgroundColor: Colors.cyan,
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 5,
        }}>
          <Text style={{ color: Colors.bg, fontSize: 11, fontWeight: "800" }}>{item.badge}</Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

function SectionBlock({ section }: { section: Section }) {
  const Colors = useColors();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{
        color: Colors.textMuted,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        paddingHorizontal: 16,
        marginBottom: 4,
      }}>
        {section.title}
      </Text>

      <View style={{
        backgroundColor: Colors.bgCard,
        borderRadius: 14,
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: Colors.bgBorder,
        overflow: "hidden",
      }}>
        {section.items.map((item, index) => (
          <View key={item.label}>
            <MenuItemRow item={item} />
            {index < section.items.length - 1 && (
              <View style={{ height: 1, backgroundColor: Colors.bgBorder, marginLeft: 66 }} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export function MoreScreen() {
  const Colors = useColors();
  const { isDark, toggleTheme } = useTheme();
  const { user, signOut, emailConfirmed } = useAuth();
  const { unreadCount } = useNotifications();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [addressesVisible,   setAddressesVisible]   = useState(false);
  const [ordersVisible,      setOrdersVisible]      = useState(false);
  const [listingsVisible,    setListingsVisible]    = useState(false);
  const [digitalFilesVisible, setDigitalFilesVisible] = useState(false);
  const [salesVisible,       setSalesVisible]       = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  const sections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (item.label === "Endereços")        return { ...item, onPress: () => setAddressesVisible(true) };
      if (item.label === "Minhas Compras")   return { ...item, onPress: () => setOrdersVisible(true) };
      if (item.label === "Meus Arquivos STL") return { ...item, onPress: () => setDigitalFilesVisible(true) };
      if (item.label === "Minhas Vendas")    return { ...item, onPress: () => setSalesVisible(true) };
      if (item.label === "Meus Anúncios")    return { ...item, onPress: () => setListingsVisible(true) };
      if (item.label === "Notificações")     return { ...item, onPress: () => setNotificationsVisible(true), badge: unreadCount > 0 ? String(unreadCount) : undefined };
      return item;
    }),
  }));

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName: string = user?.user_metadata?.full_name ?? user?.email ?? "";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header do usuário */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 24,
        }}>
          {/* Avatar */}
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                borderWidth: 2,
                borderColor: Colors.cyan,
              }}
            />
          ) : (
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: Colors.cyan,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: Colors.cyan,
            }}>
              <Text style={{ color: Colors.bg, fontSize: 22, fontWeight: "800" }}>{initial}</Text>
            </View>
          )}

          {/* Infos */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.white, fontSize: 17, fontWeight: "800" }} numberOfLines={1}>
              {displayName || "Usuário"}
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
              {user?.email ?? ""}
            </Text>
            <TouchableOpacity activeOpacity={0.7} style={{ marginTop: 6 }} onPress={() => setEditProfileVisible(true)}>
              <Text style={{ color: Colors.cyan, fontSize: 12, fontWeight: "700" }}>
                Editar perfil
              </Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* Card de verificação de e-mail */}
        {!emailConfirmed && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setVerifyModalVisible(true)}
            style={{
              marginHorizontal: 16,
              marginBottom: 16,
              borderRadius: 14,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "#92400e",
            }}
          >
            <View style={{
              backgroundColor: "#78350f",
              flexDirection: "row",
              alignItems: "center",
              padding: 14,
              gap: 12,
            }}>
              {/* Ícone */}
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: "#92400e",
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="mail-unread-outline" size={20} color="#fbbf24" />
              </View>

              {/* Texto */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fde68a", fontSize: 13, fontWeight: "700", marginBottom: 2 }}>
                  E-mail não verificado
                </Text>
                <Text style={{ color: "#fcd34d", fontSize: 12, opacity: 0.8 }}>
                  Confirme seu e-mail para proteger sua conta
                </Text>
              </View>

              {/* Botão */}
              <View style={{
                backgroundColor: "#f59e0b",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}>
                <Text style={{ color: "#1c1917", fontSize: 12, fontWeight: "800" }}>Verificar</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Toggle tema */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          marginHorizontal: 16,
          marginBottom: 16,
          backgroundColor: Colors.bgCard,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: Colors.bgBorder,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
          <View style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: (isDark ? Colors.cyan : Colors.orange) + "22",
            alignItems: "center", justifyContent: "center", marginRight: 14,
          }}>
            <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={19} color={isDark ? Colors.cyan : Colors.orange} />
          </View>
          <Text style={{ flex: 1, color: Colors.white, fontSize: 14, fontWeight: "500" }}>
            {isDark ? "Tema Escuro" : "Tema Claro"}
          </Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: Colors.bgBorder, true: Colors.cyan + "88" }}
            thumbColor={isDark ? Colors.cyan : Colors.textGray}
          />
        </View>

        {/* Seções */}
        {sections.map((section) => (
          <SectionBlock key={section.title} section={section} />
        ))}

        {/* Botão sair */}
        <TouchableOpacity
          onPress={() => setLogoutModalVisible(true)}
          activeOpacity={0.8}
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            paddingVertical: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#ef444433",
            backgroundColor: "#ef444411",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={Colors.error} />
          <Text style={{ color: Colors.error, fontSize: 14, fontWeight: "700" }}>Sair da Conta</Text>
        </TouchableOpacity>

        {/* Versão */}
        <Text style={{ color: Colors.textMuted, fontSize: 11, textAlign: "center", marginTop: 20 }}>
          Mercado3D v1.0.0
        </Text>

      </ScrollView>

      <ConfirmModal
        visible={logoutModalVisible}
        icon="log-out-outline"
        title="Sair da conta"
        message="Tem certeza que deseja sair? Você precisará fazer login novamente para acessar sua conta."
        confirmLabel="Sair"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => {
          setLogoutModalVisible(false);
          signOut();
        }}
        onCancel={() => setLogoutModalVisible(false)}
      />

      <VerifyEmailModal
        visible={verifyModalVisible}
        onClose={() => setVerifyModalVisible(false)}
      />

      <EditProfileScreen
        visible={editProfileVisible}
        onClose={() => setEditProfileVisible(false)}
      />

      <AddressesScreen
        visible={addressesVisible}
        onClose={() => setAddressesVisible(false)}
      />

      <OrdersScreen
        visible={ordersVisible}
        onClose={() => setOrdersVisible(false)}
      />

      <MyDigitalFilesScreen
        visible={digitalFilesVisible}
        onClose={() => setDigitalFilesVisible(false)}
      />

      <MyListingsScreen
        visible={listingsVisible}
        onClose={() => setListingsVisible(false)}
      />

      <MySalesScreen
        visible={salesVisible}
        onClose={() => setSalesVisible(false)}
      />

      <NotificationsScreen
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        onOpenOrders={() => { setNotificationsVisible(false); setSalesVisible(true); }}
      />
    </SafeAreaView>
  );
}
