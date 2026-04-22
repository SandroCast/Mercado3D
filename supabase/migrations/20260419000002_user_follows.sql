create table user_follows (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  seller_id  text        not null,
  created_at timestamptz not null default now(),
  unique (user_id, seller_id)
);

alter table user_follows enable row level security;

create policy "users select own follows"
  on user_follows for select
  using (auth.uid() = user_id);

create policy "users insert own follows"
  on user_follows for insert
  with check (auth.uid() = user_id);

create policy "users delete own follows"
  on user_follows for delete
  using (auth.uid() = user_id);
