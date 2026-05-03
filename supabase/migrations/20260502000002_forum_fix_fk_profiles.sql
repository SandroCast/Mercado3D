-- forum_topics.author_id e forum_posts.author_id apontavam para auth.users(id).
-- PostgREST só resolve joins no schema public; alteramos para profiles(id).

-- ── forum_topics ─────────────────────────────────────────────────────────────

DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c
    FROM pg_constraint
   WHERE conrelid = 'public.forum_topics'::regclass
     AND contype  = 'f'
     AND conkey   = ARRAY[
           (SELECT attnum FROM pg_attribute
             WHERE attrelid = 'public.forum_topics'::regclass AND attname = 'author_id')
         ]::smallint[];
  IF c IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.forum_topics DROP CONSTRAINT ' || quote_ident(c);
  END IF;
END $$;

ALTER TABLE public.forum_topics
  ADD CONSTRAINT forum_topics_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ── forum_posts ──────────────────────────────────────────────────────────────

DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c
    FROM pg_constraint
   WHERE conrelid = 'public.forum_posts'::regclass
     AND contype  = 'f'
     AND conkey   = ARRAY[
           (SELECT attnum FROM pg_attribute
             WHERE attrelid = 'public.forum_posts'::regclass AND attname = 'author_id')
         ]::smallint[];
  IF c IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.forum_posts DROP CONSTRAINT ' || quote_ident(c);
  END IF;
END $$;

ALTER TABLE public.forum_posts
  ADD CONSTRAINT forum_posts_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
