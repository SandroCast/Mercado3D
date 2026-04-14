import React from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";

const { width } = Dimensions.get("window");

interface HeroBannerProps {
  onNavigateToDigital?: () => void;
}

export function HeroBanner({ onNavigateToDigital }: HeroBannerProps) {
  return (
    <View>
      {/* Main hero */}
      <LinearGradient
        colors={["#0d1117", "#111827", "#0d1117"]}
        style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 28 }}
      >
        {/* Badge */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <View style={{ backgroundColor: Colors.cyan + "22", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.cyan }} />
            <Text style={{ color: Colors.cyan, fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>OFERTAS DA SEMANA</Text>
          </View>
        </View>

        {/* Heading */}
        <Text style={{ color: Colors.white, fontSize: 32, fontWeight: "800", lineHeight: 38, marginBottom: 4 }}>
          Lançamentos em
        </Text>
        <Text style={{ color: Colors.cyan, fontSize: 32, fontWeight: "800", lineHeight: 38, marginBottom: 14 }}>
          Impressão 3D
        </Text>

        {/* Subtitle */}
        <Text style={{ color: Colors.textGray, fontSize: 14, lineHeight: 22, marginBottom: 24, maxWidth: width * 0.72 }}>
          Encontre as melhores impressoras e suprimentos premium para transformar suas ideias digitais em realidade física.
        </Text>

        {/* Buttons */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            style={{ backgroundColor: Colors.cyan, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 8 }}
            activeOpacity={0.85}
          >
            <Text style={{ color: Colors.bg, fontWeight: "700", fontSize: 14 }}>Ver Impressoras</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ borderWidth: 1, borderColor: Colors.bgBorder, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 8, backgroundColor: Colors.bgCardAlt }}
            activeOpacity={0.85}
          >
            <Text style={{ color: Colors.white, fontWeight: "600", fontSize: 14 }}>Filamentos</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* STL card */}
      <TouchableOpacity onPress={onNavigateToDigital} activeOpacity={0.88} style={{ marginHorizontal: 16, marginTop: -6, marginBottom: 8 }}>
        <LinearGradient
          colors={["#4f46e5", "#7c3aed"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 14, paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <View>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>Explorar Arquivos STL</Text>
            <Text style={{ color: "#c4b5fd", fontSize: 12, marginTop: 2 }}>Miniaturas, Decoração e Peças Técnicas exclusivas.</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#ffffff22", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>IR PARA STL</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}
