import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../contexts/ThemeContext";

const categories = [
  { id: "all",        label: "Todos",        icon: "grid-outline" as const,             color: "#22d3ee" },
  { id: "impressoras",label: "Impressoras",  icon: "print-outline" as const,            color: "#38bdf8" },
  { id: "filamentos", label: "Filamentos",   icon: "layers-outline" as const,           color: "#a78bfa" },
  { id: "pecas",      label: "Peças",        icon: "construct-outline" as const,        color: "#34d399" },
  { id: "resinas",    label: "Resinas",      icon: "flask-outline" as const,            color: "#fb923c" },
  { id: "hardware",   label: "Hardware",     icon: "hardware-chip-outline" as const,    color: "#f472b6" },
  { id: "acessorios", label: "Acessórios",   icon: "options-outline" as const,          color: "#facc15" },
];

interface CategoryGridProps {
  onCategoryPress?: (id: string) => void;
}

export function CategoryGrid({ onCategoryPress }: CategoryGridProps) {
  const Colors = useColors();
  const [selected, setSelected] = useState("all");

  const handlePress = (id: string) => {
    setSelected(id);
    onCategoryPress?.(id);
  };

  return (
    <View style={{ marginTop: 20, marginBottom: 4 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
      >
        {categories.map((cat) => {
          const active = selected === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => handlePress(cat.id)}
              activeOpacity={0.8}
              style={{ alignItems: "center", gap: 6 }}
            >
              {/* Icon circle */}
              <View style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: active ? cat.color + "22" : Colors.bgCard,
                borderWidth: 1.5,
                borderColor: active ? cat.color : Colors.bgBorder,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Ionicons name={cat.icon} size={22} color={active ? cat.color : Colors.textGray} />
              </View>
              {/* Label */}
              <Text style={{
                color: active ? cat.color : Colors.textGray,
                fontSize: 11,
                fontWeight: active ? "700" : "500",
                textAlign: "center",
                maxWidth: 60,
              }} numberOfLines={1}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
