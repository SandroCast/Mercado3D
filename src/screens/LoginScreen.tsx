import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { supabase } from "../lib/supabase";
import { signInWithGoogle } from "../lib/googleSignIn";
import { useColors } from "../contexts/ThemeContext";

type AuthMode = "login" | "register" | "forgot";

interface LoginScreenProps {
  // Quando exibido como overlay sobre o app (usuário guest), permite fechar
  onClose?: () => void;
}

// Validações básicas do lado do cliente
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function LoginScreen({ onClose }: LoginScreenProps) {
  const Colors = useColors();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleEmailAuth = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert("Atenção", "Informe seu e-mail.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      Alert.alert("Atenção", "Informe um e-mail válido.");
      return;
    }

    if (mode === "login") {
      if (!password) {
        Alert.alert("Atenção", "Informe sua senha.");
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        // Mensagem genérica para não revelar se o e-mail existe ou não
        if (error) Alert.alert("Erro ao entrar", "E-mail ou senha incorretos.");
      } finally {
        setLoading(false);
      }

    } else if (mode === "register") {
      if (!name.trim()) {
        Alert.alert("Atenção", "Informe seu nome completo.");
        return;
      }
      if (!isValidPassword(password)) {
        Alert.alert("Atenção", "A senha deve ter pelo menos 8 caracteres.");
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) {
          Alert.alert("Erro ao cadastrar", error.message);
        } else {
          Alert.alert(
            "Quase lá!",
            "Verifique seu e-mail para confirmar o cadastro.",
            [{ text: "OK", onPress: () => setMode("login") }]
          );
        }
      } finally {
        setLoading(false);
      }

    } else {
      // forgot
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
        if (error) {
          Alert.alert("Erro", error.message);
        } else {
          Alert.alert(
            "E-mail enviado",
            "Verifique sua caixa de entrada para redefinir sua senha.",
            [{ text: "OK", onPress: () => setMode("login") }]
          );
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.success && !result.cancelled && result.error) {
        Alert.alert("Erro ao entrar com Google", result.error);
      }
      // Se success: o AuthContext detecta a sessão via onAuthStateChange automaticamente
      // Se cancelled: sem mensagem — usuário escolheu não prosseguir
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── UI helpers ──────────────────────────────────────────────────────────────

  const titles: Record<AuthMode, { title: string; sub: string; btn: string }> = {
    login:    { title: "Bem-vindo de volta",  sub: "Entre na sua conta Mercado3D",       btn: "Entrar"        },
    register: { title: "Criar conta",         sub: "Junte-se à comunidade Mercado3D",    btn: "Criar conta"   },
    forgot:   { title: "Esqueceu a senha?",   sub: "Enviaremos um link de redefinição",  btn: "Enviar e-mail" },
  };
  const { title, sub, btn } = titles[mode];

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero topo */}
          <LinearGradient
            colors={["#0d1117", "#0c1a2e"]}
            style={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: 48, alignItems: "center" }}
          >
            {/* Botão fechar — só no modo overlay */}
            {onClose && (
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ position: "absolute", top: 16, right: 20 }}
              >
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            )}

            {/* Logo */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 32 }}>
              <View style={{
                backgroundColor: Colors.cyan, borderRadius: 10,
                width: 40, height: 40, alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ color: "#0d1117", fontSize: 15, fontWeight: "900" }}>3D</Text>
              </View>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -0.5 }}>
                MERCADO<Text style={{ color: Colors.cyan }}>3D</Text>
              </Text>
            </View>

            <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800", textAlign: "center" }}>
              {title}
            </Text>
            <Text style={{ color: "#94a3b8", fontSize: 14, marginTop: 6, textAlign: "center" }}>
              {sub}
            </Text>
          </LinearGradient>

          {/* Card formulário */}
          <View style={{
            flex: 1,
            backgroundColor: Colors.bgCard,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            marginTop: -20,
            paddingHorizontal: 24,
            paddingTop: 32,
            paddingBottom: 24,
          }}>

            {/* Botão Google — nativo, sem browser */}
            {mode !== "forgot" && (
              <>
                <TouchableOpacity
                  onPress={handleGoogleLogin}
                  activeOpacity={0.85}
                  disabled={googleLoading || loading}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    paddingVertical: 14,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: Colors.bgBorder,
                    backgroundColor: Colors.bgCardAlt,
                    marginBottom: 24,
                    opacity: googleLoading || loading ? 0.6 : 1,
                  }}
                >
                  {googleLoading ? (
                    <ActivityIndicator size="small" color={Colors.cyan} />
                  ) : (
                    <>
                      <View style={{
                        width: 20, height: 20, borderRadius: 10,
                        backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
                      }}>
                        <Text style={{ fontSize: 13, fontWeight: "900", color: "#4285F4" }}>G</Text>
                      </View>
                      <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "600" }}>
                        Continuar com Google
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Divisor */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: Colors.bgBorder }} />
                  <Text style={{ color: Colors.textMuted, fontSize: 13 }}>ou</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: Colors.bgBorder }} />
                </View>
              </>
            )}

            {/* Campo nome (só no register) */}
            {mode === "register" && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 6 }}>
                  Nome completo
                </Text>
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: Colors.bgCardAlt, borderRadius: 12,
                  borderWidth: 1, borderColor: Colors.bgBorder, paddingHorizontal: 14, gap: 10,
                }}>
                  <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={{ flex: 1, color: Colors.white, fontSize: 15, paddingVertical: 14 }}
                    placeholder="Seu nome"
                    placeholderTextColor={Colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={100}
                  />
                </View>
              </View>
            )}

            {/* Campo e-mail */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 6 }}>
                E-mail
              </Text>
              <View style={{
                flexDirection: "row", alignItems: "center",
                backgroundColor: Colors.bgCardAlt, borderRadius: 12,
                borderWidth: 1, borderColor: Colors.bgBorder, paddingHorizontal: 14, gap: 10,
              }}>
                <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
                <TextInput
                  style={{ flex: 1, color: Colors.white, fontSize: 15, paddingVertical: 14 }}
                  placeholder="seu@email.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  maxLength={254}
                />
              </View>
            </View>

            {/* Campo senha */}
            {mode !== "forgot" && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ color: Colors.textGray, fontSize: 13, fontWeight: "600", marginBottom: 6 }}>
                  Senha
                </Text>
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: Colors.bgCardAlt, borderRadius: 12,
                  borderWidth: 1, borderColor: Colors.bgBorder, paddingHorizontal: 14, gap: 10,
                }}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={{ flex: 1, color: Colors.white, fontSize: 15, paddingVertical: 14 }}
                    placeholder={mode === "register" ? "Mínimo 8 caracteres" : "••••••••"}
                    placeholderTextColor={Colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    textContentType={mode === "register" ? "newPassword" : "password"}
                    maxLength={128}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Esqueci senha (só no login) */}
            {mode === "login" && (
              <TouchableOpacity
                onPress={() => setMode("forgot")}
                style={{ alignSelf: "flex-end", marginBottom: 24, marginTop: 4 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ color: Colors.cyan, fontSize: 13, fontWeight: "600" }}>
                  Esqueci minha senha
                </Text>
              </TouchableOpacity>
            )}

            {mode !== "login" && <View style={{ height: 24 }} />}

            {/* Botão principal */}
            <TouchableOpacity
              onPress={handleEmailAuth}
              activeOpacity={0.88}
              disabled={loading || googleLoading}
              style={{ borderRadius: 14, overflow: "hidden", marginBottom: 20, opacity: loading || googleLoading ? 0.6 : 1 }}
            >
              <LinearGradient
                colors={[Colors.cyan, "#0891b2"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 16, alignItems: "center" }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>{btn}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Footer — alternar modo */}
            {mode === "login" && (
              <TouchableOpacity onPress={() => setMode("register")} style={{ alignItems: "center" }}>
                <Text style={{ color: Colors.textMuted, fontSize: 14 }}>
                  Não tem conta?{" "}
                  <Text style={{ color: Colors.cyan, fontWeight: "700" }}>Criar agora</Text>
                </Text>
              </TouchableOpacity>
            )}

            {mode === "register" && (
              <TouchableOpacity onPress={() => setMode("login")} style={{ alignItems: "center" }}>
                <Text style={{ color: Colors.textMuted, fontSize: 14 }}>
                  Já tem conta?{" "}
                  <Text style={{ color: Colors.cyan, fontWeight: "700" }}>Entrar</Text>
                </Text>
              </TouchableOpacity>
            )}

            {mode === "forgot" && (
              <TouchableOpacity onPress={() => setMode("login")} style={{ alignItems: "center" }}>
                <Text style={{ color: Colors.cyan, fontSize: 14, fontWeight: "700" }}>
                  ← Voltar ao login
                </Text>
              </TouchableOpacity>
            )}

            {/* Termos */}
            {mode === "register" && (
              <Text style={{
                color: Colors.textMuted, fontSize: 11,
                textAlign: "center", marginTop: 20, lineHeight: 16,
              }}>
                Ao criar uma conta, você concorda com os{" "}
                <Text style={{ color: Colors.cyan }}>Termos de Uso</Text> e a{" "}
                <Text style={{ color: Colors.cyan }}>Política de Privacidade</Text>.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
