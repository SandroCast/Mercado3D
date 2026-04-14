import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";

interface Category {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const categories: Category[] = [
  { id: "all", label: "Todos", icon: "grid-outline" },
  { id: "impressoras", label: "Impressoras", icon: "print-outline" },
  { id: "filamentos", label: "Filamentos", icon: "layers-outline" },
  { id: "pecas", label: "Peças", icon: "construct-outline" },
  { id: "hardware", label: "Hardware", icon: "hardware-chip-outline" },
  { id: "resinas", label: "Resinas", icon: "flask-outline" },
  { id: "acessorios", label: "Acessórios", icon: "options-outline" },
];

interface CategoryBarProps {
  onCategoryChange?: (categoryId: string) => void;
}

export function CategoryBar({ onCategoryChange }: CategoryBarProps) {
  const [selected, setSelected] = useState("all");

  const handlePress = (id: string) => {
    setSelected(id);
    onCategoryChange?.(id);
  };

  return (
    <View className="bg-white border-b border-dark-100">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {categories.map((cat) => {
          const isActive = selected === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => handlePress(cat.id)}
              activeOpacity={0.7}
              className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full border ${
                isActive
                  ? "bg-primary-500 border-primary-500"
                  : "bg-white border-dark-200"
              }`}
            >
              <Ionicons
                name={cat.icon}
                size={15}
                color={isActive ? "#fff" : Colors.textMuted}
              />
              <Text
                className={`text-xs font-semibold ${
                  isActive ? "text-white" : "text-dark-500"
                }`}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
