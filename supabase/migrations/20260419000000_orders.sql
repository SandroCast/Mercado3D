create table if not exists public.orders (
  id                text        primary key,
  user_id           uuid        not null references auth.users(id) on delete cascade,
  status            text        not null default 'pending_payment',
  items             jsonb       not null default '[]',
  subtotal          numeric     not null,
  shipping_cost     numeric     not null default 0,
  total             numeric     not null,
  payment_method    text        not null,
  shipping_address  jsonb,
  selected_shipping jsonb,
  mp_preference_id  text,
  mp_payment_id     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);

alter table public.orders enable row level security;

create policy "select_own_orders" on public.orders
  for select using (auth.uid() = user_id);

create policy "insert_own_orders" on public.orders
  for insert with check (auth.uid() = user_id);

create policy "update_own_orders" on public.orders
  for update using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();
