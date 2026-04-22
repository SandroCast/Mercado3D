import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { useCart, CartItem } from "../contexts/CartContext";
import { useAddress } from "../contexts/AddressContext";
import { useOrders } from "../contexts/OrdersContext";
import { useAuth } from "../contexts/AuthContext";
import { useDigitalPurchases } from "../contexts/DigitalPurchasesContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { AddressScreen } from "./AddressScreen";
import { fetchShippingQuotes, ShippingOption } from "../services/melhorEnvio";
import { Product, DigitalProduct, Order, OrderItem, ShippingOptionSummary, PaymentMethod, UserAddress } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(value: number): string {
  if (value === 0) return "GRÁTIS";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getImage(item: CartItem): string | null {
  if (item.type === "digital") return (item.product as DigitalProduct).thumbnail ?? null;
  return (item.product as Product).images?.[0] ?? null;
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.match(/.{1,4}/g)?.join(" ") ?? digits;
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function generateOrderId(): string {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEP_LABELS = ["Resumo", "Entrega", "Pagamento", "Confirmar"];

function StepIndicator({ current }: { current: number }) {
  const Colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 }}>
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <React.Fragment key={stepNum}>
            <View style={{ alignItems: "center", gap: 4 }}>
              <View style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: done || active ? Colors.cyan : Colors.bgCard,
                borderWidth: 1.5,
                borderColor: done || active ? Colors.cyan : Colors.bgBorder,
                alignItems: "center",
                justifyContent: "center",
              }}>
                {done ? (
                  <Ionicons name="checkmark" size={14} color={Colors.bg} />
                ) : (
                  <Text style={{
                    color: active ? Colors.bg : Colors.textMuted,
                    fontSize: 12,
                    fontWeight: "800",
                  }}>
                    {stepNum}
                  </Text>
                )}
              </View>
              <Text style={{
                color: active ? Colors.cyan : done ? Colors.textGray : Colors.textMuted,
                fontSize: 10,
                fontWeight: active ? "700" : "500",
              }}>
                {label}
              </Text>
            </View>
            {i < STEP_LABELS.length - 1 && (
              <View style={{
                flex: 1,
                height: 1.5,
                backgroundColor: i + 1 < current ? Colors.cyan : Colors.bgBorder,
                marginBottom: 14,
                marginHorizontal: 4,
              }} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Step 1: Resumo ───────────────────────────────────────────────────────────

function StepResumo({ items, physicalTotal, digitalTotal, totalPrice }: {
  items: CartItem[];
  physicalTotal: number;
  digitalTotal: number;
  totalPrice: number;
}) {
  const Colors = useColors();
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {items.map((item) => {
        const thumb = getImage(item);
        return (
          <View
            key={item.cartId}
            style={{
              flexDirection: "row",
              backgroundColor: Colors.bgCard,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: Colors.bgBorder,
              padding: 12,
              gap: 10,
            }}
          >
            {thumb ? (
              <Image
                source={{ uri: thumb }}
                style={{ width: 56, height: 56, borderRadius: 8 }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: Colors.bgCardAlt, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="cube-outline" size={22} color={Colors.textMuted} />
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "600" }} numberOfLines={2}>
                {item.product.title}
              </Text>
              <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{item.product.seller.name}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                <View style={{
                  backgroundColor: item.type === "digital" ? "#7c3aed22" : "#f9731622",
                  borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
                }}>
                  <Text style={{ color: item.type === "digital" ? Colors.purple : Colors.orange, fontSize: 10, fontWeight: "700" }}>
                    {item.type === "digital" ? "Digital" : "Físico"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {item.quantity > 1 && (
                    <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{item.quantity}x</Text>
                  )}
                  <Text style={{ color: Colors.cyan, fontSize: 14, fontWeight: "800" }}>
                    {formatPrice(item.product.price * item.quantity)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}

      {/* Subtotais */}
      <View style={{
        backgroundColor: Colors.bgCard,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.bgBorder,
        padding: 14,
        gap: 8,
      }}>
        {physicalTotal > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Produtos físicos</Text>
            <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600" }}>{formatPrice(physicalTotal)}</Text>
          </View>
        )}
        {digitalTotal > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Arquivos digitais</Text>
            <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600" }}>{formatPrice(digitalTotal)}</Text>
          </View>
        )}
        <View style={{ height: 1, backgroundColor: Colors.bgBorder }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "700" }}>Subtotal</Text>
          <Text style={{ color: Colors.cyan, fontSize: 18, fontWeight: "900" }}>{formatPrice(totalPrice)}</Text>
        </View>
        {physicalTotal > 0 && (
          <Text style={{ color: Colors.textMuted, fontSize: 11 }}>+ frete calculado na próxima etapa</Text>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Step 2: Entrega ──────────────────────────────────────────────────────────

function StepEntrega({
  hasPhysical,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddAddress,
  shippingOptions,
  shippingLoading,
  shippingError,
  selectedShipping,
  onSelectShipping,
}: {
  hasPhysical: boolean;
  addresses: UserAddress[];
  selectedAddressId: string | null;
  onSelectAddress: (id: string) => void;
  onAddAddress: () => void;
  shippingOptions: ShippingOption[];
  shippingLoading: boolean;
  shippingError: string | null;
  selectedShipping: ShippingOptionSummary | null;
  onSelectShipping: (opt: ShippingOptionSummary) => void;
}) {
  const Colors = useColors();

  if (!hasPhysical) {
    return (
      <View style={{ flex: 1, padding: 24 }}>
        <View style={{
          backgroundColor: Colors.bgCard, borderRadius: 14,
          borderWidth: 1, borderColor: Colors.bgBorder,
          padding: 20, alignItems: "center", gap: 12,
        }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#7c3aed22", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="cloud-download-outline" size={26} color={Colors.purple} />
          </View>
          <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "700", textAlign: "center" }}>Entrega Digital</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
            Seus arquivos estarão disponíveis para download imediatamente após a confirmação do pagamento.
          </Text>
        </View>
      </View>
    );
  }

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>

      {/* Address list */}
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Endereço de entrega
          </Text>
          <TouchableOpacity
            onPress={onAddAddress}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Ionicons name="add" size={14} color={Colors.cyan} />
            <Text style={{ color: Colors.cyan, fontSize: 12, fontWeight: "700" }}>Novo</Text>
          </TouchableOpacity>
        </View>

        {addresses.length === 0 ? (
          <TouchableOpacity
            onPress={onAddAddress}
            style={{
              backgroundColor: Colors.bgCard, borderRadius: 14,
              borderWidth: 1.5, borderColor: Colors.bgBorder, borderStyle: "dashed",
              padding: 20, alignItems: "center", gap: 8,
            }}
          >
            <Ionicons name="add-circle-outline" size={28} color={Colors.cyan} />
            <Text style={{ color: Colors.cyan, fontSize: 14, fontWeight: "700" }}>Adicionar endereço</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 12, textAlign: "center" }}>Necessário para calcular o frete</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 8 }}>
            {addresses.map((addr) => {
              const isSelected = addr.id === selectedAddressId;
              return (
                <TouchableOpacity
                  key={addr.id}
                  onPress={() => onSelectAddress(addr.id)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: "row", alignItems: "flex-start",
                    backgroundColor: Colors.bgCard, borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: isSelected ? Colors.cyan : Colors.bgBorder,
                    padding: 12, gap: 10,
                  }}
                >
                  <View style={{
                    width: 20, height: 20, borderRadius: 10, marginTop: 2,
                    borderWidth: 2, borderColor: isSelected ? Colors.cyan : Colors.bgBorder,
                    backgroundColor: isSelected ? Colors.cyan : "transparent",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {isSelected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.bg }} />}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "700" }}>{addr.recipientName}</Text>
                      {addr.isDefault && (
                        <View style={{ backgroundColor: Colors.cyan + "22", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: Colors.cyan + "55" }}>
                          <Text style={{ color: Colors.cyan, fontSize: 9, fontWeight: "800" }}>PADRÃO</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: Colors.textGray, fontSize: 12 }}>
                      {addr.street}, {addr.number}{addr.complement ? ` — ${addr.complement}` : ""}
                    </Text>
                    <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                      {addr.city}/{addr.state} · CEP {addr.postalCode.replace(/(\d{5})(\d{3})/, "$1-$2")}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Shipping options — shown when an address is selected */}
      {!!selectedAddress && (
        <View>
          <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            Opções de frete
          </Text>

          {shippingLoading && (
            <View style={{ alignItems: "center", paddingVertical: 24, gap: 8 }}>
              <ActivityIndicator size="small" color={Colors.cyan} />
              <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Calculando frete...</Text>
            </View>
          )}

          {!!shippingError && !shippingLoading && (
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 8,
              backgroundColor: Colors.error + "15", borderRadius: 10, padding: 12,
              borderWidth: 1, borderColor: Colors.error + "44",
            }}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
              <Text style={{ color: Colors.error, fontSize: 13, flex: 1 }}>{shippingError}</Text>
            </View>
          )}

          {!shippingLoading && !shippingError && shippingOptions.length > 0 && (
            <View style={{ gap: 8 }}>
              {shippingOptions.map((opt) => {
                const price = parseFloat(opt.custom_price ?? opt.price);
                const days = opt.delivery_range
                  ? `${opt.delivery_range.min}–${opt.delivery_range.max} dias úteis`
                  : `${opt.delivery_time} dias úteis`;
                const isSelected = selectedShipping?.id === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => onSelectShipping({ id: opt.id, name: opt.name, company: opt.company?.name ?? "", price: isFinite(price) ? price : 0, deliveryDays: days })}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      backgroundColor: Colors.bgCard, borderRadius: 12,
                      borderWidth: 1.5, borderColor: isSelected ? Colors.cyan : Colors.bgBorder,
                      padding: 12, gap: 12,
                    }}
                  >
                    <View style={{
                      width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                      borderColor: isSelected ? Colors.cyan : Colors.bgBorder,
                      backgroundColor: isSelected ? Colors.cyan : "transparent",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      {isSelected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.bg }} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "700" }}>{opt.name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <Ionicons name="time-outline" size={11} color={Colors.textMuted} />
                        <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{days}</Text>
                      </View>
                      {opt.company?.name && <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{opt.company.name}</Text>}
                    </View>
                    <Text style={{ color: Colors.cyan, fontSize: 15, fontWeight: "800" }}>
                      {isFinite(price) ? formatPrice(price) : "—"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {!shippingLoading && !shippingError && shippingOptions.length === 0 && (
            <View style={{ backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: Colors.bgBorder, padding: 16, alignItems: "center", gap: 6 }}>
              <Ionicons name="car-outline" size={24} color={Colors.textMuted} />
              <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center" }}>
                Nenhuma opção de frete disponível para este CEP.
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Payment sub-components — module level to keep TextInput refs stable ─────

function PaymentMethodBtn({ method, label, icon, activeMethod, onPress }: {
  method: PaymentMethod;
  label: string;
  icon: string;
  activeMethod: PaymentMethod;
  onPress: (m: PaymentMethod) => void;
}) {
  const Colors = useColors();
  const active = activeMethod === method;
  return (
    <TouchableOpacity
      onPress={() => onPress(method)}
      activeOpacity={0.8}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: active ? Colors.cyan : Colors.bgBorder,
        backgroundColor: active ? Colors.cyan + "15" : Colors.bgCard,
      }}
    >
      <Ionicons name={icon as any} size={18} color={active ? Colors.cyan : Colors.textGray} />
      <Text style={{ color: active ? Colors.cyan : Colors.textGray, fontSize: 14, fontWeight: "700" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CardInputField({ label, value, onChangeText, placeholder, keyboardType, maxLength, secureTextEntry, error }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  maxLength?: number;
  secureTextEntry?: boolean;
  error?: string;
}) {
  const Colors = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        secureTextEntry={secureTextEntry}
        style={{
          backgroundColor: Colors.bgCard,
          borderWidth: 1,
          borderColor: error ? Colors.error : Colors.bgBorder,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 13,
          color: Colors.white,
          fontSize: 15,
          letterSpacing: secureTextEntry ? 4 : 0,
        }}
      />
      {!!error && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 2 }}>{error}</Text>}
    </View>
  );
}

// ─── Step 3: Pagamento ────────────────────────────────────────────────────────

function StepPagamento({
  paymentMethod,
  onChangeMethod,
  cardHolder, onChangeHolder, cardHolderError,
  cardNumber, onChangeNumber, cardNumberError,
  cardExpiry, onChangeExpiry, cardExpiryError,
  cardCvv, onChangeCvv, cardCvvError,
  total,
}: {
  paymentMethod: PaymentMethod;
  onChangeMethod: (m: PaymentMethod) => void;
  cardHolder: string; onChangeHolder: (v: string) => void; cardHolderError?: string;
  cardNumber: string; onChangeNumber: (v: string) => void; cardNumberError?: string;
  cardExpiry: string; onChangeExpiry: (v: string) => void; cardExpiryError?: string;
  cardCvv: string; onChangeCvv: (v: string) => void; cardCvvError?: string;
  total: number;
}) {
  const Colors = useColors();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Method selector */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Método de pagamento
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <PaymentMethodBtn method="pix" label="PIX" icon="qr-code-outline" activeMethod={paymentMethod} onPress={onChangeMethod} />
            <PaymentMethodBtn method="credit_card" label="Cartão" icon="card-outline" activeMethod={paymentMethod} onPress={onChangeMethod} />
          </View>
        </View>

        {/* PIX info */}
        {paymentMethod === "pix" && (
          <View style={{
            backgroundColor: Colors.bgCard,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: Colors.bgBorder,
            padding: 20,
            alignItems: "center",
            gap: 12,
          }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: Colors.success + "20",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="qr-code-outline" size={30} color={Colors.success} />
            </View>
            <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "700" }}>Pagamento via PIX</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
              Após confirmar o pedido, você receberá um QR Code PIX para realizar o pagamento.
              O pedido é confirmado automaticamente após o pagamento.
            </Text>
            <View style={{
              backgroundColor: Colors.success + "15",
              borderRadius: 10,
              padding: 12,
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}>
              <Ionicons name="flash-outline" size={16} color={Colors.success} />
              <Text style={{ color: Colors.success, fontSize: 13, fontWeight: "600", flex: 1 }}>
                Aprovação instantânea — disponível 24h por dia
              </Text>
            </View>
          </View>
        )}

        {/* Card form */}
        {paymentMethod === "credit_card" && (
          <View style={{ gap: 14 }}>
            <CardInputField
              label="Nome no cartão"
              value={cardHolder}
              onChangeText={onChangeHolder}
              placeholder="Como aparece no cartão"
              error={cardHolderError}
            />

            <CardInputField
              label="Número do cartão"
              value={cardNumber}
              onChangeText={onChangeNumber}
              placeholder="0000 0000 0000 0000"
              keyboardType="numeric"
              maxLength={19}
              error={cardNumberError}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <CardInputField
                  label="Validade"
                  value={cardExpiry}
                  onChangeText={onChangeExpiry}
                  placeholder="MM/AA"
                  keyboardType="numeric"
                  maxLength={5}
                  error={cardExpiryError}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CardInputField
                  label="CVV"
                  value={cardCvv}
                  onChangeText={onChangeCvv}
                  placeholder="•••"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  error={cardCvvError}
                />
              </View>
            </View>

            {/* Security notice */}
            <View style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              backgroundColor: Colors.bgCard,
              borderRadius: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: Colors.bgBorder,
            }}>
              <Ionicons name="shield-checkmark-outline" size={16} color={Colors.success} style={{ marginTop: 1 }} />
              <Text style={{ color: Colors.textMuted, fontSize: 12, flex: 1, lineHeight: 18 }}>
                Seus dados são tokenizados pelo Mercado Pago (PCI-DSS). Nunca armazenamos seu número de cartão.
              </Text>
            </View>
          </View>
        )}

        {/* Total reminder */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: Colors.bgCard,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: Colors.bgBorder,
          padding: 14,
        }}>
          <Text style={{ color: Colors.textMuted, fontSize: 14 }}>Total a pagar</Text>
          <Text style={{ color: Colors.cyan, fontSize: 20, fontWeight: "900" }}>{formatPrice(total)}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Step 4: Confirmar ────────────────────────────────────────────────────────

function StepConfirmar({
  items,
  selectedAddress,
  selectedShipping,
  paymentMethod,
  subtotal,
  shippingCost,
  total,
  hasPhysical,
}: {
  items: CartItem[];
  selectedAddress: UserAddress | null;
  selectedShipping: ShippingOptionSummary | null;
  paymentMethod: PaymentMethod;
  subtotal: number;
  shippingCost: number;
  total: number;
  hasPhysical: boolean;
}) {
  const Colors = useColors();

  const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{
        color: highlight ? Colors.cyan : Colors.textGray,
        fontSize: highlight ? 18 : 13,
        fontWeight: highlight ? "900" : "600",
      }}>
        {value}
      </Text>
    </View>
  );

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Items count */}
      <View style={{
        backgroundColor: Colors.bgCard,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.bgBorder,
        padding: 14,
        gap: 8,
      }}>
        <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Itens do pedido
        </Text>
        {items.map((item) => (
          <View key={item.cartId} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: Colors.textGray, fontSize: 13, flex: 1, marginRight: 8 }} numberOfLines={1}>
              {item.quantity > 1 ? `${item.quantity}x ` : ""}{item.product.title}
            </Text>
            <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600" }}>
              {formatPrice(item.product.price * item.quantity)}
            </Text>
          </View>
        ))}
      </View>

      {/* Delivery */}
      {hasPhysical && selectedAddress && (
        <View style={{
          backgroundColor: Colors.bgCard,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: Colors.bgBorder,
          padding: 14,
          gap: 6,
        }}>
          <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
            Entrega
          </Text>
          <Text style={{ color: Colors.textGray, fontSize: 13 }}>
            {selectedAddress.street}, {selectedAddress.number} — {selectedAddress.city}/{selectedAddress.state}
          </Text>
          {selectedShipping && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                {selectedShipping.name} ({selectedShipping.deliveryDays})
              </Text>
              <Text style={{ color: Colors.textGray, fontSize: 12, fontWeight: "600" }}>
                {formatPrice(selectedShipping.price)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Payment */}
      <View style={{
        backgroundColor: Colors.bgCard,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.bgBorder,
        padding: 14,
        gap: 6,
      }}>
        <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
          Pagamento
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons
            name={paymentMethod === "pix" ? "qr-code-outline" : "card-outline"}
            size={16}
            color={Colors.textGray}
          />
          <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600" }}>
            {paymentMethod === "pix" ? "PIX" : "Cartão de crédito"}
          </Text>
        </View>
      </View>

      {/* Totals */}
      <View style={{
        backgroundColor: Colors.bgCard,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.bgBorder,
        padding: 14,
        gap: 10,
      }}>
        <Row label="Subtotal" value={formatPrice(subtotal)} />
        {hasPhysical && <Row label="Frete" value={formatPrice(shippingCost)} />}
        <View style={{ height: 1, backgroundColor: Colors.bgBorder }} />
        <Row label="Total" value={formatPrice(total)} highlight />
      </View>

      {/* Disclaimer */}
      <View style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        backgroundColor: Colors.bgCard,
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: Colors.bgBorder,
      }}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} style={{ marginTop: 1 }} />
        <Text style={{ color: Colors.textMuted, fontSize: 12, flex: 1, lineHeight: 18 }}>
          Ao confirmar, você concorda com os termos de compra. O pedido será criado e o pagamento
          processado pelo Mercado Pago.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── CheckoutScreen ───────────────────────────────────────────────────────────

interface CheckoutScreenProps {
  visible: boolean;
  onClose: () => void;
  onOrderPlaced?: (order: Order) => void;
}

export function CheckoutScreen({ visible, onClose, onOrderPlaced }: CheckoutScreenProps) {
  const Colors = useColors();
  const { user } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const { addresses, defaultAddress } = useAddress();
  const { createOrder } = useOrders();
  const { acquire } = useDigitalPurchases();
  const { sendPush } = useNotifications();

  const [step, setStep] = useState(1);
  const [modalReady, setModalReady] = useState(false);
  const [addAddressVisible, setAddAddressVisible] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;

  // Shipping
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOptionSummary | null>(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  const [placing, setPlacing] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const physicalItems = items.filter((i) => i.type === "physical");
  const digitalItems = items.filter((i) => i.type === "digital");
  const hasPhysical = physicalItems.length > 0;

  const physicalTotal = physicalItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const digitalTotal = digitalItems.reduce((s, i) => s + i.product.price, 0);
  const shippingCost = selectedShipping?.price ?? 0;
  const grandTotal = totalPrice + shippingCost;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep(1);
      setSelectedAddressId(defaultAddress?.id ?? null);
      setSelectedShipping(null);
      setShippingOptions([]);
      setShippingError(null);
      setPaymentMethod("pix");
      setCardHolder("");
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
      setCardErrors({});
      setStepError(null);
      setPlacing(false);
    }
  }, [visible]);

  // Load shipping when entering step 2 with a selected address and physical items
  const loadShipping = useCallback(async (postalCode: string) => {
    if (!hasPhysical) return;
    const sellerCep = physicalItems.find((i) => i.product.seller.postalCode)?.product.seller.postalCode;
    if (!sellerCep) {
      setShippingError("CEP do vendedor não disponível. Entre em contato com o vendedor.");
      return;
    }
    setShippingLoading(true);
    setShippingError(null);
    setSelectedShipping(null);
    try {
      const opts = await fetchShippingQuotes(sellerCep, postalCode, {
        weight: 0.5, height: 15, width: 15, length: 20,
      });
      setShippingOptions(opts);
    } catch (err) {
      setShippingError(
        err instanceof Error ? err.message : "Erro ao calcular frete. Tente novamente."
      );
    } finally {
      setShippingLoading(false);
    }
  }, [hasPhysical, physicalItems]);

  useEffect(() => {
    if (step === 2 && hasPhysical && selectedAddress) {
      loadShipping(selectedAddress.postalCode);
    }
  }, [step, selectedAddressId]);

  // ── Step validation ──────────────────────────────────────────────────────────

  const validateStep = (): boolean => {
    setStepError(null);

    if (step === 2 && hasPhysical) {
      if (!selectedAddress) {
        setStepError("Adicione um endereço de entrega para continuar.");
        return false;
      }
      if (!selectedShipping) {
        setStepError("Selecione uma opção de frete para continuar.");
        return false;
      }
    }

    if (step === 3 && paymentMethod === "credit_card") {
      const e: Record<string, string> = {};
      if (!cardHolder.trim()) e.cardHolder = "Nome obrigatório";
      const digits = cardNumber.replace(/\D/g, "");
      if (digits.length < 13) e.cardNumber = "Número de cartão inválido";
      const parts = cardExpiry.split("/");
      const month = parseInt(parts[0] ?? "0");
      const year = parseInt(parts[1] ?? "0");
      if (!parts[1] || month < 1 || month > 12 || year < 24) e.cardExpiry = "Data inválida";
      if (cardCvv.length < 3) e.cardCvv = "CVV inválido";
      setCardErrors(e);
      if (Object.keys(e).length > 0) return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  // ── Place order ──────────────────────────────────────────────────────────────

  const handlePlaceOrder = async () => {
    if (!validateStep()) return;
    setPlacing(true);
    try {
      const orderItems: OrderItem[] = items.map((i) => ({
        productId: i.product.id,
        title: i.product.title,
        type: i.type,
        quantity: i.quantity,
        unitPrice: i.product.price,
        imageUrl: i.type === "digital"
          ? (i.product as DigitalProduct).thumbnail
          : (i.product as Product).images?.[0],
        sellerName: i.product.seller.name,
        sellerId: i.product.seller.id,
      }));

      const order: Order = {
        id: generateOrderId(),
        status: "pending_payment",
        items: orderItems,
        subtotal: totalPrice,
        shippingCost,
        total: grandTotal,
        paymentMethod,
        shippingAddress: hasPhysical ? selectedAddress ?? undefined : undefined,
        selectedShipping: selectedShipping ?? undefined,
        createdAt: new Date().toISOString(),
      };

      await createOrder(order);

      // Register digital purchases so buyer keeps download access even if listing is deleted
      await Promise.allSettled(
        digitalItems.map((i) => {
          const dp = i.product as DigitalProduct;
          return acquire({
            productId:   dp.id,
            title:       dp.title,
            thumbnail:   dp.thumbnail,
            formats:     dp.formats ?? [],
            formatFiles: dp.formatFiles ?? {},
            pricePaid:   dp.price,
          });
        }),
      );

      // Notify each unique seller about the new sale
      const sellerIds = [...new Set(orderItems.map((i) => i.sellerId).filter(Boolean))] as string[];
      await Promise.allSettled(
        sellerIds.map((sellerId) =>
          sendPush({
            toUserId: sellerId,
            title: "🛒 Nova venda!",
            body: `Você recebeu um novo pedido #${order.id.slice(-6)}.`,
            data: { orderId: order.id },
          })
        )
      );

      clearCart();
      onOrderPlaced?.(order);
    } finally {
      setPlacing(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      onShow={() => setModalReady(true)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: Colors.bgBorder,
          gap: 12,
        }}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={{ flex: 1, color: Colors.white, fontSize: 18, fontWeight: "800" }}>
            Finalizar Compra
          </Text>
        </View>

        {/* Step indicator */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: Colors.bgBorder }}>
          <StepIndicator current={step} />
        </View>

        {/* Step content */}
        {modalReady && (
          <View style={{ flex: 1 }}>
            {step === 1 && (
              <StepResumo
                items={items}
                physicalTotal={physicalTotal}
                digitalTotal={digitalTotal}
                totalPrice={totalPrice}
              />
            )}
            {step === 2 && (
              <StepEntrega
                hasPhysical={hasPhysical}
                addresses={addresses}
                selectedAddressId={selectedAddressId}
                onSelectAddress={(id) => {
                  setSelectedAddressId(id);
                  const addr = addresses.find((a) => a.id === id);
                  if (addr) loadShipping(addr.postalCode);
                }}
                onAddAddress={() => setAddAddressVisible(true)}
                shippingOptions={shippingOptions}
                shippingLoading={shippingLoading}
                shippingError={shippingError}
                selectedShipping={selectedShipping}
                onSelectShipping={setSelectedShipping}
              />
            )}
            {step === 3 && (
              <StepPagamento
                paymentMethod={paymentMethod}
                onChangeMethod={setPaymentMethod}
                cardHolder={cardHolder} onChangeHolder={setCardHolder} cardHolderError={cardErrors.cardHolder}
                cardNumber={cardNumber}
                onChangeNumber={(t) => {
                  setCardNumber(formatCardNumber(t));
                  setCardErrors((prev) => ({ ...prev, cardNumber: undefined as any }));
                }}
                cardNumberError={cardErrors.cardNumber}
                cardExpiry={cardExpiry}
                onChangeExpiry={(t) => {
                  setCardExpiry(formatExpiry(t));
                  setCardErrors((prev) => ({ ...prev, cardExpiry: undefined as any }));
                }}
                cardExpiryError={cardErrors.cardExpiry}
                cardCvv={cardCvv}
                onChangeCvv={(t) => {
                  setCardCvv(t.replace(/\D/g, "").slice(0, 4));
                  setCardErrors((prev) => ({ ...prev, cardCvv: undefined as any }));
                }}
                cardCvvError={cardErrors.cardCvv}
                total={grandTotal}
              />
            )}
            {step === 4 && (
              <StepConfirmar
                items={items}
                selectedAddress={selectedAddress}
                selectedShipping={selectedShipping}
                paymentMethod={paymentMethod}
                subtotal={totalPrice}
                shippingCost={shippingCost}
                total={grandTotal}
                hasPhysical={hasPhysical}
              />
            )}
          </View>
        )}

        {!modalReady && <View style={{ flex: 1, backgroundColor: Colors.bg }} />}

        {/* Footer navigation */}
        <View style={{
          borderTopWidth: 1,
          borderTopColor: Colors.bgBorder,
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 10,
        }}>
          {!!stepError && (
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: Colors.error + "15",
              borderRadius: 10,
              padding: 10,
              borderWidth: 1,
              borderColor: Colors.error + "44",
            }}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
              <Text style={{ color: Colors.error, fontSize: 13, flex: 1 }}>{stepError}</Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10 }}>
            {step > 1 && (
              <TouchableOpacity
                onPress={handleBack}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: Colors.bgBorder,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: Colors.textGray, fontSize: 14, fontWeight: "700" }}>Voltar</Text>
              </TouchableOpacity>
            )}

            {step < 4 ? (
              <TouchableOpacity
                onPress={handleNext}
                style={{ flex: step > 1 ? 2 : 1, borderRadius: 12, overflow: "hidden" }}
              >
                <LinearGradient
                  colors={["#06b6d4", "#22d3ee"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}
                >
                  <Text style={{ color: Colors.bg, fontSize: 15, fontWeight: "900" }}>Próximo</Text>
                  <Ionicons name="arrow-forward" size={16} color={Colors.bg} />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handlePlaceOrder}
                disabled={placing}
                style={{ flex: 2, borderRadius: 12, overflow: "hidden", opacity: placing ? 0.7 : 1 }}
              >
                <LinearGradient
                  colors={["#06b6d4", "#22d3ee"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}
                >
                  {placing ? (
                    <ActivityIndicator size="small" color={Colors.bg} />
                  ) : (
                    <>
                      <Ionicons name="lock-closed" size={16} color={Colors.bg} />
                      <Text style={{ color: Colors.bg, fontSize: 15, fontWeight: "900" }}>Confirmar e Pagar</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Add address modal */}
      <AddressScreen
        visible={addAddressVisible}
        onClose={() => setAddAddressVisible(false)}
        onSaved={(addr) => {
          setAddAddressVisible(false);
          setSelectedAddressId(addr.id);
          loadShipping(addr.postalCode);
        }}
      />
    </Modal>
  );
}
