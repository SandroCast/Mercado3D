import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../contexts/ThemeContext";
import {
  fetchShippingQuotes,
  sanitizeCEP,
  ShippingOption,
  ShippingPackage,
} from "../services/melhorEnvio";

// ─── Default package dimensions for common 3D printing products ───────────────
const DEFAULT_PACKAGE: ShippingPackage = {
  weight: 0.5,
  height: 15,
  width: 15,
  length: 20,
};

interface ShippingCalculatorProps {
  /** CEP de origem do vendedor (8 dígitos). Vem do perfil do vendedor. */
  sellerPostalCode: string;
  /** Substitui as dimensões padrão se o produto tiver medidas cadastradas */
  packageInfo?: Partial<ShippingPackage>;
}

// ─── Carrier color map ────────────────────────────────────────────────────────
const CARRIER_COLORS: Record<string, string> = {
  correios: "#f97316",
  jadlog:   "#7c3aed",
  latam:    "#3b82f6",
  azul:     "#3b82f6",
  default:  "#22d3ee",
};

function carrierColor(name: string): string {
  const key = name.toLowerCase();
  return (
    Object.entries(CARRIER_COLORS).find(([k]) => key.includes(k))?.[1] ??
    CARRIER_COLORS.default
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ShippingCalculator({ sellerPostalCode, packageInfo }: ShippingCalculatorProps) {
  const Colors = useColors();
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ShippingOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pkg: ShippingPackage = { ...DEFAULT_PACKAGE, ...packageInfo };

  const handleCepChange = (text: string) => {
    // Only allow digits, max 9 chars (with mask dash)
    const digits = text.replace(/\D/g, "").slice(0, 8);
    // Apply mask: XXXXX-XXX
    const masked =
      digits.length > 5
        ? `${digits.slice(0, 5)}-${digits.slice(5)}`
        : digits;
    setCep(masked);

    // Clear results when user changes CEP
    if (results || error) {
      setResults(null);
      setError(null);
    }
  };

  const handleCalculate = async () => {
    const clean = sanitizeCEP(cep);
    if (!clean) {
      setError("Digite um CEP válido com 8 dígitos.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const quotes = await fetchShippingQuotes(sellerPostalCode, clean, pkg);
      setResults(quotes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao calcular frete. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Text
        style={{
          color: Colors.white,
          fontSize: 15,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        Calcular Frete
      </Text>

      {/* Input row */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: Colors.bgCardAlt,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: error ? Colors.error + "88" : Colors.bgBorder,
            paddingHorizontal: 12,
            gap: 8,
          }}
        >
          <Ionicons name="location-outline" size={18} color={Colors.textMuted} />
          <TextInput
            value={cep}
            onChangeText={handleCepChange}
            placeholder="00000-000"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            maxLength={9}
            returnKeyType="search"
            onSubmitEditing={handleCalculate}
            style={{
              flex: 1,
              color: Colors.white,
              fontSize: 15,
              paddingVertical: 13,
            }}
            accessibilityLabel="CEP de destino"
          />
          {cep.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setCep("");
                setResults(null);
                setError(null);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={handleCalculate}
          disabled={loading || cep.replace(/\D/g, "").length < 8}
          activeOpacity={0.8}
          style={{
            backgroundColor:
              cep.replace(/\D/g, "").length === 8 ? Colors.cyan : Colors.bgBorder,
            borderRadius: 12,
            paddingHorizontal: 18,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel="Calcular frete"
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.bg} />
          ) : (
            <Text
              style={{
                color:
                  cep.replace(/\D/g, "").length === 8 ? Colors.bg : Colors.textMuted,
                fontWeight: "800",
                fontSize: 13,
              }}
            >
              Calcular
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
            backgroundColor: Colors.error + "15",
            borderRadius: 10,
            padding: 10,
            borderWidth: 1,
            borderColor: Colors.error + "44",
          }}
        >
          <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
          <Text style={{ color: Colors.error, fontSize: 13, flex: 1 }}>
            {error}
          </Text>
        </View>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <View style={{ marginTop: 12, gap: 8 }}>
          {results.map((opt) => {
            const priceNum = parseFloat(opt.custom_price ?? opt.price);
            const priceStr = isFinite(priceNum)
              ? priceNum.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })
              : "—";
            const color = carrierColor(opt.company?.name ?? "");
            const days = opt.delivery_range
              ? `${opt.delivery_range.min}–${opt.delivery_range.max} dias úteis`
              : `${opt.delivery_time} dias úteis`;

            return (
              <View
                key={opt.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: Colors.bgCardAlt,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: Colors.bgBorder,
                  gap: 12,
                }}
              >
                {/* Carrier badge */}
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: color + "22",
                    borderWidth: 1,
                    borderColor: color + "55",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="cube-outline" size={20} color={color} />
                </View>

                {/* Carrier info */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {opt.name}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 2,
                    }}
                  >
                    <Ionicons
                      name="time-outline"
                      size={11}
                      color={Colors.textMuted}
                    />
                    <Text style={{ color: Colors.textMuted, fontSize: 11 }}>
                      {days}
                    </Text>
                  </View>
                  <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 1 }}>
                    {opt.company?.name ?? ""}
                  </Text>
                </View>

                {/* Price */}
                <Text
                  style={{
                    color: Colors.cyan,
                    fontSize: 16,
                    fontWeight: "800",
                  }}
                >
                  {priceStr}
                </Text>
              </View>
            );
          })}

          <Text
            style={{
              color: Colors.textMuted,
              fontSize: 11,
              textAlign: "center",
              marginTop: 4,
            }}
          >
            Valores e prazos são estimativas. Confirmação no checkout.
          </Text>
        </View>
      )}
    </View>
  );
}
