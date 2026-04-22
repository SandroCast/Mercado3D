-- ── Reviews ────────────────────────────────────────────────────────────────────
-- product_type: 'physical' | 'digital'
-- One review per user per product (enforced by unique index)
-- Trigger keeps products.rating + review_count in sync automatically

create table if not exists public.reviews (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  product_id   uuid        not null,
  product_type text        not null check (product_type in ('physical', 'digital')),
  rating       smallint    not null check (rating between 1 and 5),
  text         text        not null default '',
  author_name  text        not null default '',
  created_at   timestamptz not null default now()
);

create unique index if not exists reviews_user_product_idx
  on public.reviews (user_id, product_id);

create index if not exists reviews_product_id_idx
  on public.reviews (product_id);

alter table public.reviews enable row level security;

create policy "reviews_select_all" on public.reviews
  for select using (true);

create policy "reviews_insert_own" on public.reviews
  for insert with check (auth.uid() = user_id);

create policy "reviews_delete_own" on public.reviews
  for delete using (auth.uid() = user_id);

-- ── Trigger: update rating + review_count on products / digital_products ──────

create or replace function sync_product_rating()
returns trigger language plpgsql security definer as $$
declare
  v_avg  numeric(3,2);
  v_cnt  integer;
  v_pid  uuid;
  v_type text;
begin
  -- Works for both INSERT and DELETE
  if TG_OP = 'DELETE' then
    v_pid  := OLD.product_id;
    v_type := OLD.product_type;
  else
    v_pid  := NEW.product_id;
    v_type := NEW.product_type;
  end if;

  select coalesce(avg(rating), 0), count(*)
    into v_avg, v_cnt
    from public.reviews
   where product_id = v_pid;

  if v_type = 'physical' then
    update products set rating = v_avg, review_count = v_cnt where id = v_pid;
  else
    update digital_products set rating = v_avg, review_count = v_cnt where id = v_pid;
  end if;

  return null;
end;
$$;

create trigger reviews_sync_rating
  after insert or delete on public.reviews
  for each row execute function sync_product_rating();
