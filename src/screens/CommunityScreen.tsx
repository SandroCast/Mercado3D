import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image,
  Modal, Pressable, Alert, StatusBar, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { useColors } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MediaItem {
  url: string;
  type: "image" | "video" | "document" | "audio";
  name: string;
  duration?: number;
}

interface LinkMeta {
  url: string;
  title: string;
  description: string;
  image: string;
}

interface CommunityMessage {
  id: string;
  userId: string;
  content: string | null;
  createdAt: string;
  authorName: string;
  authorAvatar?: string;
  mediaItems?: MediaItem[];
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

const URL_REGEX = /https?:\/\/[^\s]+/i;
const GRID_W = 240;

function fmt(secs: number) {
  const s = Math.max(0, Math.round(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  const diffH = Math.floor(diffMin / 60);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function mapRow(r: any): CommunityMessage {
  return {
    id: r.id,
    userId: r.user_id,
    content: r.content ?? null,
    createdAt: r.created_at,
    authorName: r.profiles?.full_name ?? "Usuário",
    authorAvatar: r.profiles?.avatar_url ?? undefined,
    mediaItems: r.media_items ?? undefined,
    linkUrl: r.link_url ?? undefined,
    linkTitle: r.link_title ?? undefined,
    linkDescription: r.link_description ?? undefined,
    linkImage: r.link_image ?? undefined,
  };
}

async function fetchLinkPreview(url: string): Promise<LinkMeta | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "facebookexternalhit/1.1" } });
    const html = await res.text();
    const og = (p: string) =>
      html.match(new RegExp(`<meta[^>]+property="og:${p}"[^>]+content="([^"]+)"`, "i"))?.[1] ??
      html.match(new RegExp(`<meta[^>]+content="([^"]+)"[^>]+property="og:${p}"`, "i"))?.[1] ?? "";
    const title = og("title") || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || url;
    return { url, title, description: og("description"), image: og("image") };
  } catch {
    return null;
  }
}

async function uploadFile(userId: string, uri: string, mimeType: string, filename: string): Promise<string | null> {
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    const path = `${userId}/${Date.now()}_${filename}`;
    const { data, error } = await supabase.storage.from("community-media").upload(path, blob, { contentType: mimeType });
    if (error || !data) return null;
    const { data: { publicUrl } } = supabase.storage.from("community-media").getPublicUrl(data.path);
    return publicUrl;
  } catch {
    return null;
  }
}

// ─── Media Grid (WhatsApp-style) ──────────────────────────────────────────────

function MediaGrid({ items }: { items: MediaItem[] }) {
  const images = items.filter((i) => i.type === "image");
  const n = images.length;
  const half = (GRID_W - 2) / 2;

  if (n === 0) return null;

  if (n === 1) {
    return <Image source={{ uri: images[0].url }} style={{ width: GRID_W, height: 180 }} resizeMode="cover" />;
  }

  if (n === 2) {
    return (
      <View style={{ flexDirection: "row", gap: 2 }}>
        {images.map((img, i) => (
          <Image key={i} source={{ uri: img.url }} style={{ width: half, height: 140 }} resizeMode="cover" />
        ))}
      </View>
    );
  }

  if (n === 3) {
    return (
      <View style={{ gap: 2 }}>
        <Image source={{ uri: images[0].url }} style={{ width: GRID_W, height: 130 }} resizeMode="cover" />
        <View style={{ flexDirection: "row", gap: 2 }}>
          <Image source={{ uri: images[1].url }} style={{ width: half, height: 100 }} resizeMode="cover" />
          <Image source={{ uri: images[2].url }} style={{ width: half, height: 100 }} resizeMode="cover" />
        </View>
      </View>
    );
  }

  // 4+: 2×2 grid, last cell shows +N overlay
  const visible = images.slice(0, 4);
  const extra = n - 4;
  const pairs = [[visible[0], visible[1]], [visible[2], visible[3]]];

  return (
    <View style={{ gap: 2 }}>
      {pairs.map((pair, row) => (
        <View key={row} style={{ flexDirection: "row", gap: 2 }}>
          {pair.map((img, col) => {
            const isLast = row === 1 && col === 1;
            return (
              <View key={col} style={{ width: half, height: 120 }}>
                <Image source={{ uri: img.url }} style={{ width: half, height: 120 }} resizeMode="cover" />
                {isLast && extra > 0 && (
                  <View style={[StyleSheet.absoluteFillObject, styles.overlay]}>
                    <Text style={styles.overlayText}>+{extra}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Audio Player ─────────────────────────────────────────────────────────────

function AudioPlayer({ url, duration: initDuration, isMe }: { url: string; duration?: number; isMe: boolean }) {
  const Colors = useColors();
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(initDuration ?? 0);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => () => { soundRef.current?.unloadAsync(); }, []);

  const toggle = async () => {
    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setPosition((status.positionMillis ?? 0) / 1000);
          if (status.durationMillis) setTotalDuration(status.durationMillis / 1000);
          if (status.didJustFinish) { setPlaying(false); setPosition(0); }
        },
      );
      soundRef.current = sound;
      setPlaying(true);
    } else {
      const st = await soundRef.current.getStatusAsync();
      if (st.isLoaded && st.isPlaying) { await soundRef.current.pauseAsync(); setPlaying(false); }
      else { await soundRef.current.playAsync(); setPlaying(true); }
    }
  };

  const accent = isMe ? Colors.bg : Colors.cyan;
  const muted  = isMe ? Colors.bg + "66" : Colors.textMuted;
  const progress = totalDuration > 0 ? Math.min(position / totalDuration, 1) : 0;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 10, minWidth: 180 }}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.8}>
        <Ionicons name={playing ? "pause-circle" : "play-circle"} size={38} color={accent} />
      </TouchableOpacity>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ height: 3, backgroundColor: muted, borderRadius: 2, overflow: "hidden" }}>
          <View style={{ width: `${progress * 100}%`, height: 3, backgroundColor: accent, borderRadius: 2 }} />
        </View>
        <Text style={{ color: accent, fontSize: 11, opacity: 0.8 }}>{fmt(playing ? position : totalDuration)}</Text>
      </View>
      <Ionicons name="mic" size={14} color={muted} />
    </View>
  );
}

// ─── Link Preview Card ────────────────────────────────────────────────────────

function LinkPreviewCard({ meta, onDismiss }: { meta: LinkMeta; onDismiss?: () => void }) {
  const Colors = useColors();
  return (
    <View style={{ backgroundColor: Colors.bgCard, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: Colors.bgBorder }}>
      {!!meta.image && <Image source={{ uri: meta.image }} style={{ width: "100%", height: 120 }} resizeMode="cover" />}
      <View style={{ padding: 10, gap: 2 }}>
        {!!meta.title && <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "700" }} numberOfLines={2}>{meta.title}</Text>}
        {!!meta.description && <Text style={{ color: Colors.textMuted, fontSize: 11 }} numberOfLines={2}>{meta.description}</Text>}
        <Text style={{ color: Colors.cyan, fontSize: 11 }} numberOfLines={1}>{meta.url}</Text>
      </View>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
          <Ionicons name="close" size={14} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isMe }: { msg: CommunityMessage; isMe: boolean }) {
  const Colors = useColors();
  const bg   = isMe ? Colors.cyan : Colors.bgCard;
  const text = isMe ? Colors.bg   : Colors.white;

  const images   = msg.mediaItems?.filter((i) => i.type === "image")    ?? [];
  const audios   = msg.mediaItems?.filter((i) => i.type === "audio")    ?? [];
  const videos   = msg.mediaItems?.filter((i) => i.type === "video")    ?? [];
  const docs     = msg.mediaItems?.filter((i) => i.type === "document") ?? [];

  return (
    <View style={{ backgroundColor: bg, borderRadius: 16, borderBottomRightRadius: isMe ? 4 : 16, borderBottomLeftRadius: isMe ? 16 : 4, overflow: "hidden", borderWidth: isMe ? 0 : 1, borderColor: Colors.bgBorder }}>

      {/* Image grid */}
      {images.length > 0 && <MediaGrid items={images} />}

      {/* Videos */}
      {videos.map((v, i) => (
        <View key={i} style={{ width: GRID_W, height: 140, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="play-circle" size={52} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 11, marginTop: 4 }}>{v.name}</Text>
        </View>
      ))}

      {/* Documents */}
      {docs.map((d, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#fb923c22", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="document-text" size={20} color="#fb923c" />
          </View>
          <Text style={{ color: text, fontSize: 13, fontWeight: "600", flex: 1 }} numberOfLines={2}>{d.name}</Text>
        </View>
      ))}

      {/* Audio */}
      {audios.map((a, i) => (
        <AudioPlayer key={i} url={a.url} duration={a.duration} isMe={isMe} />
      ))}

      {/* Link preview */}
      {!!msg.linkUrl && (
        <View style={{ margin: 6 }}>
          <LinkPreviewCard meta={{ url: msg.linkUrl, title: msg.linkTitle ?? "", description: msg.linkDescription ?? "", image: msg.linkImage ?? "" }} />
        </View>
      )}

      {/* Text */}
      {!!msg.content && (
        <Text style={{ color: text, fontSize: 14, lineHeight: 20, paddingHorizontal: 12, paddingVertical: 8 }}>
          {msg.content}
        </Text>
      )}
    </View>
  );
}

// ─── Attachment Sheet ─────────────────────────────────────────────────────────

function AttachmentSheet({ visible, onClose, onPhoto, onVideo, onDocument }: {
  visible: boolean; onClose: () => void;
  onPhoto: () => void; onVideo: () => void; onDocument: () => void;
}) {
  const Colors = useColors();
  const opts = [
    { icon: "image-outline" as const,    label: "Foto",      color: Colors.cyan, action: onPhoto    },
    { icon: "videocam-outline" as const, label: "Vídeo",     color: "#a78bfa",   action: onVideo    },
    { icon: "document-outline" as const, label: "Documento", color: "#fb923c",   action: onDocument },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "#00000066" }} onPress={onClose} />
      <View style={{ backgroundColor: Colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: Platform.OS === "ios" ? 40 : 24 }}>
        <View style={{ width: 36, height: 4, backgroundColor: Colors.bgBorder, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          {opts.map((opt) => (
            <TouchableOpacity key={opt.label} onPress={() => { onClose(); setTimeout(opt.action, 300); }} activeOpacity={0.75} style={{ alignItems: "center", gap: 8, flex: 1 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: opt.color + "22", borderWidth: 1.5, borderColor: opt.color + "44", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={opt.icon} size={26} color={opt.color} />
              </View>
              <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: "600" }}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

// ─── Mercado3D Chat ───────────────────────────────────────────────────────────

function Mercado3DChat({ onBack, onLoginRequired }: { onBack: () => void; onLoginRequired?: () => void }) {
  const Colors = useColors();
  const { user, session } = useAuth();
  const [messages, setMessages]       = useState<CommunityMessage[]>([]);
  const [loading, setLoading]         = useState(true);
  const [text, setText]               = useState("");
  const [sending, setSending]         = useState(false);
  const [attachSheet, setAttachSheet] = useState(false);
  const [linkMeta, setLinkMeta]       = useState<LinkMeta | null>(null);
  const [linkFetching, setLinkFetching] = useState(false);
  const [recording, setRecording]     = useState<Audio.Recording | null>(null);
  const [recTime, setRecTime]         = useState(0);

  const listRef      = useRef<FlatList>(null);
  const linkDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recTimer     = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load messages ──────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("community_messages")
        .select("id, user_id, content, created_at, media_items, link_url, link_title, link_description, link_image, profiles!user_id(full_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(50);
      setMessages((data ?? []).map(mapRow));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel("community-global")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages" }, async (payload) => {
        const row = payload.new as any;
        const { data: p } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", row.user_id).single();
        const msg = mapRow({ ...row, profiles: p });
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [msg, ...prev]);
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadMessages]);

  // ── Link preview ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (linkDebounce.current) clearTimeout(linkDebounce.current);
    const match = text.match(URL_REGEX);
    if (!match) { setLinkMeta(null); return; }
    const url = match[0];
    linkDebounce.current = setTimeout(async () => {
      setLinkFetching(true);
      const meta = await fetchLinkPreview(url);
      setLinkMeta(meta);
      setLinkFetching(false);
    }, 900);
    return () => { if (linkDebounce.current) clearTimeout(linkDebounce.current); };
  }, [text]);

  // ── Send text ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const t = text.trim();
    if ((!t && !linkMeta) || sending || !user) return;
    setSending(true);
    setText("");
    const meta = linkMeta;
    setLinkMeta(null);
    const payload: any = { user_id: user.id, content: t || null };
    if (meta) { payload.link_url = meta.url; payload.link_title = meta.title; payload.link_description = meta.description; payload.link_image = meta.image; }
    try { await supabase.from("community_messages").insert(payload); }
    catch { setText(t); }
    finally { setSending(false); }
  };

  // ── Photos (multi-select) ──────────────────────────────────────────────────
  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permissão necessária", "Permita acesso à galeria."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.8 });
    if (result.canceled || !result.assets.length || !user) return;
    setSending(true);
    const uploaded: MediaItem[] = [];
    for (const asset of result.assets) {
      const name = asset.fileName ?? `photo_${Date.now()}.jpg`;
      const url = await uploadFile(user.id, asset.uri, asset.mimeType ?? "image/jpeg", name);
      if (url) uploaded.push({ url, type: "image", name });
    }
    if (uploaded.length) await supabase.from("community_messages").insert({ user_id: user.id, content: null, media_items: uploaded });
    setSending(false);
  };

  // ── Video ──────────────────────────────────────────────────────────────────
  const handlePickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permissão necessária", "Permita acesso à galeria."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"] });
    if (result.canceled || !result.assets[0] || !user) return;
    const asset = result.assets[0];
    setSending(true);
    const name = asset.fileName ?? `video_${Date.now()}.mp4`;
    const url = await uploadFile(user.id, asset.uri, asset.mimeType ?? "video/mp4", name);
    if (url) await supabase.from("community_messages").insert({ user_id: user.id, content: null, media_items: [{ url, type: "video", name }] });
    setSending(false);
  };

  // ── Document ───────────────────────────────────────────────────────────────
  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0] || !user) return;
    const asset = result.assets[0];
    setSending(true);
    const url = await uploadFile(user.id, asset.uri, asset.mimeType ?? "application/octet-stream", asset.name);
    if (url) await supabase.from("community_messages").insert({ user_id: user.id, content: null, media_items: [{ url, type: "document", name: asset.name }] });
    setSending(false);
  };

  // ── Audio recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permissão necessária", "Permita acesso ao microfone."); return; }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    setRecording(rec);
    setRecTime(0);
    recTimer.current = setInterval(() => setRecTime((t) => t + 1), 1000);
  };

  const stopRecording = async (send: boolean) => {
    if (!recording) return;
    if (recTimer.current) clearInterval(recTimer.current);
    const duration = recTime;
    try { await recording.stopAndUnloadAsync(); } catch {}
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = recording.getURI();
    setRecording(null);
    setRecTime(0);
    if (send && uri && user) {
      setSending(true);
      const name = `audio_${Date.now()}.m4a`;
      const url = await uploadFile(user.id, uri, "audio/m4a", name);
      if (url) await supabase.from("community_messages").insert({ user_id: user.id, content: null, media_items: [{ url, type: "audio", name, duration }] });
      setSending(false);
    }
  };

  const canSend = (text.trim().length > 0 || !!linkMeta) && !sending;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {/* Header */}
      <View style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder, backgroundColor: Colors.bgCard, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#22c55e22", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#22c55e44" }}>
          <Ionicons name="people" size={18} color="#22c55e" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "800" }}>Mercado3D</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 11 }}>Comunidade oficial</Text>
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.cyan} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          inverted
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: msg }) => {
            const isMe = msg.userId === user?.id;
            const initial = msg.authorName.charAt(0).toUpperCase();
            return (
              <View style={{ flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", gap: 8, marginBottom: 4 }}>
                {!isMe && (
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.cyan + "33", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {msg.authorAvatar
                      ? <Image source={{ uri: msg.authorAvatar }} style={{ width: 32, height: 32 }} />
                      : <Text style={{ color: Colors.cyan, fontSize: 13, fontWeight: "700" }}>{initial}</Text>}
                  </View>
                )}
                <View style={{ maxWidth: "78%" }}>
                  {!isMe && <Text style={{ color: Colors.textMuted, fontSize: 11, marginBottom: 3, marginLeft: 2 }}>{msg.authorName}</Text>}
                  <MessageBubble msg={msg} isMe={isMe} />
                  <Text style={{ color: Colors.textMuted, fontSize: 10, marginTop: 3, textAlign: isMe ? "right" : "left", marginHorizontal: 4 }}>{timeLabel(msg.createdAt)}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 60, gap: 12 }}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} />
              <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "700" }}>Seja o primeiro!</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center" }}>Inicie a conversa na comunidade Mercado3D.</Text>
            </View>
          }
        />
      )}

      {/* Input area */}
      {session ? (
        <View style={{ borderTopWidth: 1, borderTopColor: Colors.bgBorder, backgroundColor: Colors.bgCard }}>

          {/* Link preview */}
          {(linkFetching || linkMeta) && (
            <View style={{ paddingHorizontal: 10, paddingTop: 8 }}>
              {linkFetching
                ? <View style={{ padding: 10, alignItems: "center" }}><ActivityIndicator size="small" color={Colors.cyan} /></View>
                : linkMeta ? <LinkPreviewCard meta={linkMeta} onDismiss={() => setLinkMeta(null)} /> : null}
            </View>
          )}

          {/* Recording UI */}
          {recording ? (
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 16 }}>
              <TouchableOpacity onPress={() => stopRecording(false)} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={34} color={Colors.textMuted} />
              </TouchableOpacity>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" }} />
                <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "700" }}>{fmt(recTime)}</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Gravando...</Text>
              </View>
              <TouchableOpacity onPress={() => stopRecording(true)} disabled={sending} activeOpacity={0.8}>
                <Ionicons name="send-circle" size={44} color={Colors.cyan} />
              </TouchableOpacity>
            </View>
          ) : (
            /* Normal input bar */
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 10, paddingVertical: 10 }}>
              <TouchableOpacity onPress={() => setAttachSheet(true)} activeOpacity={0.7} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
                <Ionicons name="add-circle-outline" size={28} color={Colors.textMuted} />
              </TouchableOpacity>

              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Mensagem..."
                placeholderTextColor={Colors.textMuted}
                style={{ flex: 1, color: Colors.white, fontSize: 14, backgroundColor: Colors.bg, borderRadius: 20, borderWidth: 1, borderColor: Colors.bgBorder, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 120 }}
                multiline
                returnKeyType="default"
              />

              {canSend ? (
                <TouchableOpacity onPress={handleSend} disabled={sending} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.cyan, alignItems: "center", justifyContent: "center", marginBottom: 1 }}>
                  {sending ? <ActivityIndicator size="small" color={Colors.bg} /> : <Ionicons name="send" size={18} color={Colors.bg} />}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={startRecording} activeOpacity={0.7} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 1 }}>
                  <Ionicons name="mic-outline" size={26} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity onPress={onLoginRequired} style={{ margin: 12, padding: 14, borderRadius: 12, backgroundColor: Colors.cyan + "18", borderWidth: 1, borderColor: Colors.cyan + "33", alignItems: "center" }}>
          <Text style={{ color: Colors.cyan, fontSize: 14, fontWeight: "700" }}>Entre para participar da Comunidade</Text>
        </TouchableOpacity>
      )}

      <AttachmentSheet
        visible={attachSheet}
        onClose={() => setAttachSheet(false)}
        onPhoto={handlePickPhoto}
        onVideo={handlePickVideo}
        onDocument={handlePickDocument}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Community list ───────────────────────────────────────────────────────────

interface CommunityScreenProps {
  onLoginRequired?: () => void;
}

export function CommunityScreen({ onLoginRequired }: CommunityScreenProps) {
  const Colors = useColors();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <TouchableOpacity
        onPress={() => setChatOpen(true)}
        activeOpacity={0.75}
        style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder, gap: 12 }}
      >
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#22c55e22", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#22c55e55" }}>
          <Ionicons name="people" size={24} color="#22c55e" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "700", marginBottom: 2 }}>Mercado3D</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 13 }} numberOfLines={1}>Comunidade oficial do app</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={chatOpen} animationType="slide" statusBarTranslucent onRequestClose={() => setChatOpen(false)}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={["top", "bottom"]}>
          <Mercado3DChat onBack={() => setChatOpen(false)} onLoginRequired={onLoginRequired} />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "#00000088",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  dismissBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#00000088",
    borderRadius: 12,
    padding: 3,
  },
});
