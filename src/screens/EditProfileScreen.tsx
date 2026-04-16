import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { AlertModal } from "../components/AlertModal";

interface EditProfileScreenProps {
  visible: boolean;
  onClose: () => void;
}

export function EditProfileScreen({ visible, onClose }: EditProfileScreenProps) {
  const Colors = useColors();
  const { user, refreshUser } = useAuth();

  const isGoogle = user?.app_metadata?.provider !== "email";
  const currentAvatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const currentName: string = user?.user_metadata?.full_name ?? "";

  const [name, setName] = useState(currentName);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{
    type: "error" | "success";
    title: string;
    message: string;
  } | null>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (visible) {
      setName(user?.user_metadata?.full_name ?? "");
      setLocalImageUri(null);
    }
  }, [visible]);

  const currentAvatar = localImageUri ?? currentAvatarUrl ?? null;
  const initial = (name || user?.email || "?").charAt(0).toUpperCase();

  // ── Selecionar foto ──────────────────────────────────────────────────────────

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setAlert({
        type: "error",
        title: "Permissão negada",
        message: "Permita o acesso à galeria para escolher uma foto.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri);
    }
  };

  // ── Upload para Supabase Storage ─────────────────────────────────────────────

  const uploadAvatar = async (uri: string): Promise<string | null> => {
    const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileName = `${user!.id}/avatar.${ext}`;
    const contentType = ext === "png" ? "image/png" : "image/jpeg";

    // Busca o arquivo local e converte para ArrayBuffer
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { error } = await supabase.storage
      .from("avatars")
      .upload(fileName, bytes, { contentType, upsert: true });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    // Cache-buster para forçar reload da imagem
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  // ── Salvar ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setAlert({ type: "error", title: "Nome obrigatório", message: "Informe seu nome para continuar." });
      return;
    }

    setSaving(true);
    try {
      let avatarUrl: string | undefined;

      if (localImageUri) {
        const uploaded = await uploadAvatar(localImageUri);
        if (!uploaded) {
          setAlert({
            type: "error",
            title: "Erro no upload",
            message: "Não foi possível enviar a foto. Verifique sua conexão e tente novamente.",
          });
          return;
        }
        avatarUrl = uploaded;
      }

      const updateData: Record<string, string> = { full_name: trimmedName };
      if (avatarUrl) updateData.avatar_url = avatarUrl;

      const { error } = await supabase.auth.updateUser({ data: updateData });
      if (error) {
        setAlert({ type: "error", title: "Erro ao salvar", message: "Não foi possível atualizar o perfil." });
        return;
      }

      await refreshUser();
      onClose();
    } catch (err) {
      console.error("handleSave error:", err);
      setAlert({ type: "error", title: "Erro inesperado", message: "Ocorreu um erro ao salvar. Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top", "bottom"]}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >

                {/* Barra superior */}
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.bgBorder,
                }}>
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                  </TouchableOpacity>
                  <Text style={{
                    flex: 1,
                    textAlign: "center",
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: "800",
                  }}>
                    Editar Perfil
                  </Text>
                  {/* Espaço para centralizar o título */}
                  <View style={{ width: 32 }} />
                </View>

                {/* Avatar */}
                <View style={{ alignItems: "center", paddingTop: 36, paddingBottom: 32 }}>
                  <View style={{ position: "relative" }}>
                    {currentAvatar ? (
                      <Image
                        source={{ uri: currentAvatar }}
                        style={{
                          width: 96,
                          height: 96,
                          borderRadius: 48,
                          borderWidth: 3,
                          borderColor: Colors.cyan,
                        }}
                      />
                    ) : (
                      <View style={{
                        width: 96,
                        height: 96,
                        borderRadius: 48,
                        backgroundColor: Colors.cyan,
                        borderWidth: 3,
                        borderColor: Colors.cyan,
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <Text style={{ color: Colors.bg, fontSize: 36, fontWeight: "800" }}>{initial}</Text>
                      </View>
                    )}

                    {/* Botão de câmera — só para usuários de e-mail */}
                    {!isGoogle && (
                      <TouchableOpacity
                        onPress={handlePickImage}
                        activeOpacity={0.85}
                        style={{
                          position: "absolute",
                          bottom: 0,
                          right: 0,
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          backgroundColor: Colors.cyan,
                          borderWidth: 2,
                          borderColor: Colors.bg,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="camera" size={15} color={Colors.bg} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {isGoogle ? (
                    <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 10, textAlign: "center" }}>
                      Foto gerenciada pelo Google
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7} style={{ marginTop: 10 }}>
                      <Text style={{ color: Colors.cyan, fontSize: 13, fontWeight: "700" }}>
                        Alterar foto
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Campos */}
                <View style={{ paddingHorizontal: 16 }}>

                  {/* Nome */}
                  <Text style={{
                    color: Colors.textMuted,
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}>
                    Nome completo
                  </Text>
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: Colors.bgCard,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: Colors.bgBorder,
                    paddingHorizontal: 14,
                    marginBottom: 24,
                    gap: 10,
                  }}>
                    <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
                    <TextInput
                      style={{
                        flex: 1,
                        color: Colors.white,
                        fontSize: 15,
                        paddingVertical: 14,
                      }}
                      value={name}
                      onChangeText={setName}
                      placeholder="Seu nome"
                      placeholderTextColor={Colors.textMuted}
                      returnKeyType="done"
                      autoCapitalize="words"
                    />
                  </View>

                  {/* E-mail (somente leitura) */}
                  <Text style={{
                    color: Colors.textMuted,
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}>
                    E-mail
                  </Text>
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: Colors.bgCardAlt,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: Colors.bgBorder,
                    paddingHorizontal: 14,
                    marginBottom: 8,
                    gap: 10,
                    opacity: 0.6,
                  }}>
                    <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
                    <Text style={{
                      flex: 1,
                      color: Colors.textGray,
                      fontSize: 15,
                      paddingVertical: 14,
                    }}>
                      {user?.email ?? ""}
                    </Text>
                    <Ionicons name="lock-closed-outline" size={14} color={Colors.textMuted} />
                  </View>
                  <Text style={{ color: Colors.textMuted, fontSize: 11, marginBottom: 36 }}>
                    O e-mail não pode ser alterado por aqui.
                  </Text>

                  {/* Botão salvar */}
                  <TouchableOpacity
                    onPress={handleSave}
                    activeOpacity={0.88}
                    disabled={saving}
                    style={{ borderRadius: 14, overflow: "hidden", opacity: saving ? 0.6 : 1, marginBottom: 16 }}
                  >
                    <LinearGradient
                      colors={[Colors.cyan, "#0891b2"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ paddingVertical: 15, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
                    >
                      {saving ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={19} color="#fff" />
                          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>Salvar alterações</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                </View>
              </ScrollView>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </SafeAreaView>
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
