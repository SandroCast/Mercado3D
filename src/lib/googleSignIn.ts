import { Platform } from "react-native";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { supabase } from "./supabase";
import { GOOGLE_WEB_CLIENT_ID } from "../config/auth";

// Configura o SDK do Google Sign-In uma única vez na inicialização do app
export function configureGoogleSignIn() {
  GoogleSignin.configure({
    // webClientId: obrigatório para obter o idToken que o Supabase valida
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ["email", "profile"],
    // iOS usa iosClientId separado — adicionar quando configurar o iOS
    ...(Platform.OS === "ios" && {
      // iosClientId: "SEU_IOS_CLIENT_ID.apps.googleusercontent.com",
    }),
    offlineAccess: false,
  });
}

export type GoogleSignInResult =
  | { success: true }
  | { success: false; cancelled: boolean; error?: string };

/**
 * Executa o fluxo nativo de Google Sign-In e autentica no Supabase.
 *
 * Retorna `{ success: true }` em caso de sucesso.
 * Retorna `{ success: false, cancelled: true }` se o usuário cancelou.
 * Retorna `{ success: false, cancelled: false, error }` em caso de erro.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  try {
    // Verifica se o Google Play Services está disponível e atualizado (Android)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Abre o seletor de conta nativo do sistema operacional
    const userInfo = await GoogleSignin.signIn();
    const idToken = userInfo.data?.idToken;

    if (!idToken) {
      return {
        success: false,
        cancelled: false,
        error: "Token de autenticação não recebido. Tente novamente.",
      };
    }

    // Autentica no Supabase usando o idToken do Google (fluxo seguro — sem expor credenciais)
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) {
      return { success: false, cancelled: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, cancelled: true };
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      // Login já em andamento — ignora silenciosamente
      return { success: false, cancelled: true };
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        success: false,
        cancelled: false,
        error: "Atualize o Google Play Services para continuar.",
      };
    }
    return {
      success: false,
      cancelled: false,
      error: "Não foi possível conectar com o Google. Tente novamente.",
    };
  }
}
