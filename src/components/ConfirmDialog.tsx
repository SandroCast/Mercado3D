import React from "react";
import { View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../contexts/ThemeContext";

interface ConfirmDialogProps {
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

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const Colors = useColors();

  const confirmColor = destructive ? Colors.error : Colors.cyan;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={{ flex: 1, backgroundColor: "#000000aa", alignItems: "center", justifyContent: "center", padding: 32 }}>
          {/* Card — bloqueia o toque para não fechar ao clicar dentro */}
          <TouchableWithoutFeedback>
            <View style={{
              width: "100%",
              backgroundColor: Colors.bgCard,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: Colors.bgBorder,
              overflow: "hidden",
            }}>
              {/* Corpo */}
              <View style={{ padding: 24, alignItems: "center", gap: 12 }}>
                {icon && (
                  <View style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: destructive ? "#ef444418" : "#22d3ee18",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 4,
                  }}>
                    <Ionicons name={icon} size={26} color={confirmColor} />
                  </View>
                )}
                <Text style={{ color: Colors.white, fontSize: 17, fontWeight: "800", textAlign: "center" }}>
                  {title}
                </Text>
                <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
                  {message}
                </Text>
              </View>

              {/* Divisor */}
              <View style={{ height: 1, backgroundColor: Colors.bgBorder }} />

              {/* Botões */}
              <View style={{ flexDirection: "row" }}>
                {cancelLabel !== "" && (
                  <>
                    <TouchableOpacity
                      onPress={onCancel}
                      activeOpacity={0.7}
                      style={{ flex: 1, paddingVertical: 16, alignItems: "center" }}
                    >
                      <Text style={{ color: Colors.textGray, fontSize: 15, fontWeight: "600" }}>
                        {cancelLabel}
                      </Text>
                    </TouchableOpacity>
                    <View style={{ width: 1, backgroundColor: Colors.bgBorder }} />
                  </>
                )}

                <TouchableOpacity
                  onPress={onConfirm}
                  activeOpacity={0.7}
                  style={{ flex: 1, paddingVertical: 16, alignItems: "center" }}
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
