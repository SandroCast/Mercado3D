import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { supabase } from "../lib/supabase";
import { signInWithGoogle } from "../lib/googleSignIn";
import { useColors } from "../contexts/ThemeContext";
import { AlertModal, AlertType } from "../components/AlertModal";

type AuthMode = "login" | "register" | "forgot" | "verify";

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

function translateSupabaseError(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes("rate limit") || msg.includes("too many requests"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials"))
    return "E-mail ou senha incorretos.";
  if (msg.includes("email not confirmed"))
    return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  if (msg.includes("user already registered") || msg.includes("already been registered"))
    return "Este e-mail já está cadastrado.";
  if (msg.includes("password should be at least"))
    return "A senha deve ter pelo menos 8 caracteres.";
  if (msg.includes("unable to validate email address"))
    return "Endereço de e-mail inválido.";
  if (msg.includes("signup is disabled"))
    return "O cadastro está temporariamente desativado.";
  if (msg.includes("email link is invalid or has expired") || msg.includes("token has expired") || msg.includes("otp expired"))
    return "O código expirou ou é inválido. Solicite um novo.";
  if (msg.includes("network") || msg.includes("fetch"))
    return "Sem conexão com a internet. Verifique sua rede.";
  return message; // fallback: retorna o original se não reconhecer
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

  // Modal de alertas customizado (substitui Alert.alert nativo)
  const [alertModal, setAlertModal] = useState<{
    type: AlertType; title: string; message: string;
    confirmLabel?: string; onClose?: () => void;
  } | null>(null);

  const showAlert = (
    type: AlertType,
    title: string,
    message: string,
    onClose?: () => void,
    confirmLabel?: string,
  ) => setAlertModal({ type, title, message, confirmLabel, onClose });

  const closeAlert = () => {
    const cb = alertModal?.onClose;
    setAlertModal(null);
    cb?.();
  };

  // OTP — verificação de e-mail após cadastro
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpRefs = useRef<(TextInput | null)[]>([null, null, null, null, null, null]);

  // ─── OTP helpers ─────────────────────────────────────────────────────────────

  const handleOtpChange = (text: string, index: number) => {
    // Suporte a colar o código inteiro
    const clean = text.replace(/[^0-9]/g, "");
    if (clean.length > 1) {
      const digits = clean.slice(0, 6).split("");
      const newDigits = [...otpDigits];
      digits.forEach((d, i) => { if (i < 6) newDigits[i] = d; });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    const digit = clean.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otpDigits[index] && index > 0) {
      const newDigits = [...otpDigits];
      newDigits[index - 1] = "";
      setOtpDigits(newDigits);
      otpRefs.current[index - 1]?.focus();
    }
  };

  const resetOtp = () => setOtpDigits(["", "", "", "", "", ""]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleEmailAuth = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      showAlert("warning", "Atenção", "Informe seu e-mail.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      showAlert("warning", "E-mail inválido", "Informe um endereço de e-mail válido.");
      return;
    }

    if (mode === "login") {
      if (!password) {
        showAlert("warning", "Atenção", "Informe sua senha.");
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        // Mensagem genérica para não revelar se o e-mail existe ou não
        if (error) showAlert("error", "Erro ao entrar", "E-mail ou senha incorretos. Verifique seus dados e tente novamente.");
      } finally {
        setLoading(false);
      }

    } else if (mode === "register") {
      if (!name.trim()) {
        showAlert("warning", "Atenção", "Informe seu nome completo.");
        return;
      }
      if (!isValidPassword(password)) {
        showAlert("warning", "Senha fraca", "A senha deve ter pelo menos 8 caracteres.");
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { data: { full_name: name.trim(), app_email_confirmed: false } },
        });
        if (error) {
          showAlert("error", "Erro ao cadastrar", translateSupabaseError(error.message));
        }
        // Se não há erro e data.session existe (Confirm email OFF),
        // o AuthContext detecta a sessão e navega automaticamente.
      } finally {
        setLoading(false);
      }

    } else {
      // forgot
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
        if (error) {
          showAlert("error", "Erro", translateSupabaseError(error.message));
        } else {
          showAlert(
            "success",
            "E-mail enviado!",
            "Verifique sua caixa de entrada para redefinir sua senha.",
            () => setMode("login"),
            "Entendido",
          );
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join("");
    if (code.length !== 6) {
      showAlert("warning", "Atenção", "Insira o código completo de 6 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: "signup",
      });
      if (error) {
        showAlert(
          "error",
          "Código inválido",
          "O código está incorreto ou expirou. Verifique o e-mail ou solicite um novo código.",
          () => { resetOtp(); otpRefs.current[0]?.focus(); },
          "Tentar novamente",
        );
      }
      // Em caso de sucesso, o Supabase inicia a sessão automaticamente
      // e o AuthContext detecta via onAuthStateChange
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
      });
      if (error) {
        showAlert("error", "Erro ao reenviar", "Não foi possível reenviar o código. Tente novamente.");
      } else {
        resetOtp();
        otpRefs.current[0]?.focus();
        showAlert("success", "Código reenviado!", "Verifique sua caixa de entrada.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.success && !result.cancelled && result.error) {
        showAlert("error", "Erro ao entrar com Google", result.error);
      }
      // Se success: o AuthContext detecta a sessão via onAuthStateChange automaticamente
      // Se cancelled: sem mensagem — usuário escolheu não prosseguir
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── UI helpers ──────────────────────────────────────────────────────────────

  const titles: Record<AuthMode, { title: string; sub: string; btn: string }> = {
    login:    { title: "Bem-vindo de volta",    sub: "Entre na sua conta Mercado3D",                           btn: "Entrar"        },
    register: { title: "Criar conta",           sub: "Junte-se à comunidade Mercado3D",                        btn: "Criar conta"   },
    forgot:   { title: "Esqueceu a senha?",     sub: "Enviaremos um link de redefinição",                      btn: "Enviar e-mail" },
    verify:   { title: "Verifique seu e-mail",  sub: `Código enviado para\n${email.trim().toLowerCase()}`,     btn: "Verificar"     },
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

            {/* ── Modo verificação OTP ── */}
            {mode === "verify" ? (
              <>
                {/* Ícone de e-mail */}
                <View style={{ alignItems: "center", marginBottom: 28 }}>
                  <View style={{
                    width: 64, height: 64, borderRadius: 32,
                    backgroundColor: Colors.bgCardAlt,
                    borderWidth: 1, borderColor: Colors.bgBorder,
                    alignItems: "center", justifyContent: "center",
                    marginBottom: 12,
                  }}>
                    <Ionicons name="mail-unread-outline" size={30} color={Colors.cyan} />
                  </View>
                  <Text style={{ color: Colors.textGray, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
                    Insira o código de 6 dígitos{"\n"}enviado para seu e-mail.
                  </Text>
                </View>

                {/* 6 caixas OTP */}
                <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 32 }}>
                  {otpDigits.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={(ref) => { otpRefs.current[i] = ref; }}
                      style={{
                        width: 48, height: 56,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: digit ? Colors.cyan : Colors.bgBorder,
                        backgroundColor: Colors.bgCardAlt,
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                      value={digit}
                      onChangeText={(text) => handleOtpChange(text, i)}
                      onKeyPress={(e) => handleOtpKeyPress(e, i)}
                      keyboardType="number-pad"
                      maxLength={6} // permite colar 6 dígitos de uma vez
                      selectTextOnFocus
                      caretHidden
                    />
                  ))}
                </View>

                {/* Botão verificar */}
                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  activeOpacity={0.88}
                  disabled={loading}
                  style={{ borderRadius: 14, overflow: "hidden", marginBottom: 20, opacity: loading ? 0.6 : 1 }}
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

                {/* Reenviar código */}
                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={loading}
                  style={{ alignItems: "center", marginBottom: 16 }}
                >
                  <Text style={{ color: Colors.textMuted, fontSize: 14 }}>
                    Não recebeu?{" "}
                    <Text style={{ color: Colors.cyan, fontWeight: "700" }}>Reenviar código</Text>
                  </Text>
                </TouchableOpacity>

                {/* Voltar para cadastro */}
                <TouchableOpacity
                  onPress={() => { setMode("register"); resetOtp(); }}
                  style={{ alignItems: "center" }}
                >
                  <Text style={{ color: Colors.cyan, fontSize: 14, fontWeight: "700" }}>
                    ← Voltar
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* ── Modos: login / register / forgot ── */}

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
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de alertas customizado */}
      {alertModal && (
        <AlertModal
          visible
          type={alertModal.type}
          title={alertModal.title}
          message={alertModal.message}
          confirmLabel={alertModal.confirmLabel}
          onClose={closeAlert}
        />
      )}
    </SafeAreaView>
  );
}
