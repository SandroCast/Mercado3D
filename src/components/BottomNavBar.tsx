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
        style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8, gap: 3 }}
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
    <View style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: Colors.bgCard,
      borderTopWidth: 1,
      borderTopColor: Colors.bgBorder,
      flexDirection: "row",
      alignItems: "flex-end",
      paddingBottom: Platform.OS === "ios" ? 24 : 8,
    }}>
      {/* Left tabs */}
      {LEFT_TABS.map(renderTab)}

      {/* Center button — toggle físico / digital */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 6 }}>
        <TouchableOpacity
          onPress={() => onTabPress("stl")}
          activeOpacity={0.85}
          style={{
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: isDigital ? Colors.cyan : Colors.bgCardAlt,
            borderWidth: 2,
            borderColor: Colors.cyan,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 2,
            // Elevação visual
            shadowColor: Colors.cyan,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isDigital ? 0.5 : 0.2,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          <Ionicons
            name="cube"
            size={26}
            color={isDigital ? Colors.bg : Colors.cyan}
          />
        </TouchableOpacity>
        <Text style={{ color: isDigital ? Colors.cyan : Colors.textMuted, fontSize: 10, fontWeight: "700" }}>
          {isDigital ? "Digital" : "Físico"}
        </Text>
      </View>

      {/* Right tabs */}
      {RIGHT_TABS.map(renderTab)}
    </View>
  );
}
