import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { useDigitalPurchases, DigitalPurchase } from "../contexts/DigitalPurchasesContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
  });
}

function formatPrice(v: number) {
  if (v === 0) return "Grátis";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── PurchaseCard ─────────────────────────────────────────────────────────────

function PurchaseCard({ purchase }: { purchase: DigitalPurchase }) {
  const Colors = useColors();
  const [expanded, setExpanded] = useState(false);

  const handleDownload = async (fmt: string) => {
    const url = purchase.formatFiles[fmt];
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Erro", "Não foi possível abrir o arquivo.");
      }
    } catch {
      Alert.alert("Erro", "Não foi possível baixar o arquivo.");
    }
  };

  return (
    <View style={{
      backgroundColor: Colors.bgCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.bgBorder,
      overflow: "hidden",
    }}>
      {/* Main row */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpanded((v) => !v)}
        style={{ flexDirection: "row", alignItems: "center", padding: 12, gap: 12 }}
      >
        {/* Thumbnail */}
        {purchase.thumbnail ? (
          <Image
            source={{ uri: purchase.thumbnail }}
            style={{ width: 60, height: 60, borderRadius: 10 }}
            resizeMode="cover"
          />
        ) : (
          <View style={{
            width: 60, height: 60, borderRadius: 10,
            backgroundColor: Colors.bgCardAlt,
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="cube-outline" size={26} color={Colors.textMuted} />
          </View>
        )}

        {/* Info */}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "700" }} numberOfLines={2}>
            {purchase.title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{
              backgroundColor: "#7c3aed22", borderRadius: 4,
              paddingHorizontal: 6, paddingVertical: 2,
            }}>
              <Text style={{ color: "#a78bfa", fontSize: 10, fontWeight: "700" }}>
                {purchase.formats.length} {purchase.formats.length === 1 ? "formato" : "formatos"}
              </Text>
            </View>
            <Text style={{ color: Colors.textMuted, fontSize: 11 }}>
              {formatDate(purchase.acquiredAt)} · {formatPrice(purchase.pricePaid)}
            </Text>
          </View>
        </View>

        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={Colors.textMuted}
        />
      </TouchableOpacity>

      {/* Expanded: download buttons */}
      {expanded && (
        <View style={{
          borderTopWidth: 1, borderTopColor: Colors.bgBorder,
          padding: 12, gap: 8,
        }}>
          <Text style={{
            color: Colors.textMuted, fontSize: 11, fontWeight: "700",
            textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2,
          }}>
            Baixar arquivo
          </Text>
          {purchase.formats.map((fmt) => (
            <TouchableOpacity
              key={fmt}
              onPress={() => handleDownload(fmt)}
              activeOpacity={0.8}
              style={{
                flexDirection: "row", alignItems: "center", gap: 10,
                backgroundColor: Colors.bgCardAlt,
                borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
                borderWidth: 1, borderColor: Colors.bgBorder,
              }}
            >
              <View style={{
                width: 32, height: 32, borderRadius: 8,
                backgroundColor: Colors.cyan + "22",
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="document-outline" size={16} color={Colors.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "700" }}>
                  .{fmt.toLowerCase()}
                </Text>
                <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 1 }}>
                  Toque para baixar
                </Text>
              </View>
              <Ionicons name="download-outline" size={18} color={Colors.cyan} />
            </TouchableOpacity>
          ))}

          {purchase.formats.length === 0 && (
            <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 8 }}>
              Nenhum arquivo disponível
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── MyDigitalFilesScreen ─────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function MyDigitalFilesScreen({ visible, onClose }: Props) {
  const Colors = useColors();
  const { purchases, loading, fetchPurchases } = useDigitalPurchases();

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top", "bottom"]}>

        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: 16, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: Colors.bgBorder, gap: 12,
        }}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.white, fontSize: 18, fontWeight: "800" }}>Meus Arquivos STL</Text>
            {purchases.length > 0 && (
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 1 }}>
                {purchases.length} {purchases.length === 1 ? "arquivo adquirido" : "arquivos adquiridos"}
              </Text>
            )}
          </View>
        </View>

        {/* Body */}
        {loading && purchases.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
            <ActivityIndicator size="large" color={Colors.cyan} />
            <Text style={{ color: Colors.textMuted, fontSize: 14 }}>Carregando arquivos...</Text>
          </View>
        ) : purchases.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 16 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.bgBorder,
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="cube-outline" size={36} color={Colors.textMuted} />
            </View>
            <Text style={{ color: Colors.white, fontSize: 17, fontWeight: "800", textAlign: "center" }}>
              Nenhum arquivo ainda
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              Arquivos digitais que você adquirir aparecerão aqui, mesmo que o anúncio seja removido.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={fetchPurchases} tintColor={Colors.cyan} />
            }
          >
            {purchases.map((p) => (
              <PurchaseCard key={p.id} purchase={p} />
            ))}

            <View style={{
              flexDirection: "row", alignItems: "flex-start", gap: 8,
              backgroundColor: Colors.bgCard, borderRadius: 10, padding: 12,
              borderWidth: 1, borderColor: Colors.bgBorder, marginTop: 4,
            }}>
              <Ionicons name="shield-checkmark-outline" size={16} color={Colors.cyan} style={{ marginTop: 1 }} />
              <Text style={{ color: Colors.textMuted, fontSize: 12, flex: 1, lineHeight: 18 }}>
                Seus arquivos ficam disponíveis mesmo que o vendedor remova o anúncio.
              </Text>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
