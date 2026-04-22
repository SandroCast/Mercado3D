create table if not exists public.digital_purchases (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  -- nullable: SET NULL when seller deletes the listing, buyer keeps access
  product_id   uuid        references public.digital_products(id) on delete set null,
  -- snapshot fields — preserved even after product deletion
  title        text        not null,
  thumbnail    text        not null default '',
  formats      text[]      not null default '{}',
  format_files jsonb       not null default '{}',
  price_paid   numeric     not null default 0,
  acquired_at  timestamptz not null default now()
);

create index if not exists digital_purchases_user_id_idx on public.digital_purchases (user_id);
create unique index if not exists digital_purchases_user_product_idx
  on public.digital_purchases (user_id, product_id)
  where product_id is not null;

alter table public.digital_purchases enable row level security;

create policy "select_own_purchases" on public.digital_purchases
  for select using (auth.uid() = user_id);

create policy "insert_own_purchases" on public.digital_purchases
  for insert with check (auth.uid() = user_id);
