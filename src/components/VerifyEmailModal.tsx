import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { AlertModal } from "./AlertModal";

interface VerifyEmailModalProps {
  visible: boolean;
  onClose: () => void;
}

type Step = "prompt" | "code";

// Deve bater com "Email OTP expiration" no Supabase
const OTP_DURATION = 600; // 10 minutos

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VerifyEmailModal({ visible, onClose }: VerifyEmailModalProps) {
  const Colors = useColors();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("prompt");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const refs = useRef<(TextInput | null)[]>([null, null, null, null, null, null]);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const codeExpiryRef = useRef<number>(0);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [alert, setAlert] = useState<{
    title: string; message: string; type: "error" | "success";
  } | null>(null);

  // Keyboard listener — funciona dentro de Modal no Android
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardOffset(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardOffset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Ao abrir o modal: decide se vai direto pro código ou pro prompt
  useEffect(() => {
    if (!visible) return;
    const remaining = Math.floor((codeExpiryRef.current - Date.now()) / 1000);
    if (remaining > 0) {
      setStep("code");
      setTimeLeft(remaining);
    } else {
      setStep("prompt");
      setTimeLeft(0);
      resetDigits();
    }
  }, [visible]);

  // Contagem regressiva
  useEffect(() => {
    if (!visible || step !== "code" || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStep("prompt");
          codeExpiryRef.current = 0;
          resetDigits();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, step]);

  const resetDigits = () => setDigits(["", "", "", "", "", ""]);

  const handleClose = () => {
    resetDigits();
    Keyboard.dismiss();
    onClose();
  };

  // ── Etapa 1: envia o código ───────────────────────────────────────────────

  const handleSendCode = async () => {
    if (!user?.email) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: { shouldCreateUser: false },
      });
      if (error) {
        setAlert({
          type: "error",
          title: "Erro ao enviar",
          message: "Não foi possível enviar o código. Tente novamente.",
        });
      } else {
        codeExpiryRef.current = Date.now() + OTP_DURATION * 1000;
        setTimeLeft(OTP_DURATION);
        setStep("code");
        setTimeout(() => refs.current[0]?.focus(), 400);
      }
    } finally {
      setSending(false);
    }
  };

  // ── Etapa 2: verifica o código ────────────────────────────────────────────

  const handleChange = (text: string, index: number) => {
    const clean = text.replace(/[^0-9]/g, "");
    if (clean.length > 1) {
      const arr = clean.slice(0, 6).split("");
      const next = [...digits];
      arr.forEach((d, i) => { if (i < 6) next[i] = d; });
      setDigits(next);
      refs.current[Math.min(arr.length, 5)]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = clean.slice(-1);
    setDigits(next);
    if (clean && index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      refs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length !== 6) {
      setAlert({ type: "error", title: "Atenção", message: "Insira o código completo de 6 dígitos." });
      return;
    }
    if (!user?.email) return;

    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: user.email,
        token: code,
        type: "email",
      });
      if (error) {
        setAlert({
          type: "error",
          title: "Código inválido",
          message: "O código está incorreto ou expirou. Solicite um novo código.",
        });
        resetDigits();
        refs.current[0]?.focus();
      } else {
        await supabase.auth.updateUser({ data: { app_email_confirmed: true } });
        codeExpiryRef.current = 0;
        handleClose();
      }
    } finally {
      setVerifying(false);
    }
  };

  const timerColor = timeLeft > 120 ? Colors.cyan : timeLeft > 60 ? "#f59e0b" : "#ef4444";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)" }}>

          {/* Backdrop */}
          <TouchableWithoutFeedback onPress={handleClose}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>

          {/* Sheet — sobe junto com o teclado via marginBottom */}
          <View style={{
            backgroundColor: Colors.bgCard,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 32,
            borderTopWidth: 1,
            borderColor: Colors.bgBorder,
            marginBottom: keyboardOffset,
          }}>
            {/* Handle */}
            <View style={{
              width: 40, height: 4, borderRadius: 2,
              backgroundColor: Colors.bgBorder,
              alignSelf: "center", marginBottom: 24,
            }} />

            {/* Cabeçalho */}
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
            }}>
              <Text style={{ color: Colors.white, fontSize: 20, fontWeight: "800" }}>
                Verificar e-mail
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* ── Etapa 1 ── */}
            {step === "prompt" && (
              <>
                <View style={{ alignItems: "center", marginBottom: 24 }}>
                  <View style={{
                    width: 72, height: 72, borderRadius: 36,
                    backgroundColor: "#78350f",
                    borderWidth: 1.5, borderColor: "#92400e",
                    alignItems: "center", justifyContent: "center",
                    marginBottom: 16,
                  }}>
                    <Ionicons name="mail-outline" size={32} color="#fbbf24" />
                  </View>
                  <Text style={{
                    color: Colors.white, fontSize: 15, fontWeight: "700",
                    textAlign: "center", marginBottom: 8,
                  }}>
                    Confirme seu endereço de e-mail
                  </Text>
                  <Text style={{
                    color: Colors.textMuted, fontSize: 13,
                    textAlign: "center", lineHeight: 20,
                  }}>
                    Vamos enviar um código de 6 dígitos para{"\n"}
                    <Text style={{ color: Colors.textGray, fontWeight: "600" }}>
                      {user?.email}
                    </Text>
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleSendCode}
                  activeOpacity={0.88}
                  disabled={sending}
                  style={{ borderRadius: 14, overflow: "hidden", opacity: sending ? 0.6 : 1 }}
                >
                  <LinearGradient
                    colors={["#f59e0b", "#d97706"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{
                      paddingVertical: 15, alignItems: "center",
                      flexDirection: "row", justifyContent: "center", gap: 8,
                    }}
                  >
                    {sending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send-outline" size={17} color="#1c1917" />
                        <Text style={{ color: "#1c1917", fontSize: 16, fontWeight: "800" }}>
                          Enviar código
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* ── Etapa 2 ── */}
            {step === "code" && (
              <>
                <Text style={{
                  color: Colors.textMuted, fontSize: 13,
                  textAlign: "center", marginBottom: 20, lineHeight: 20,
                }}>
                  Código enviado para{"\n"}
                  <Text style={{ color: Colors.textGray, fontWeight: "600" }}>{user?.email}</Text>
                </Text>

                {/* Caixas OTP */}
                <View style={{
                  flexDirection: "row", justifyContent: "center",
                  gap: 10, marginBottom: 16,
                }}>
                  {digits.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={(r) => { refs.current[i] = r; }}
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
                      onChangeText={(t) => handleChange(t, i)}
                      onKeyPress={(e) => handleKeyPress(e, i)}
                      keyboardType="number-pad"
                      maxLength={6}
                      selectTextOnFocus
                      caretHidden
                    />
                  ))}
                </View>

                {/* Timer */}
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  justifyContent: "center", gap: 5, marginBottom: 20,
                }}>
                  <Ionicons name="time-outline" size={14} color={timerColor} />
                  <Text style={{ color: timerColor, fontSize: 13, fontWeight: "600" }}>
                    Código válido por{" "}
                    <Text style={{ fontWeight: "800" }}>{formatTime(timeLeft)}</Text>
                  </Text>
                </View>

                {/* Botão confirmar */}
                <TouchableOpacity
                  onPress={handleVerify}
                  activeOpacity={0.88}
                  disabled={verifying}
                  style={{
                    borderRadius: 14, overflow: "hidden",
                    marginBottom: 16, opacity: verifying ? 0.6 : 1,
                  }}
                >
                  <LinearGradient
                    colors={[Colors.cyan, "#0891b2"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ paddingVertical: 15, alignItems: "center" }}
                  >
                    {verifying
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>Confirmar e-mail</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                {/* Reenviar — só aparece quando o timer expirou (timeLeft === 0) */}
                {timeLeft === 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      codeExpiryRef.current = 0;
                      setStep("prompt");
                      resetDigits();
                    }}
                    style={{ alignItems: "center" }}
                  >
                    <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
                      Não recebeu?{" "}
                      <Text style={{ color: Colors.cyan, fontWeight: "700" }}>Reenviar código</Text>
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {alert && (
        <AlertModal
          visible
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
    </>
  );
}
