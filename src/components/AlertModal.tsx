import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "../contexts/ThemeContext";

export type AlertType = "error" | "success" | "warning" | "info";

interface AlertModalProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
}

const CONFIG: Record<AlertType, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  gradient: [string, string];
}> = {
  error:   { icon: "close-circle-outline",    color: "#ef4444", bgColor: "#ef444418", gradient: ["#ef4444", "#dc2626"] },
  success: { icon: "checkmark-circle-outline", color: "#22d3ee", bgColor: "#22d3ee18", gradient: ["#22d3ee", "#0891b2"] },
  warning: { icon: "warning-outline",          color: "#f59e0b", bgColor: "#f59e0b18", gradient: ["#f59e0b", "#d97706"] },
  info:    { icon: "information-circle-outline", color: "#22d3ee", bgColor: "#22d3ee18", gradient: ["#22d3ee", "#0891b2"] },
};

export function AlertModal({
  visible,
  type = "info",
  title,
  message,
  confirmLabel = "OK",
  onClose,
}: AlertModalProps) {
  const Colors = useColors();
  const cfg = CONFIG[type];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.65)",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}>
          <TouchableWithoutFeedback>
            <View style={{
              width: "100%",
              backgroundColor: Colors.bgCard,
              borderRadius: 24,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: Colors.bgBorder,
            }}>
              {/* Barra colorida superior */}
              <View style={{ height: 4, backgroundColor: cfg.color }} />

              {/* Ícone */}
              <View style={{ alignItems: "center", paddingTop: 28, paddingBottom: 4 }}>
                <View style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: cfg.bgColor,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: cfg.color + "40",
                }}>
                  <Ionicons name={cfg.icon} size={30} color={cfg.color} />
                </View>
              </View>

              {/* Texto */}
              <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
                <Text style={{
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: "800",
                  textAlign: "center",
                  marginBottom: 8,
                }}>
                  {title}
                </Text>
                <Text style={{
                  color: Colors.textGray,
                  fontSize: 14,
                  textAlign: "center",
                  lineHeight: 21,
                }}>
                  {message}
                </Text>
              </View>

              {/* Botão */}
              <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.85}
                  style={{ borderRadius: 14, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={cfg.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingVertical: 14, alignItems: "center" }}
                  >
                    <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>
                      {confirmLabel}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
