create table if not exists public.user_favorites (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  product_id   text        not null,
  product_type text        not null, -- 'physical' | 'digital'
  title        text        not null,
  price        numeric     not null,
  image_url    text,
  seller_name  text,
  created_at   timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists user_favorites_user_id_idx on public.user_favorites (user_id);

alter table public.user_favorites enable row level security;

create policy "select_own_favorites" on public.user_favorites
  for select using (auth.uid() = user_id);

create policy "insert_own_favorites" on public.user_favorites
  for insert with check (auth.uid() = user_id);

create policy "delete_own_favorites" on public.user_favorites
  for delete using (auth.uid() = user_id);
