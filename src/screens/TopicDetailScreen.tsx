import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  StatusBar,
  Modal,
  BackHandler,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useForum, ForumTopic, ForumPost } from "../contexts/ForumContext";
import { ForumCategory } from "./TopicListScreen";
import { ConfirmModal } from "../components/ConfirmModal";
import { AlertModal } from "../components/AlertModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)          return "agora";
  if (diff < 3600)        return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)       return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 30)  return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / (86400 * 30))} meses`;
}

// ─── Reply grouper ────────────────────────────────────────────────────────────

interface NestedReply {
  post:        ForumPost;
  mentionName: string;
}

interface PostGroup {
  root:   ForumPost;
  nested: NestedReply[];
}

function groupPosts(posts: ForumPost[]): PostGroup[] {
  const byId: Record<string, ForumPost> = {};
  for (const p of posts) byId[p.id] = p;

  const childrenOf: Record<string, string[]> = {};
  for (const p of posts) {
    if (p.parentId) {
      if (!childrenOf[p.parentId]) childrenOf[p.parentId] = [];
      childrenOf[p.parentId].push(p.id);
    }
  }

  function collectNested(postId: string, parentAuthorName: string): NestedReply[] {
    const post = byId[postId];
    if (!post) return [];
    const items: NestedReply[] = [{ post, mentionName: parentAuthorName }];
    for (const childId of (childrenOf[postId] ?? [])) {
      items.push(...collectNested(childId, post.authorName));
    }
    return items;
  }

  const result: PostGroup[] = [];
  for (const p of posts) {
    if (!p.parentId) {
      const nested: NestedReply[] = [];
      for (const childId of (childrenOf[p.id] ?? [])) {
        nested.push(...collectNested(childId, p.authorName));
      }
      result.push({ root: p, nested });
    }
  }
  return result;
}

// ─── ActionSheet ──────────────────────────────────────────────────────────────

interface ActionSheetOption {
  label:        string;
  icon:         keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress:      () => void;
}

function ActionSheet({
  visible,
  options,
  onClose,
}: {
  visible: boolean;
  options: ActionSheetOption[];
  onClose: () => void;
}) {
  const Colors    = useColors();
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue:         visible ? 0 : 300,
      duration:        260,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
          <TouchableWithoutFeedback>
            <Animated.View style={{
              backgroundColor:      Colors.bgCard,
              borderTopLeftRadius:  20,
              borderTopRightRadius: 20,
              borderWidth:          1,
              borderColor:          Colors.bgBorder,
              paddingBottom:        28,
              transform:            [{ translateY: slideAnim }],
            }}>
              <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 6 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.bgBorder }} />
              </View>

              {options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.7}
                  onPress={() => { onClose(); setTimeout(opt.onPress, 150); }}
                  style={{
                    flexDirection:     "row",
                    alignItems:        "center",
                    gap:               14,
                    paddingHorizontal: 22,
                    paddingVertical:   15,
                    borderTopWidth:    i === 0 ? 0 : 1,
                    borderTopColor:    Colors.bgBorder,
                  }}
                >
                  <View style={{
                    width:           36,
                    height:          36,
                    borderRadius:    10,
                    backgroundColor: (opt.destructive ? Colors.error : Colors.cyan) + "18",
                    alignItems:      "center",
                    justifyContent:  "center",
                  }}>
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={opt.destructive ? Colors.error : Colors.cyan}
                    />
                  </View>
                  <Text style={{
                    color:      opt.destructive ? Colors.error : Colors.white,
                    fontSize:   15,
                    fontWeight: "500",
                  }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={{ height: 1, backgroundColor: Colors.bgBorder }} />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                style={{ paddingVertical: 16, alignItems: "center" }}
              >
                <Text style={{ color: Colors.textGray, fontSize: 15, fontWeight: "600" }}>Cancelar</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── NodeCtx ─────────────────────────────────────────────────────────────────

interface NodeCtx {
  session:           boolean;
  userId:            string | null;
  isTopicAuthor:     boolean;
  topicAuthorId:     string;
  isLocked:          boolean;
  replyingTo:        string | null;
  replyText:         string;
  sendingReply:      boolean;
  editingPostId:     string | null;
  editText:          string;
  savingEdit:        boolean;
  onSetReplyTo:      (id: string | null) => void;
  onReplyTextChange: (t: string) => void;
  onSubmitReply:     (parentId: string | null) => void;
  onVote:            (postId: string, vote: 1 | -1) => void;
  onEdit:            (post: ForumPost) => void;
  onEditTextChange:  (t: string) => void;
  onSaveEdit:        () => void;
  onCancelEdit:      () => void;
  onDelete:          (postId: string) => void;
  onMarkSolution:    (post: ForumPost) => void;
  onShowActionSheet: (options: ActionSheetOption[]) => void;
  onReport:          () => void;
}

// ─── InlineReply ──────────────────────────────────────────────────────────────

function InlineReply({
  replyingToName,
  ctx,
  parentId,
}: {
  replyingToName: string;
  ctx:            NodeCtx;
  parentId:       string | null;
}) {
  const Colors = useColors();
  return (
    <View style={{
      marginTop:       8,
      backgroundColor: Colors.bgCardAlt,
      borderRadius:    10,
      padding:         12,
      gap:             8,
      borderWidth:     1,
      borderColor:     Colors.cyan + "55",
    }}>
      <Text style={{ color: Colors.cyan, fontSize: 12, fontWeight: "600" }}>
        Respondendo a @{replyingToName}
      </Text>
      <TextInput
        autoFocus
        multiline
        value={ctx.replyText}
        onChangeText={ctx.onReplyTextChange}
        placeholder="Escreva sua resposta..."
        placeholderTextColor={Colors.textMuted}
        style={{
          color:             Colors.white,
          fontSize:          14,
          minHeight:         72,
          textAlignVertical: "top",
        }}
      />
      <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
        <TouchableOpacity
          onPress={() => ctx.onSetReplyTo(null)}
          style={{
            paddingHorizontal: 14,
            paddingVertical:   8,
            borderRadius:      8,
            borderWidth:       1,
            borderColor:       Colors.bgBorder,
          }}
        >
          <Text style={{ color: Colors.textGray, fontSize: 13 }}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => ctx.onSubmitReply(parentId)}
          disabled={ctx.sendingReply || ctx.replyText.trim().length === 0}
          style={{
            paddingHorizontal: 14,
            paddingVertical:   8,
            borderRadius:      8,
            backgroundColor:   Colors.cyan,
            flexDirection:     "row",
            alignItems:        "center",
            gap:               6,
            opacity:           ctx.sendingReply || ctx.replyText.trim().length === 0 ? 0.5 : 1,
          }}
        >
          {ctx.sendingReply
            ? <ActivityIndicator size="small" color="#000" />
            : <Ionicons name="send" size={14} color="#000" />
          }
          <Text style={{ color: "#000", fontSize: 13, fontWeight: "600" }}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({
  post,
  isReply,
  mentionName,
  ctx,
}: {
  post:        ForumPost;
  isReply:     boolean;
  mentionName: string | null;
  ctx:         NodeCtx;
}) {
  const Colors = useColors();

  const isPostAuthor       = ctx.userId === post.authorId;
  const isTopicAuthorReply = post.authorId === ctx.topicAuthorId;
  const avatarColor        = isReply ? "#a78bfa" : "#22d3ee";
  const initials           = post.authorName.slice(0, 2).toUpperCase();
  const isEditing          = ctx.editingPostId === post.id;

  const handleOptions = useCallback(() => {
    const options: ActionSheetOption[] = [];
    if (isPostAuthor) {
      options.push({ label: "Editar",  icon: "pencil-outline", onPress: () => ctx.onEdit(post) });
      options.push({ label: "Excluir", icon: "trash-outline",  destructive: true, onPress: () => ctx.onDelete(post.id) });
    }
    if (ctx.isTopicAuthor && !isPostAuthor) {
      options.push({
        label:   post.isSolution ? "Desmarcar solução" : "Marcar como solução",
        icon:    post.isSolution ? "close-circle-outline" : "checkmark-circle-outline",
        onPress: () => ctx.onMarkSolution(post),
      });
    }
    options.push({ label: "Denunciar", icon: "flag-outline", onPress: ctx.onReport });
    ctx.onShowActionSheet(options);
  }, [post, isPostAuthor, ctx]);

  return (
    <View style={{
      backgroundColor: Colors.bgCard,
      borderRadius:    10,
      padding:         12,
      gap:             8,
      borderWidth:     1,
      borderColor:     Colors.bgBorder,
    }}>
      {/* Solution banner */}
      {post.isSolution && (
        <View style={{
          flexDirection:     "row",
          alignItems:        "center",
          gap:               6,
          backgroundColor:   Colors.success + "22",
          borderRadius:      6,
          paddingHorizontal: 8,
          paddingVertical:   4,
        }}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <Text style={{ color: Colors.success, fontSize: 12, fontWeight: "700" }}>Solução aceita</Text>
        </View>
      )}

      {/* Author row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{
          width:           26,
          height:          26,
          borderRadius:    13,
          backgroundColor: avatarColor + "44",
          alignItems:      "center",
          justifyContent:  "center",
          borderWidth:     1,
          borderColor:     avatarColor,
        }}>
          <Text style={{ color: avatarColor, fontSize: 9, fontWeight: "700" }}>{initials}</Text>
        </View>
        <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "700", flexShrink: 1 }}>
          {post.authorName}
        </Text>
        {isTopicAuthorReply && (
          <View style={{
            backgroundColor:   "#a78bfa22",
            borderRadius:      4,
            paddingHorizontal: 5,
            paddingVertical:   1,
            borderWidth:       1,
            borderColor:       "#a78bfa",
          }}>
            <Text style={{ color: "#a78bfa", fontSize: 10, fontWeight: "700" }}>OP</Text>
          </View>
        )}
        <Text style={{ color: Colors.textMuted, fontSize: 11 }}>·</Text>
        <Text style={{ color: Colors.textMuted, fontSize: 11 }}>
          {timeAgo(post.createdAt)}
          {post.updatedAt !== post.createdAt ? " · editado" : ""}
        </Text>
      </View>

      {/* Body or edit form */}
      {isEditing ? (
        <View style={{ gap: 8 }}>
          <TextInput
            autoFocus
            multiline
            value={ctx.editText}
            onChangeText={ctx.onEditTextChange}
            style={{
              color:             Colors.white,
              fontSize:          14,
              minHeight:         72,
              textAlignVertical: "top",
              backgroundColor:   Colors.bgCardAlt,
              borderRadius:      8,
              padding:           10,
              borderWidth:       1,
              borderColor:       Colors.bgBorder,
            }}
          />
          <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
            <TouchableOpacity
              onPress={ctx.onCancelEdit}
              style={{
                paddingHorizontal: 14,
                paddingVertical:   7,
                borderRadius:      8,
                borderWidth:       1,
                borderColor:       Colors.bgBorder,
              }}
            >
              <Text style={{ color: Colors.textGray, fontSize: 13 }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={ctx.onSaveEdit}
              disabled={ctx.savingEdit || ctx.editText.trim().length === 0}
              style={{
                paddingHorizontal: 14,
                paddingVertical:   7,
                borderRadius:      8,
                backgroundColor:   Colors.cyan,
                opacity:           ctx.savingEdit || ctx.editText.trim().length === 0 ? 0.5 : 1,
              }}
            >
              {ctx.savingEdit
                ? <ActivityIndicator size="small" color="#000" />
                : <Text style={{ color: "#000", fontSize: 13, fontWeight: "600" }}>Salvar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={{ color: Colors.white, fontSize: 14, lineHeight: 20 }}>
          {mentionName && (
            <Text style={{ color: Colors.cyan, fontWeight: "700" }}>@{mentionName} </Text>
          )}
          {post.body}
        </Text>
      )}

      {/* Action bar */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 2 }}>
        {/* Like button */}
        <TouchableOpacity
          hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
          onPress={() => ctx.session && ctx.onVote(post.id, 1)}
          style={{ flexDirection: "row", alignItems: "center", gap: 5, opacity: ctx.session ? 1 : 0.5 }}
        >
          <Ionicons
            name={post.userVote === 1 ? "thumbs-up" : "thumbs-up-outline"}
            size={16}
            color={post.userVote === 1 ? Colors.cyan : Colors.textMuted}
          />
          {post.upvotes > 0 && (
            <Text style={{ color: post.userVote === 1 ? Colors.cyan : Colors.textMuted, fontSize: 12, fontWeight: "600" }}>
              {post.upvotes}
            </Text>
          )}
        </TouchableOpacity>

        {/* Reply button */}
        {ctx.session && !ctx.isLocked && (
          <TouchableOpacity
            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
            onPress={() => ctx.replyingTo === post.id ? ctx.onSetReplyTo(null) : ctx.onSetReplyTo(post.id)}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Ionicons
              name="chatbubble-outline"
              size={14}
              color={ctx.replyingTo === post.id ? Colors.cyan : Colors.textMuted}
            />
            <Text style={{ color: ctx.replyingTo === post.id ? Colors.cyan : Colors.textMuted, fontSize: 12 }}>
              Responder
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        {/* Options */}
        <TouchableOpacity hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }} onPress={handleOptions}>
          <Ionicons name="ellipsis-horizontal" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── TopicDetailScreen ────────────────────────────────────────────────────────

interface Props {
  topic:    ForumTopic;
  category: ForumCategory;
  onClose:  () => void;
}

export function TopicDetailScreen({ topic, category, onClose }: Props) {
  const Colors = useColors();
  const { user } = useAuth();
  const {
    postsByTopic,
    fetchPosts,
    createPost,
    editPost,
    markSolution,
    deleteTopic,
    deletePost,
    incrementViews,
    votePost,
  } = useForum();

  const scrollRef = useRef<ScrollView>(null);

  const [replyingTo,      setReplyingTo]      = useState<string | null>(null);
  const [replyText,       setReplyText]       = useState("");
  const [sending,         setSending]         = useState(false);
  const [editingPost,     setEditingPost]     = useState<ForumPost | null>(null);
  const [editBody,        setEditBody]        = useState("");
  const [savingEdit,      setSavingEdit]      = useState(false);
  const [confirmDelete,   setConfirmDelete]   = useState<{ type: "topic" | "post"; id: string } | null>(null);
  const [actionSheetOpts, setActionSheetOpts] = useState<ActionSheetOption[] | null>(null);
  const [reportVisible,   setReportVisible]   = useState(false);
  const [expanded,        setExpanded]        = useState<Set<string>>(new Set());

  const topicId       = topic.id;
  const posts         = postsByTopic[topicId] ?? [];
  const hasLoaded     = topicId in postsByTopic;
  const groups        = groupPosts(posts);
  const session       = !!user;
  const isTopicAuthor = !!user && user.id === topic.authorId;

  useEffect(() => {
    fetchPosts(topicId).catch(() => {});
    incrementViews(topicId).catch(() => {});

    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => handler.remove();
  }, [topicId]);

  const handleSubmitReply = useCallback(async (parentId: string | null) => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await createPost(topicId, replyText, parentId ?? undefined);
      setReplyingTo(null);
      setReplyText("");
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      // silently ignore — user sees nothing changed
    } finally {
      setSending(false);
    }
  }, [replyText, topicId, createPost]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingPost || !editBody.trim()) return;
    setSavingEdit(true);
    try {
      await editPost(editingPost.id, topicId, editBody);
      setEditingPost(null);
      setEditBody("");
    } catch {
    } finally {
      setSavingEdit(false);
    }
  }, [editingPost, editBody, topicId, editPost]);

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === "topic") {
        await deleteTopic(topicId, topic.categoryId);
        setConfirmDelete(null);
        onClose();
      } else {
        await deletePost(confirmDelete.id, topicId);
        setConfirmDelete(null);
      }
    } catch {}
  }, [confirmDelete, topicId, topic, deleteTopic, deletePost, onClose]);

  const handleVote = useCallback((postId: string, vote: 1 | -1) => {
    votePost(postId, topicId, vote).catch(() => {});
  }, [votePost, topicId]);

  const ctx: NodeCtx = {
    session,
    userId:            user?.id ?? null,
    isTopicAuthor,
    topicAuthorId:     topic.authorId,
    isLocked:          topic.isLocked,
    replyingTo,
    replyText,
    sendingReply:      sending,
    editingPostId:     editingPost?.id ?? null,
    editText:          editBody,
    savingEdit,
    onSetReplyTo:      setReplyingTo,
    onReplyTextChange: setReplyText,
    onSubmitReply:     handleSubmitReply,
    onVote:            handleVote,
    onEdit:            (post) => { setEditingPost(post); setEditBody(post.body); },
    onEditTextChange:  setEditBody,
    onSaveEdit:        handleSaveEdit,
    onCancelEdit:      () => { setEditingPost(null); setEditBody(""); },
    onDelete:          (postId) => setConfirmDelete({ type: "post", id: postId }),
    onMarkSolution:    (post) => markSolution(post.id, topicId, !post.isSolution).catch(() => {}),
    onShowActionSheet: setActionSheetOpts,
    onReport:          () => setReportVisible(true),
  };

  const authorInitials = topic.authorName.slice(0, 2).toUpperCase();

  return (
    <Modal visible={true} transparent={false} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: Colors.bg }}>

        {/* HEADER */}
        <View style={{
          backgroundColor:   Colors.bgCard,
          paddingHorizontal: 12,
          paddingVertical:   10,
          flexDirection:     "row",
          alignItems:        "center",
          gap:               8,
        }}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>

          <View style={{
            width:           28,
            height:          28,
            borderRadius:    8,
            backgroundColor: category.color + "22",
            alignItems:      "center",
            justifyContent:  "center",
            borderWidth:     1,
            borderColor:     category.color,
          }}>
            <Ionicons name={category.icon as any} size={14} color={category.color} />
          </View>

          <Text style={{ flex: 1, color: Colors.white, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
            {topic.title}
          </Text>

          {isTopicAuthor && (
            <TouchableOpacity
              hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
              onPress={() => setConfirmDelete({ type: "topic", id: topicId })}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>

        {/* KAV */}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          {!hasLoaded ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color={Colors.cyan} />
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
            >
              {/* OP CARD */}
              <View style={{
                backgroundColor:   Colors.bgCard,
                borderBottomWidth: 1,
                borderBottomColor: Colors.bgBorder,
                paddingTop:        2,
                paddingHorizontal: 16,
                paddingBottom:     16,
                gap:               12,
              }}>
                {/* Badges */}
                {(topic.isPinned || topic.isLocked || topic.hasSolution) && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {topic.isPinned && (
                      <View style={{
                        flexDirection: "row", alignItems: "center", gap: 3,
                        backgroundColor: "#f59e0b22", borderRadius: 6,
                        paddingHorizontal: 8, paddingVertical: 3,
                        borderWidth: 1, borderColor: "#f59e0b",
                      }}>
                        <Ionicons name="pin" size={10} color="#f59e0b" />
                        <Text style={{ color: "#f59e0b", fontSize: 11, fontWeight: "700" }}>Fixado</Text>
                      </View>
                    )}
                    {topic.isLocked && (
                      <View style={{
                        flexDirection: "row", alignItems: "center", gap: 3,
                        backgroundColor: Colors.error + "22", borderRadius: 6,
                        paddingHorizontal: 8, paddingVertical: 3,
                        borderWidth: 1, borderColor: Colors.error,
                      }}>
                        <Ionicons name="lock-closed" size={10} color={Colors.error} />
                        <Text style={{ color: Colors.error, fontSize: 11, fontWeight: "700" }}>Bloqueado</Text>
                      </View>
                    )}
                    {topic.hasSolution && (
                      <View style={{
                        flexDirection: "row", alignItems: "center", gap: 3,
                        backgroundColor: Colors.success + "22", borderRadius: 6,
                        paddingHorizontal: 8, paddingVertical: 3,
                        borderWidth: 1, borderColor: Colors.success,
                      }}>
                        <Ionicons name="checkmark-circle" size={10} color={Colors.success} />
                        <Text style={{ color: Colors.success, fontSize: 11, fontWeight: "700" }}>Solucionado</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Body */}
                <Text style={{ color: Colors.textGray, fontSize: 14, lineHeight: 22 }}>
                  {topic.body}
                </Text>

                {/* Author + stats */}
                <View style={{
                  flexDirection:  "row",
                  alignItems:     "center",
                  gap:            8,
                  paddingTop:     10,
                  borderTopWidth: 1,
                  borderTopColor: Colors.bgBorder,
                }}>
                  <View style={{
                    width:           26, height: 26, borderRadius: 13,
                    backgroundColor: Colors.cyan + "33",
                    alignItems:      "center", justifyContent: "center",
                    borderWidth:     1, borderColor: Colors.cyan,
                  }}>
                    <Text style={{ color: Colors.cyan, fontSize: 9, fontWeight: "700" }}>{authorInitials}</Text>
                  </View>
                  <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "600" }}>{topic.authorName}</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 11 }}>·</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{timeAgo(topic.createdAt)}</Text>
                  <View style={{ flex: 1 }} />
                  <Ionicons name="eye-outline" size={13} color={Colors.textMuted} />
                  <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{topic.viewCount}</Text>
                  <Ionicons name="chatbubble-outline" size={13} color={Colors.textMuted} />
                  <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{topic.replyCount}</Text>
                </View>

                {/* Reply button */}
                {session && !topic.isLocked && (
                  <TouchableOpacity
                    onPress={() => replyingTo === "__op__" ? setReplyingTo(null) : setReplyingTo("__op__")}
                    style={{
                      alignSelf:         "flex-start",
                      flexDirection:     "row",
                      alignItems:        "center",
                      gap:               5,
                      paddingHorizontal: 12,
                      paddingVertical:   6,
                      borderRadius:      8,
                      borderWidth:       1,
                      borderColor:       replyingTo === "__op__" ? Colors.cyan : Colors.bgBorder,
                      backgroundColor:   replyingTo === "__op__" ? Colors.cyan + "22" : "transparent",
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={13} color={replyingTo === "__op__" ? Colors.cyan : Colors.textMuted} />
                    <Text style={{ color: replyingTo === "__op__" ? Colors.cyan : Colors.textMuted, fontSize: 13 }}>
                      Responder
                    </Text>
                  </TouchableOpacity>
                )}

                {replyingTo === "__op__" && (
                  <InlineReply replyingToName={topic.authorName} ctx={ctx} parentId={null} />
                )}
              </View>

              {/* REPLIES */}
              <View style={{ padding: 16, gap: 12 }}>
                {posts.length > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: Colors.bgBorder }} />
                    <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                      {posts.length} {posts.length === 1 ? "resposta" : "respostas"}
                    </Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: Colors.bgBorder }} />
                  </View>
                )}

                {posts.length === 0 && (
                  <View style={{
                    alignItems:      "center",
                    padding:         24,
                    backgroundColor: Colors.bgCard,
                    borderRadius:    12,
                    borderWidth:     1,
                    borderColor:     Colors.bgBorder,
                    gap:             8,
                  }}>
                    <Ionicons name="chatbubbles-outline" size={32} color={Colors.textMuted} />
                    <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: "center" }}>
                      Nenhuma resposta ainda.{"\n"}Seja o primeiro a responder!
                    </Text>
                  </View>
                )}

                {topic.isLocked && (
                  <View style={{
                    flexDirection:     "row",
                    alignItems:        "center",
                    gap:               6,
                    backgroundColor:   Colors.error + "11",
                    borderRadius:      8,
                    paddingHorizontal: 12,
                    paddingVertical:   8,
                    borderWidth:       1,
                    borderColor:       Colors.error + "44",
                  }}>
                    <Ionicons name="lock-closed-outline" size={14} color={Colors.error} />
                    <Text style={{ color: Colors.error, fontSize: 12 }}>
                      Este tópico está bloqueado. Novas respostas não são permitidas.
                    </Text>
                  </View>
                )}

                {/* Reply groups */}
                {groups.map(({ root, nested }) => {
                  const isExpanded = expanded.has(root.id);
                  const toggle = () => setExpanded((prev) => {
                    const next = new Set(prev);
                    next.has(root.id) ? next.delete(root.id) : next.add(root.id);
                    return next;
                  });

                  return (
                    <View key={root.id} style={{ gap: 8 }}>
                      <PostCard post={root} isReply={true} mentionName={null} ctx={ctx} />

                      {ctx.replyingTo === root.id && (
                        <InlineReply replyingToName={root.authorName} ctx={ctx} parentId={root.id} />
                      )}

                      {nested.length > 0 && (
                        <TouchableOpacity
                          onPress={toggle}
                          style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 2 }}
                        >
                          <Ionicons
                            name={isExpanded ? "chevron-up" : "chatbubbles-outline"}
                            size={13}
                            color={Colors.cyan}
                          />
                          <Text style={{ color: Colors.cyan, fontSize: 12, fontWeight: "600" }}>
                            {isExpanded
                              ? "Ocultar respostas"
                              : `Ver ${nested.length} ${nested.length === 1 ? "resposta" : "respostas"}`}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {isExpanded && (
                        <View style={{ borderLeftWidth: 2, borderLeftColor: "#22d3ee44", paddingLeft: 12, marginLeft: 6, gap: 8 }}>
                          {nested.map(({ post, mentionName }) => (
                            <View key={post.id} style={{ gap: 8 }}>
                              <PostCard post={post} isReply={true} mentionName={mentionName} ctx={ctx} />
                              {ctx.replyingTo === post.id && (
                                <InlineReply replyingToName={post.authorName} ctx={ctx} parentId={post.id} />
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>

        <ConfirmModal
          visible={confirmDelete !== null}
          icon="trash-outline"
          title={confirmDelete?.type === "topic" ? "Excluir tópico" : "Excluir resposta"}
          message={
            confirmDelete?.type === "topic"
              ? "Tem certeza que deseja excluir este tópico? Todas as respostas também serão removidas. Esta ação não pode ser desfeita."
              : "Tem certeza que deseja excluir esta resposta? Esta ação não pode ser desfeita."
          }
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          destructive
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />

      </SafeAreaView>

      <ActionSheet
        visible={actionSheetOpts !== null}
        options={actionSheetOpts ?? []}
        onClose={() => setActionSheetOpts(null)}
      />

      <AlertModal
        visible={reportVisible}
        type="success"
        title="Denúncia enviada"
        message="Obrigado por ajudar a manter a comunidade saudável. Nossa equipe irá analisar em breve."
        onClose={() => setReportVisible(false)}
      />
    </Modal>
  );
}
