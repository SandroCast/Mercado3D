import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, subtitle, onSeeAll }: SectionHeaderProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 14 }}>
      <View>
        <Text style={{ color: Colors.white, fontSize: 18, fontWeight: "800" }}>{title}</Text>
        {subtitle && <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      {onSeeAll && (
        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Text style={{ color: Colors.cyan, fontSize: 13, fontWeight: "600" }}>Ver tudo</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.cyan} />
        </TouchableOpacity>
      )}
    </View>
  );
}
