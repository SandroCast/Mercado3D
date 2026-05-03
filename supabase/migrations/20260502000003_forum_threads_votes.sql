-- ─── 1. Add threading + vote columns to forum_posts ─────────────────────────

ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS parent_id  UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS upvotes    INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downvotes  INT NOT NULL DEFAULT 0;

-- ─── 2. forum_post_votes ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.forum_post_votes (
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id    UUID        NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  vote       SMALLINT    NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE public.forum_post_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY fvotes_select ON public.forum_post_votes
  FOR SELECT USING (true);

CREATE POLICY fvotes_insert ON public.forum_post_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY fvotes_update ON public.forum_post_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY fvotes_delete ON public.forum_post_votes
  FOR DELETE USING (auth.uid() = user_id);

-- ─── 3. RPC forum_vote_post ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.forum_vote_post(p_post_id UUID, p_vote SMALLINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing SMALLINT;
BEGIN
  -- Read existing vote
  SELECT vote INTO v_existing
  FROM forum_post_votes
  WHERE user_id = auth.uid() AND post_id = p_post_id;

  IF NOT FOUND THEN
    -- No existing vote: insert and increment
    INSERT INTO forum_post_votes (user_id, post_id, vote)
    VALUES (auth.uid(), p_post_id, p_vote);

    IF p_vote = 1 THEN
      UPDATE forum_posts SET upvotes   = upvotes   + 1 WHERE id = p_post_id;
    ELSE
      UPDATE forum_posts SET downvotes = downvotes + 1 WHERE id = p_post_id;
    END IF;

  ELSIF v_existing = p_vote THEN
    -- Same vote: toggle off — delete and decrement
    DELETE FROM forum_post_votes
    WHERE user_id = auth.uid() AND post_id = p_post_id;

    IF p_vote = 1 THEN
      UPDATE forum_posts SET upvotes   = GREATEST(upvotes   - 1, 0) WHERE id = p_post_id;
    ELSE
      UPDATE forum_posts SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = p_post_id;
    END IF;

  ELSE
    -- Different vote: update row, increment new, decrement old
    UPDATE forum_post_votes
    SET vote = p_vote
    WHERE user_id = auth.uid() AND post_id = p_post_id;

    IF p_vote = 1 THEN
      UPDATE forum_posts
      SET upvotes   = upvotes   + 1,
          downvotes = GREATEST(downvotes - 1, 0)
      WHERE id = p_post_id;
    ELSE
      UPDATE forum_posts
      SET downvotes = downvotes + 1,
          upvotes   = GREATEST(upvotes   - 1, 0)
      WHERE id = p_post_id;
    END IF;

  END IF;
END;
$$;
