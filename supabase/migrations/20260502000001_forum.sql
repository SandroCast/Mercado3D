-- ─── Forum Topics ────────────────────────────────────────────────────────────

create table if not exists public.forum_topics (
  id           uuid primary key default gen_random_uuid(),
  category_id  text not null,
  title        text not null check (char_length(title) >= 5 and char_length(title) <= 200),
  body         text not null check (char_length(body) >= 10),
  author_id    uuid references auth.users(id) on delete cascade not null,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null,
  view_count   int not null default 0,
  reply_count  int not null default 0,
  is_pinned    boolean not null default false,
  is_locked    boolean not null default false,
  has_solution boolean not null default false
);

-- ─── Forum Posts ─────────────────────────────────────────────────────────────

create table if not exists public.forum_posts (
  id          uuid primary key default gen_random_uuid(),
  topic_id    uuid references public.forum_topics(id) on delete cascade not null,
  body        text not null check (char_length(body) >= 1),
  author_id   uuid references auth.users(id) on delete cascade not null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,
  is_solution boolean not null default false
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists forum_topics_category_idx on public.forum_topics(category_id, created_at desc);
create index if not exists forum_topics_author_idx   on public.forum_topics(author_id);
create index if not exists forum_posts_topic_idx     on public.forum_posts(topic_id, created_at asc);
create index if not exists forum_posts_author_idx    on public.forum_posts(author_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.forum_topics enable row level security;
alter table public.forum_posts  enable row level security;

-- Topics: all can read, authed can insert, author can update/delete
create policy "forum_topics_select" on public.forum_topics for select using (true);
create policy "forum_topics_insert" on public.forum_topics for insert with check (auth.uid() = author_id);
create policy "forum_topics_update" on public.forum_topics for update using (auth.uid() = author_id);
create policy "forum_topics_delete" on public.forum_topics for delete using (auth.uid() = author_id);

-- Posts: all can read, authed can insert, author can update/delete
create policy "forum_posts_select" on public.forum_posts for select using (true);
create policy "forum_posts_insert" on public.forum_posts for insert with check (auth.uid() = author_id);
create policy "forum_posts_update" on public.forum_posts for update using (auth.uid() = author_id);
create policy "forum_posts_delete" on public.forum_posts for delete using (auth.uid() = author_id);

-- ─── Trigger: reply_count ────────────────────────────────────────────────────

create or replace function public.forum_update_reply_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.forum_topics
    set reply_count = reply_count + 1, updated_at = now()
    where id = NEW.topic_id;
  elsif TG_OP = 'DELETE' then
    update public.forum_topics
    set reply_count = greatest(reply_count - 1, 0)
    where id = OLD.topic_id;
  end if;
  return null;
end;
$$;

create trigger forum_posts_reply_count_trigger
after insert or delete on public.forum_posts
for each row execute function public.forum_update_reply_count();

-- ─── RPC: increment view count ───────────────────────────────────────────────

create or replace function public.increment_forum_views(p_topic_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.forum_topics set view_count = view_count + 1 where id = p_topic_id;
end;
$$;

-- ─── RPC: mark solution (only topic author can mark any post) ────────────────

create or replace function public.forum_mark_solution(p_post_id uuid, p_topic_id uuid, p_mark boolean)
returns void language plpgsql security definer as $$
declare
  v_topic_author uuid;
begin
  select author_id into v_topic_author from public.forum_topics where id = p_topic_id;
  if v_topic_author is distinct from auth.uid() then
    raise exception 'Apenas o autor do tópico pode marcar soluções';
  end if;
  -- Clear all solutions in this topic
  update public.forum_posts set is_solution = false where topic_id = p_topic_id;
  -- Mark the chosen post if requested
  if p_mark then
    update public.forum_posts set is_solution = true where id = p_post_id;
  end if;
  -- Sync has_solution on the topic row
  update public.forum_topics set has_solution = p_mark where id = p_topic_id;
end;
$$;
