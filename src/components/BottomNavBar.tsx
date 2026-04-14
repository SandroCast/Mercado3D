import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";

export type TabName = "home" | "search" | "stl" | "favorites" | "profile";

interface Tab {
  name: TabName;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

const LEFT_TABS: Tab[] = [
  { name: "home",      label: "Início",     icon: "home-outline",       iconActive: "home" },
  { name: "search",    label: "Buscar",     icon: "search-outline",     iconActive: "search" },
];

const RIGHT_TABS: Tab[] = [
  { name: "favorites", label: "Favoritos",  icon: "heart-outline",      iconActive: "heart" },
  { name: "profile",   label: "Perfil",     icon: "person-outline",     iconActive: "person" },
];

interface BottomNavBarProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
  isDigital: boolean;
}

export function BottomNavBar({ activeTab, onTabPress, isDigital }: BottomNavBarProps) {
  const renderTab = (tab: Tab) => {
    const active = activeTab === tab.name;
    return (
      <TouchableOpacity
        key={tab.name}
        onPress={() => onTabPress(tab.name)}
        activeOpacity={0.7}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 5, gap: 2 }}
      >
        <Ionicons
          name={active ? tab.iconActive : tab.icon}
          size={22}
          color={active ? Colors.cyan : Colors.textMuted}
        />
        <Text style={{ color: active ? Colors.cyan : Colors.textMuted, fontSize: 10, fontWeight: active ? "700" : "500" }}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
      {/* Bar — renderizada primeiro (abaixo na pilha) */}
      <View style={{
        backgroundColor: Colors.bgCard,
        borderTopWidth: 1,
        borderTopColor: Colors.bgBorder,
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 8,
        paddingBottom: Platform.OS === "ios" ? 28 : 14,
      }}>
        {LEFT_TABS.map(renderTab)}

        {/* Espaço central — label abaixo do botão flutuante */}
        <View style={{ flex: 1, alignItems: "center", paddingTop: 26 }}>
          <Text style={{ color: isDigital ? Colors.cyan : Colors.textMuted, fontSize: 9, fontWeight: "700" }}>
            Digital
          </Text>
        </View>

        {RIGHT_TABS.map(renderTab)}
      </View>

      {/* Botão flutuante — renderizado depois, fica por cima da barra */}
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", top: -18, left: 0, right: 0, alignItems: "center" }}
      >
        <TouchableOpacity
          onPress={() => onTabPress("stl")}
          activeOpacity={0.85}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: isDigital ? Colors.cyan : Colors.bgCardAlt,
            borderWidth: 2,
            borderColor: Colors.cyan,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: Colors.cyan,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: isDigital ? 0.6 : 0.25,
            shadowRadius: 12,
            elevation: 12,
          }}
        >
          <Ionicons name="cube" size={24} color={isDigital ? Colors.bg : Colors.cyan} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
