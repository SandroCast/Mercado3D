import React, { useEffect, useState } from "react";
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, ActivityIndicator, Platform, StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskCNPJ(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim().replace(/-$/, "");
  }
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim().replace(/-$/, "");
}

function maskDate(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2");
}

function isValidCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(d[10]);
}

function isValidCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (n: string, weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + parseInt(n[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return (
    calc(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === parseInt(d[12]) &&
    calc(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === parseInt(d[13])
  );
}

function dateToISO(ddmmyyyy: string): string | null {
  const [dd, mm, yyyy] = ddmmyyyy.split("/");
  if (!dd || !mm || !yyyy || yyyy.length < 4) return null;
  const d = new Date(`${yyyy}-${mm}-${dd}`);
  if (isNaN(d.getTime())) return null;
  if (d >= new Date()) return null;
  return `${yyyy}-${mm}-${dd}`;
}

function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const [yyyy, mm, dd] = iso.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

// ─── FormField ────────────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "phone-pad";
  error?: string;
  maxLength?: number;
  editable?: boolean;
  hint?: string;
}

function FormField({
  label, value, onChangeText, placeholder,
  keyboardType = "default", error, maxLength, editable = true, hint,
}: FormFieldProps) {
  const Colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600" }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        editable={editable}
        style={{
          backgroundColor: editable ? Colors.bgCard : Colors.bg,
          borderWidth: 1,
          borderColor: error ? Colors.error : Colors.bgBorder,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 13,
          color: editable ? Colors.white : Colors.textMuted,
          fontSize: 15,
        }}
      />
      {!!error && (
        <Text style={{ color: Colors.error, fontSize: 11 }}>{error}</Text>
      )}
      {!error && !!hint && (
        <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{hint}</Text>
      )}
    </View>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FormErrors = {
  cpfCnpj?: string;
  phone?: string;
  birthDate?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PersonalDataScreen({ visible, onClose }: Props) {
  const Colors = useColors();
  const { user } = useAuth();

  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [errors,   setErrors]   = useState<FormErrors>({});

  const [personType, setPersonType] = useState<"pf" | "pj">("pf");
  const [cpfCnpj,    setCpfCnpj]    = useState("");
  const [phone,      setPhone]      = useState("");
  const [birthDate,  setBirthDate]  = useState("");

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";
  const email    = user?.email ?? "";

  useEffect(() => {
    if (!visible || !user) return;
    setErrors({});
    setLoading(true);
    supabase
      .from("profiles")
      .select("person_type, cpf_cnpj, phone, birth_date")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const pt = (data.person_type as "pf" | "pj") ?? "pf";
          setPersonType(pt);
          setCpfCnpj(data.cpf_cnpj ? (pt === "pj" ? maskCNPJ(data.cpf_cnpj) : maskCPF(data.cpf_cnpj)) : "");
          setPhone(data.phone ? maskPhone(data.phone) : "");
          setBirthDate(data.birth_date ? isoToDisplay(data.birth_date) : "");
        }
      })
      .finally(() => setLoading(false));
  }, [visible, user]);

  const handlePersonTypeChange = (type: "pf" | "pj") => {
    setPersonType(type);
    setCpfCnpj("");
    setErrors((prev) => ({ ...prev, cpfCnpj: undefined }));
  };

  const setField = (
    setter: (v: string) => void,
    key: keyof FormErrors,
    value: string,
  ) => {
    setter(value);
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: FormErrors = {};

    const rawDoc = cpfCnpj.replace(/\D/g, "");
    if (!rawDoc) {
      e.cpfCnpj = personType === "pf" ? "CPF obrigatório" : "CNPJ obrigatório";
    } else if (personType === "pf" && !isValidCPF(cpfCnpj)) {
      e.cpfCnpj = "CPF inválido";
    } else if (personType === "pj" && !isValidCNPJ(cpfCnpj)) {
      e.cpfCnpj = "CNPJ inválido";
    }

    const rawPhone = phone.replace(/\D/g, "");
    if (!rawPhone) {
      e.phone = "Telefone obrigatório";
    } else if (rawPhone.length < 10) {
      e.phone = "Telefone inválido";
    }

    if (personType === "pf") {
      if (!birthDate) {
        e.birthDate = "Data de nascimento obrigatória";
      } else if (birthDate.replace(/\D/g, "").length < 8) {
        e.birthDate = "Data de nascimento incompleta";
      } else if (!dateToISO(birthDate)) {
        e.birthDate = "Data de nascimento inválida";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          person_type: personType,
          cpf_cnpj:    cpfCnpj.replace(/\D/g, ""),
          phone:       phone.replace(/\D/g, ""),
          birth_date:  personType === "pf" ? dateToISO(birthDate) : null,
          updated_at:  new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      onClose();
    } catch (e) {
      console.warn("PersonalData save error:", e);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top"]}>

        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 12,
          paddingHorizontal: 16, paddingVertical: 14,
          backgroundColor: Colors.bgCard,
          borderBottomWidth: 1, borderBottomColor: Colors.bgBorder,
        }}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={{ flex: 1, color: Colors.white, fontSize: 18, fontWeight: "800" }}>
            Dados Pessoais
          </Text>
          {saving && <ActivityIndicator size="small" color={Colors.cyan} />}
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={Colors.cyan} />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Nome — somente leitura */}
            <FormField
              label="Nome completo"
              value={fullName}
              onChangeText={() => {}}
              editable={false}
              hint="Altere o nome na tela de edição de perfil."
            />

            {/* E-mail — somente leitura */}
            <FormField
              label="E-mail"
              value={email}
              onChangeText={() => {}}
              editable={false}
            />

            {/* Tipo de pessoa */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600" }}>
                Tipo de cadastro
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {(["pf", "pj"] as const).map((t) => {
                  const sel = personType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => handlePersonTypeChange(t)}
                      style={{
                        flex: 1, flexDirection: "row", alignItems: "center",
                        justifyContent: "center", gap: 8,
                        paddingVertical: 13, borderRadius: 12,
                        backgroundColor: sel ? Colors.cyan + "20" : Colors.bgCard,
                        borderWidth: 1.5,
                        borderColor: sel ? Colors.cyan : Colors.bgBorder,
                      }}
                    >
                      <Ionicons
                        name={t === "pf" ? "person-outline" : "business-outline"}
                        size={17}
                        color={sel ? Colors.cyan : Colors.textGray}
                      />
                      <Text style={{
                        color: sel ? Colors.cyan : Colors.white,
                        fontSize: 13, fontWeight: sel ? "700" : "500",
                      }}>
                        {t === "pf" ? "Pessoa Física" : "Pessoa Jurídica"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* CPF / CNPJ */}
            <View style={{ gap: 6 }}>
              <FormField
                label={personType === "pf" ? "CPF" : "CNPJ"}
                value={cpfCnpj}
                onChangeText={(v) => setField(
                  (val) => setCpfCnpj(personType === "pj" ? maskCNPJ(val) : maskCPF(val)),
                  "cpfCnpj",
                  v,
                )}
                placeholder={personType === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
                keyboardType="numeric"
                error={errors.cpfCnpj}
              />
              {!errors.cpfCnpj && cpfCnpj.length > 0 && (() => {
                const digits = cpfCnpj.replace(/\D/g, "");
                const full   = personType === "pf" ? digits.length === 11 : digits.length === 14;
                if (!full) return null;
                const valid = personType === "pf" ? isValidCPF(cpfCnpj) : isValidCNPJ(cpfCnpj);
                return (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons
                      name={valid ? "checkmark-circle" : "close-circle"}
                      size={14}
                      color={valid ? Colors.success : Colors.error}
                    />
                    <Text style={{ color: valid ? Colors.success : Colors.error, fontSize: 11 }}>
                      {valid
                        ? (personType === "pf" ? "CPF válido" : "CNPJ válido")
                        : (personType === "pf" ? "CPF inválido" : "CNPJ inválido")}
                    </Text>
                  </View>
                );
              })()}
            </View>

            {/* Telefone */}
            <FormField
              label="Telefone / WhatsApp"
              value={phone}
              onChangeText={(v) => setField((val) => setPhone(maskPhone(val)), "phone", v)}
              placeholder="(00) 00000-0000"
              keyboardType="phone-pad"
              error={errors.phone}
            />

            {/* Data de nascimento — somente PF */}
            {personType === "pf" && (
              <FormField
                label="Data de nascimento"
                value={birthDate}
                onChangeText={(v) => setField((val) => setBirthDate(maskDate(val)), "birthDate", v)}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                maxLength={10}
                error={errors.birthDate}
              />
            )}

            {/* Botão salvar */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                backgroundColor: saving ? Colors.bgBorder : Colors.cyan,
                borderRadius: 14, paddingVertical: 15,
                alignItems: "center", marginTop: 8,
              }}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.bg} />
              ) : (
                <Text style={{ color: Colors.bg, fontSize: 16, fontWeight: "800" }}>
                  Salvar
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
