import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../lib/supabase";

const BUCKET = "product-images";

export async function pickImages(limit = 8): Promise<string[]> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      console.warn("Permissão de galeria negada");
      return [];
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: limit,
      quality: 0.8,
      exif: false,
    });

    if (result.canceled) return [];
    return result.assets.map((a) => a.uri);
  } catch (err) {
    console.warn("pickImages error:", err);
    return [];
  }
}

export async function uploadImage(userId: string, localUri: string): Promise<string | null> {
  try {
    const ext = localUri.split(".").pop()?.toLowerCase() ?? "jpg";
    const mime = ext === "png" ? "image/png" : "image/jpeg";
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `${userId}/${filename}`;

    const formData = new FormData();
    formData.append("file", { uri: localUri, name: filename, type: mime } as any);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, formData, { contentType: mime, upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn("uploadImage error:", err);
    return null;
  }
}

export async function uploadImages(userId: string, localUris: string[]): Promise<string[]> {
  const results = await Promise.all(localUris.map((uri) => uploadImage(userId, uri)));
  return results.filter((url): url is string => url !== null);
}

export interface PickedFile {
  uri:      string;
  name:     string;
  mimeType: string;
}

export async function pickFile(): Promise<PickedFile | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return null;
    const asset = result.assets[0];
    return {
      uri:      asset.uri,
      name:     asset.name,
      mimeType: asset.mimeType ?? "application/octet-stream",
    };
  } catch (err) {
    console.warn("pickFile error:", err);
    return null;
  }
}

export async function uploadFile(userId: string, file: PickedFile): Promise<string | null> {
  try {
    const ext      = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const path     = `${userId}/models/${filename}`;

    const formData = new FormData();
    formData.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as any);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, formData, { contentType: file.mimeType, upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn("uploadFile error:", err);
    return null;
  }
}

export async function deleteImage(publicUrl: string): Promise<void> {
  try {
    const url = new URL(publicUrl);
    const parts = url.pathname.split(`/${BUCKET}/`);
    if (parts.length < 2) return;
    const path = parts[1];
    await supabase.storage.from(BUCKET).remove([path]);
  } catch (err) {
    console.warn("deleteImage error:", err);
  }
}
