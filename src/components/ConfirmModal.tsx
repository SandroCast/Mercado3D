import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../contexts/ThemeContext";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  icon,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const Colors = useColors();

  const confirmColor = destructive ? "#ef4444" : Colors.cyan;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
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
            }}>
              {/* Ícone */}
              {icon && (
                <View style={{
                  alignItems: "center",
                  paddingTop: 28,
                  paddingBottom: 4,
                }}>
                  <View style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: destructive ? "#ef444420" : Colors.cyan + "20",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Ionicons name={icon} size={26} color={confirmColor} />
                  </View>
                </View>
              )}

              {/* Texto */}
              <View style={{ paddingHorizontal: 24, paddingTop: icon ? 16 : 28, paddingBottom: 24 }}>
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
                  color: Colors.textMuted,
                  fontSize: 14,
                  textAlign: "center",
                  lineHeight: 20,
                }}>
                  {message}
                </Text>
              </View>

              {/* Divisor */}
              <View style={{ height: 1, backgroundColor: Colors.bgBorder }} />

              {/* Botões */}
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity
                  onPress={onCancel}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    alignItems: "center",
                    borderRightWidth: 0.5,
                    borderRightColor: Colors.bgBorder,
                  }}
                >
                  <Text style={{ color: Colors.textGray, fontSize: 15, fontWeight: "600" }}>
                    {cancelLabel}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onConfirm}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    alignItems: "center",
                    borderLeftWidth: 0.5,
                    borderLeftColor: Colors.bgBorder,
                  }}
                >
                  <Text style={{ color: confirmColor, fontSize: 15, fontWeight: "800" }}>
                    {confirmLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
