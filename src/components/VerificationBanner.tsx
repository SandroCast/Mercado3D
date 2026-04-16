import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../contexts/ThemeContext";
import { VerifyEmailModal } from "./VerifyEmailModal";

export function VerificationBanner() {
  const Colors = useColors();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setModalVisible(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#78350f",   // âmbar escuro
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 8,
          borderBottomWidth: 1,
          borderBottomColor: "#92400e",
        }}
      >
        <Ionicons name="mail-unread-outline" size={16} color="#fbbf24" />
        <Text style={{ flex: 1, color: "#fde68a", fontSize: 12, fontWeight: "600" }}>
          Confirme seu e-mail para proteger sua conta
        </Text>
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 3,
          backgroundColor: "#92400e", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
        }}>
          <Text style={{ color: "#fbbf24", fontSize: 11, fontWeight: "800" }}>Verificar</Text>
          <Ionicons name="chevron-forward" size={11} color="#fbbf24" />
        </View>
      </TouchableOpacity>

      <VerifyEmailModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}
