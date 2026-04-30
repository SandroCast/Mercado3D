import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "../contexts/ThemeContext";
import { useAddress } from "../contexts/AddressContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { Address, UserAddress } from "../types";

// ─── Masks ────────────────────────────────────────────────────────────────────

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskCEP(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

type FormErrors = Partial<Record<keyof Address | "phone", string>>;

const EMPTY_FORM = {
  recipientName: "", phone: "", postalCode: "",
  street: "", number: "", complement: "",
  neighborhood: "", city: "", state: "",
};

// ─── FormField — module level to keep keyboard stable between renders ─────────

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "phone-pad" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
  maxLength?: number;
  editable?: boolean;
}

function FormField({
  label, value, onChangeText, placeholder,
  keyboardType = "default", autoCapitalize = "sentences",
  error, maxLength, editable = true,
}: FormFieldProps) {
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
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        editable={editable}
        style={{
          backgroundColor: editable ? Colors.bgCard : Colors.bgCardAlt,
          borderWidth: 1,
          borderColor: error ? Colors.error : Colors.bgBorder,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 13,
          color: editable ? Colors.white : Colors.textMuted,
          fontSize: 15,
        }}
      />
      {!!error && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 2 }}>{error}</Text>}
    </View>
  );
}

// ─── AddressScreen ────────────────────────────────────────────────────────────

interface AddressScreenProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (address: UserAddress) => void;
  /** Pass to edit an existing address; omit to create a new one */
  editingAddress?: UserAddress | null;
}

export function AddressScreen({ visible, onClose, onSaved, editingAddress }: AddressScreenProps) {
  const Colors = useColors();
  const { user } = useAuth();
  const { addresses, createAddress, updateAddress, setDefaultAddress } = useAddress();

  const isEditing = !!editingAddress;

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [cepDisplay, setCepDisplay] = useState("");
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepFound, setCepFound] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!visible) return;
    if (editingAddress) {
      setForm({
        recipientName: editingAddress.recipientName,
        phone:         editingAddress.phone,
        postalCode:    editingAddress.postalCode,
        street:        editingAddress.street,
        number:        editingAddress.number,
        complement:    editingAddress.complement ?? "",
        neighborhood:  editingAddress.neighborhood,
        city:          editingAddress.city,
        state:         editingAddress.state,
      });
      setCepDisplay(maskCEP(editingAddress.postalCode));
      setPhoneDisplay(maskPhone(editingAddress.phone));
      setMakeDefault(editingAddress.isDefault);
      setCepFound(true);
    } else {
      setForm({ ...EMPTY_FORM });
      setCepDisplay("");
      setMakeDefault(addresses.length === 0);
      setCepFound(false);
      // Pre-fill phone from profile if available
      if (user) {
        supabase.from("profiles").select("phone").eq("id", user.id).single()
          .then(({ data }) => {
            setPhoneDisplay(data?.phone ? maskPhone(data.phone) : "");
          });
      } else {
        setPhoneDisplay("");
      }
    }
    setErrors({});
    setCepError(null);
  }, [visible, editingAddress]);

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleCEP = async (text: string) => {
    const masked = maskCEP(text);
    setCepDisplay(masked);
    const digits = masked.replace(/\D/g, "");
    setField("postalCode", digits);
    setCepError(null);
    setCepFound(false);

    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (data.erro) {
          setCepError("CEP não encontrado. Verifique e tente novamente.");
        } else {
          setForm((prev) => ({
            ...prev,
            postalCode:   digits,
            street:       data.logradouro  ?? prev.street,
            neighborhood: data.bairro      ?? prev.neighborhood,
            city:         data.localidade  ?? prev.city,
            state:        data.uf          ?? prev.state,
          }));
          setErrors((prev) => ({
            ...prev,
            street: undefined, neighborhood: undefined,
            city: undefined, state: undefined,
          }));
          setCepFound(true);
        }
      } catch {
        setCepError("Erro ao buscar CEP. Verifique sua conexão.");
      } finally {
        setCepLoading(false);
      }
    }
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.recipientName.trim()) e.recipientName = "Nome obrigatório";
    if (phoneDisplay.replace(/\D/g, "").length < 10) e.phone = "Telefone inválido";
    if (form.postalCode.length !== 8) e.postalCode = "CEP inválido";
    if (!form.street.trim()) e.street = "Logradouro obrigatório";
    if (!form.number.trim()) e.number = "Número obrigatório";
    if (!form.neighborhood.trim()) e.neighborhood = "Bairro obrigatório";
    if (!form.city.trim()) e.city = "Cidade obrigatória";
    if (!form.state.trim()) e.state = "Estado obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const addressData: Address = {
      recipientName: form.recipientName.trim(),
      phone:         phoneDisplay.replace(/\D/g, ""),
      postalCode:    form.postalCode,
      street:        form.street.trim(),
      number:        form.number.trim(),
      complement:    form.complement.trim() || undefined,
      neighborhood:  form.neighborhood.trim(),
      city:          form.city.trim(),
      state:         form.state.toUpperCase().trim(),
    };

    try {
      if (isEditing && editingAddress) {
        await updateAddress(editingAddress.id, addressData);
        if (makeDefault && !editingAddress.isDefault) {
          await setDefaultAddress(editingAddress.id);
        }
        onSaved?.({ ...editingAddress, ...addressData, isDefault: makeDefault });
      } else {
        const created = await createAddress(addressData, makeDefault);
        onSaved?.(created);
      }
      onClose();
    } catch (err) {
      console.warn("save address error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
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
            <Text style={{ color: Colors.white, fontSize: 18, fontWeight: "800" }}>
              {isEditing ? "Editar Endereço" : "Novo Endereço"}
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 1 }}>
              Preenchimento automático pelo CEP
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
            <View style={{ gap: 14 }}>
              <FormField
                label="Nome do destinatário"
                value={form.recipientName}
                onChangeText={(t) => setField("recipientName", t)}
                placeholder="Nome completo"
                error={errors.recipientName}
              />

              {/* Phone */}
              <View style={{ gap: 4 }}>
                <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Telefone
                </Text>
                <TextInput
                  value={phoneDisplay}
                  onChangeText={(t) => {
                    setPhoneDisplay(maskPhone(t));
                    setErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={15}
                  style={{
                    backgroundColor: Colors.bgCard,
                    borderWidth: 1,
                    borderColor: errors.phone ? Colors.error : Colors.bgBorder,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                    color: Colors.white,
                    fontSize: 15,
                  }}
                />
                {!!errors.phone && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 2 }}>{errors.phone}</Text>}
              </View>

              {/* CEP */}
              <View style={{ gap: 4 }}>
                <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  CEP
                </Text>
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: Colors.bgCard,
                  borderWidth: 1, borderColor: cepError ? Colors.error : Colors.bgBorder,
                  borderRadius: 12, paddingHorizontal: 14, gap: 8,
                }}>
                  <TextInput
                    value={cepDisplay}
                    onChangeText={handleCEP}
                    placeholder="00000-000"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    maxLength={9}
                    style={{ flex: 1, color: Colors.white, fontSize: 15, paddingVertical: 13 }}
                  />
                  {cepLoading && <ActivityIndicator size="small" color={Colors.cyan} />}
                  {!cepLoading && cepFound && (
                    <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  )}
                </View>
                {!!cepError && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 2 }}>{cepError}</Text>}
                {!cepError && !!errors.postalCode && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 2 }}>{errors.postalCode}</Text>}
              </View>

              <FormField
                label="Logradouro"
                value={form.street}
                onChangeText={(t) => setField("street", t)}
                placeholder="Rua, Avenida, etc."
                error={errors.street}
              />

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Número"
                    value={form.number}
                    onChangeText={(t) => setField("number", t)}
                    placeholder="123"
                    error={errors.number}
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <FormField
                    label="Complemento"
                    value={form.complement}
                    onChangeText={(t) => setField("complement", t)}
                    placeholder="Apto, Bloco (opcional)"
                  />
                </View>
              </View>

              <FormField
                label="Bairro"
                value={form.neighborhood}
                onChangeText={(t) => setField("neighborhood", t)}
                placeholder="Bairro"
                error={errors.neighborhood}
              />

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 3 }}>
                  <FormField
                    label="Cidade"
                    value={form.city}
                    onChangeText={(t) => setField("city", t)}
                    placeholder="Cidade"
                    error={errors.city}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="UF"
                    value={form.state}
                    onChangeText={(t) => setField("state", t.toUpperCase().slice(0, 2))}
                    placeholder="SP"
                    autoCapitalize="characters"
                    maxLength={2}
                    error={errors.state}
                  />
                </View>
              </View>

              {/* Make default toggle — hide if already default or is the only address */}
              {!(isEditing && editingAddress?.isDefault) && (
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: Colors.bgCard,
                  borderRadius: 12, borderWidth: 1, borderColor: Colors.bgBorder,
                  paddingHorizontal: 14, paddingVertical: 12, gap: 12,
                }}>
                  <Ionicons name="star-outline" size={18} color={Colors.orange} />
                  <Text style={{ flex: 1, color: Colors.white, fontSize: 14 }}>
                    Definir como endereço padrão
                  </Text>
                  <Switch
                    value={makeDefault}
                    onValueChange={setMakeDefault}
                    disabled={addresses.length === 0}
                    trackColor={{ false: Colors.bgBorder, true: Colors.cyan + "88" }}
                    thumbColor={makeDefault ? Colors.cyan : Colors.textGray}
                  />
                </View>
              )}
            </View>

          {/* Botão de salvar dentro do scroll para subir com o teclado */}
          <View style={{ paddingTop: 24, paddingBottom: 8 }}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || cepLoading}
              activeOpacity={0.85}
              style={{
                backgroundColor: Colors.cyan,
                borderRadius: 14, paddingVertical: 15,
                alignItems: "center", justifyContent: "center",
                flexDirection: "row", gap: 8,
                opacity: saving || cepLoading ? 0.7 : 1,
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.bg} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color={Colors.bg} />
                  <Text style={{ color: Colors.bg, fontSize: 15, fontWeight: "900" }}>
                    {isEditing ? "Salvar Alterações" : "Adicionar Endereço"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
