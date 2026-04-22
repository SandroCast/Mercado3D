-- user_addresses: multiple shipping addresses per user, one default
create table if not exists public.user_addresses (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  recipient_name text       not null,
  phone         text        not null,
  postal_code   text        not null,
  street        text        not null,
  number        text        not null,
  complement    text,
  neighborhood  text        not null,
  city          text        not null,
  state         text        not null,
  is_default    boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index for fast per-user lookups
create index user_addresses_user_id_idx on public.user_addresses (user_id);

-- RLS: each user sees and manages only their own addresses
alter table public.user_addresses enable row level security;

create policy "select_own_addresses" on public.user_addresses
  for select using (auth.uid() = user_id);

create policy "insert_own_addresses" on public.user_addresses
  for insert with check (auth.uid() = user_id);

create policy "update_own_addresses" on public.user_addresses
  for update using (auth.uid() = user_id);

create policy "delete_own_addresses" on public.user_addresses
  for delete using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_addresses_updated_at
  before update on public.user_addresses
  for each row execute procedure public.set_updated_at();
