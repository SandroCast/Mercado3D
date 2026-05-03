import React, { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ForumTopic {
  id:          string;
  categoryId:  string;
  title:       string;
  body:        string;
  authorId:    string;
  authorName:  string;
  authorAvatar?: string;
  createdAt:   string;
  updatedAt:   string;
  viewCount:   number;
  replyCount:  number;
  isPinned:    boolean;
  isLocked:    boolean;
  hasSolution: boolean;
}

export interface ForumPost {
  id:          string;
  topicId:     string;
  body:        string;
  authorId:    string;
  authorName:  string;
  authorAvatar?: string;
  createdAt:   string;
  updatedAt:   string;
  isSolution:  boolean;
  parentId:    string | null;
  upvotes:     number;
  downvotes:   number;
  userVote:    1 | -1 | null;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

const JOIN = `*, profiles:author_id(full_name, avatar_url, email)`;

function topicFromRow(r: any): ForumTopic {
  return {
    id:          r.id,
    categoryId:  r.category_id,
    title:       r.title,
    body:        r.body,
    authorId:    r.author_id,
    authorName:  r.profiles?.full_name ?? r.profiles?.email ?? "Usuário",
    authorAvatar: r.profiles?.avatar_url ?? undefined,
    createdAt:   r.created_at,
    updatedAt:   r.updated_at,
    viewCount:   r.view_count,
    replyCount:  r.reply_count,
    isPinned:    r.is_pinned,
    isLocked:    r.is_locked,
    hasSolution: r.has_solution,
  };
}

function postFromRow(r: any): ForumPost {
  return {
    id:          r.id,
    topicId:     r.topic_id,
    body:        r.body,
    authorId:    r.author_id,
    authorName:  r.profiles?.full_name ?? r.profiles?.email ?? "Usuário",
    authorAvatar: r.profiles?.avatar_url ?? undefined,
    createdAt:   r.created_at,
    updatedAt:   r.updated_at,
    isSolution:  r.is_solution,
    parentId:    r.parent_id ?? null,
    upvotes:     r.upvotes ?? 0,
    downvotes:   r.downvotes ?? 0,
    userVote:    null,
  };
}

// ─── Search result ────────────────────────────────────────────────────────────

export interface ForumSearchResult {
  topic:   ForumTopic;
  matchIn: "topic" | "post";
  snippet: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ForumContextValue {
  topicsByCategory: Record<string, ForumTopic[]>;
  postsByTopic:     Record<string, ForumPost[]>;
  fetchTopics:      (categoryId: string) => Promise<void>;
  fetchPosts:       (topicId: string) => Promise<void>;
  searchTopics:     (query: string) => Promise<ForumSearchResult[]>;
  createTopic:      (categoryId: string, title: string, body: string) => Promise<ForumTopic>;
  createPost:       (topicId: string, body: string, parentId?: string) => Promise<ForumPost>;
  editPost:         (postId: string, topicId: string, body: string) => Promise<void>;
  markSolution:     (postId: string, topicId: string, mark: boolean) => Promise<void>;
  deleteTopic:      (topicId: string, categoryId: string) => Promise<void>;
  deletePost:       (postId: string, topicId: string) => Promise<void>;
  incrementViews:   (topicId: string) => Promise<void>;
  votePost:         (postId: string, topicId: string, vote: 1 | -1) => Promise<void>;
}

const ForumContext = createContext<ForumContextValue>({
  topicsByCategory: {},
  postsByTopic:     {},
  fetchTopics:      async () => {},
  fetchPosts:       async () => {},
  searchTopics:     async () => [],
  createTopic:      async () => { throw new Error("not ready"); },
  createPost:       async () => { throw new Error("not ready"); },
  editPost:         async () => {},
  markSolution:     async () => {},
  deleteTopic:      async () => {},
  deletePost:       async () => {},
  incrementViews:   async () => {},
  votePost:         async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ForumProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [topicsByCategory, setTopicsByCategory] = useState<Record<string, ForumTopic[]>>({});
  const [postsByTopic,     setPostsByTopic]     = useState<Record<string, ForumPost[]>>({});

  const fetchTopics = useCallback(async (categoryId: string) => {
    const { data, error } = await supabase
      .from("forum_topics")
      .select(JOIN)
      .eq("category_id", categoryId)
      .order("is_pinned",  { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw error;
    setTopicsByCategory((prev) => ({ ...prev, [categoryId]: (data ?? []).map(topicFromRow) }));
  }, []);

  const searchTopics = useCallback(async (query: string): Promise<ForumSearchResult[]> => {
    const q = query.trim();
    if (q.length < 2) return [];
    const pattern = `%${q}%`;

    // 1. Topics whose title or body matches
    const { data: topicRows } = await supabase
      .from("forum_topics")
      .select(JOIN)
      .or(`title.ilike.${pattern},body.ilike.${pattern}`)
      .order("updated_at", { ascending: false })
      .limit(20);

    const topicResults: ForumSearchResult[] = (topicRows ?? []).map((r) => ({
      topic:   topicFromRow(r),
      matchIn: "topic" as const,
      snippet: r.body?.slice(0, 120) ?? "",
    }));

    const foundTopicIds = new Set(topicResults.map((r) => r.topic.id));

    // 2. Posts whose body matches — then pull the parent topic
    const { data: postRows } = await supabase
      .from("forum_posts")
      .select(`body, topic_id, forum_topics:topic_id(${JOIN})`)
      .ilike("body", pattern)
      .order("created_at", { ascending: false })
      .limit(30);

    const postResults: ForumSearchResult[] = [];
    for (const row of postRows ?? []) {
      const t = row.forum_topics as any;
      if (!t || foundTopicIds.has(t.id)) continue;
      foundTopicIds.add(t.id);
      postResults.push({
        topic:   topicFromRow(t),
        matchIn: "post",
        snippet: (row.body as string)?.slice(0, 120) ?? "",
      });
    }

    return [...topicResults, ...postResults];
  }, []);

  const fetchPosts = useCallback(async (topicId: string) => {
    const { data, error } = await supabase
      .from("forum_posts")
      .select(JOIN)
      .eq("topic_id", topicId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    let posts = (data ?? []).map(postFromRow);

    // Merge user votes if logged in
    if (user && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const { data: voteRows } = await supabase
        .from("forum_post_votes")
        .select("post_id, vote")
        .eq("user_id", user.id)
        .in("post_id", postIds);

      if (voteRows && voteRows.length > 0) {
        const voteMap: Record<string, 1 | -1> = {};
        for (const row of voteRows) {
          voteMap[row.post_id] = row.vote as 1 | -1;
        }
        posts = posts.map((p) => ({
          ...p,
          userVote: voteMap[p.id] ?? null,
        }));
      }
    }

    setPostsByTopic((prev) => ({ ...prev, [topicId]: posts }));
  }, [user]);

  const createTopic = useCallback(async (categoryId: string, title: string, body: string): Promise<ForumTopic> => {
    if (!user) throw new Error("Não autenticado");
    const { data, error } = await supabase
      .from("forum_topics")
      .insert({ category_id: categoryId, title: title.trim(), body: body.trim(), author_id: user.id })
      .select(JOIN)
      .single();
    if (error) throw error;
    const topic = topicFromRow(data);
    setTopicsByCategory((prev) => ({ ...prev, [categoryId]: [topic, ...(prev[categoryId] ?? [])] }));
    return topic;
  }, [user]);

  const createPost = useCallback(async (topicId: string, body: string, parentId?: string): Promise<ForumPost> => {
    if (!user) throw new Error("Não autenticado");
    const { data, error } = await supabase
      .from("forum_posts")
      .insert({
        topic_id:  topicId,
        body:      body.trim(),
        author_id: user.id,
        ...(parentId ? { parent_id: parentId } : {}),
      })
      .select(JOIN)
      .single();
    if (error) throw error;
    const post = postFromRow(data);
    setPostsByTopic((prev) => ({ ...prev, [topicId]: [...(prev[topicId] ?? []), post] }));
    // Increment local reply_count so list refreshes without a full refetch
    setTopicsByCategory((prev) => {
      const updated: Record<string, ForumTopic[]> = {};
      for (const [cat, topics] of Object.entries(prev)) {
        updated[cat] = topics.map((t) =>
          t.id === topicId ? { ...t, replyCount: t.replyCount + 1, updatedAt: new Date().toISOString() } : t
        );
      }
      return updated;
    });
    return post;
  }, [user]);

  const editPost = useCallback(async (postId: string, topicId: string, body: string) => {
    const { error } = await supabase
      .from("forum_posts")
      .update({ body: body.trim(), updated_at: new Date().toISOString() })
      .eq("id", postId);
    if (error) throw error;
    setPostsByTopic((prev) => ({
      ...prev,
      [topicId]: (prev[topicId] ?? []).map((p) =>
        p.id === postId ? { ...p, body: body.trim(), updatedAt: new Date().toISOString() } : p
      ),
    }));
  }, []);

  const markSolution = useCallback(async (postId: string, topicId: string, mark: boolean) => {
    const { error } = await supabase.rpc("forum_mark_solution", {
      p_post_id:  postId,
      p_topic_id: topicId,
      p_mark:     mark,
    });
    if (error) throw error;
    setPostsByTopic((prev) => ({
      ...prev,
      [topicId]: (prev[topicId] ?? []).map((p) => ({ ...p, isSolution: mark && p.id === postId })),
    }));
    setTopicsByCategory((prev) => {
      const updated: Record<string, ForumTopic[]> = {};
      for (const [cat, topics] of Object.entries(prev)) {
        updated[cat] = topics.map((t) => t.id === topicId ? { ...t, hasSolution: mark } : t);
      }
      return updated;
    });
  }, []);

  const deleteTopic = useCallback(async (topicId: string, categoryId: string) => {
    const { error } = await supabase.from("forum_topics").delete().eq("id", topicId);
    if (error) throw error;
    setTopicsByCategory((prev) => ({
      ...prev,
      [categoryId]: (prev[categoryId] ?? []).filter((t) => t.id !== topicId),
    }));
  }, []);

  const deletePost = useCallback(async (postId: string, topicId: string) => {
    const { error } = await supabase.from("forum_posts").delete().eq("id", postId);
    if (error) throw error;
    setPostsByTopic((prev) => ({
      ...prev,
      [topicId]: (prev[topicId] ?? []).filter((p) => p.id !== postId),
    }));
    setTopicsByCategory((prev) => {
      const updated: Record<string, ForumTopic[]> = {};
      for (const [cat, topics] of Object.entries(prev)) {
        updated[cat] = topics.map((t) =>
          t.id === topicId ? { ...t, replyCount: Math.max(t.replyCount - 1, 0) } : t
        );
      }
      return updated;
    });
  }, []);

  const incrementViews = useCallback(async (topicId: string) => {
    await supabase.rpc("increment_forum_views", { p_topic_id: topicId });
  }, []);

  const votePost = useCallback(async (postId: string, topicId: string, vote: 1 | -1) => {
    // Find current post state for optimistic update
    setPostsByTopic((prev) => {
      const posts = prev[topicId] ?? [];
      const post = posts.find((p) => p.id === postId);
      if (!post) return prev;

      let newUpvotes   = post.upvotes;
      let newDownvotes = post.downvotes;
      let newUserVote: 1 | -1 | null;

      if (post.userVote === vote) {
        // Toggle off
        newUserVote = null;
        if (vote === 1) {
          newUpvotes   = Math.max(newUpvotes   - 1, 0);
        } else {
          newDownvotes = Math.max(newDownvotes - 1, 0);
        }
      } else if (post.userVote !== null) {
        // Changed vote
        newUserVote = vote;
        if (vote === 1) {
          newUpvotes   = newUpvotes   + 1;
          newDownvotes = Math.max(newDownvotes - 1, 0);
        } else {
          newDownvotes = newDownvotes + 1;
          newUpvotes   = Math.max(newUpvotes   - 1, 0);
        }
      } else {
        // New vote
        newUserVote = vote;
        if (vote === 1) {
          newUpvotes   = newUpvotes   + 1;
        } else {
          newDownvotes = newDownvotes + 1;
        }
      }

      return {
        ...prev,
        [topicId]: posts.map((p) =>
          p.id === postId
            ? { ...p, upvotes: newUpvotes, downvotes: newDownvotes, userVote: newUserVote }
            : p
        ),
      };
    });

    await supabase.rpc("forum_vote_post", { p_post_id: postId, p_vote: vote });
  }, []);

  return (
    <ForumContext.Provider value={{
      topicsByCategory, postsByTopic,
      fetchTopics, fetchPosts, searchTopics,
      createTopic, createPost, editPost,
      markSolution, deleteTopic, deletePost, incrementViews,
      votePost,
    }}>
      {children}
    </ForumContext.Provider>
  );
}

export function useForum() {
  return useContext(ForumContext);
}
