import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

interface FollowsContextValue {
  followedIds: Set<string>;
  loading:     boolean;
  isFollowing: (sellerUserId: string) => boolean;
  toggleFollow: (sellerUserId: string) => Promise<void>;
}

const FollowsContext = createContext<FollowsContextValue>({
  followedIds:  new Set(),
  loading:      false,
  isFollowing:  () => false,
  toggleFollow: async () => {},
});

export function FollowsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading]         = useState(false);

  const fetchFollows = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_follows")
        .select("seller_id")
        .eq("user_id", user.id);
      if (error) throw error;
      setFollowedIds(new Set((data ?? []).map((r: any) => r.seller_id as string)));
    } catch (err) {
      console.warn("fetchFollows error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchFollows();
    else setFollowedIds(new Set());
  }, [user?.id]);

  const isFollowing = useCallback(
    (sellerId: string) => followedIds.has(sellerId),
    [followedIds]
  );

  const toggleFollow = useCallback(async (sellerId: string) => {
    if (!user) return;

    if (followedIds.has(sellerId)) {
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("user_id", user.id)
        .eq("seller_id", sellerId);
      if (error) throw error;
      setFollowedIds((prev) => { const next = new Set(prev); next.delete(sellerId); return next; });
    } else {
      const { error } = await supabase
        .from("user_follows")
        .insert({ user_id: user.id, seller_id: sellerId });
      if (error) throw error;
      setFollowedIds((prev) => new Set(prev).add(sellerId));
    }
  }, [user, followedIds]);

  return (
    <FollowsContext.Provider value={{ followedIds, loading, isFollowing, toggleFollow }}>
      {children}
    </FollowsContext.Provider>
  );
}

export function useFollows() {
  return useContext(FollowsContext);
}
