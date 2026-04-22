-- ── Product Q&A ────────────────────────────────────────────────────────────────
-- Anyone logged in can ask. Only the seller (product owner) can answer.
-- product_type: 'physical' | 'digital'

create table if not exists public.product_questions (
  id           uuid        primary key default gen_random_uuid(),
  product_id   uuid        not null,
  product_type text        not null check (product_type in ('physical', 'digital')),
  asker_id     uuid        not null references auth.users(id) on delete cascade,
  asker_name   text        not null default '',
  question     text        not null,
  answer       text,
  answered_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists product_questions_product_id_idx
  on public.product_questions (product_id);

alter table public.product_questions enable row level security;

-- Everyone can read questions
create policy "questions_select_all" on public.product_questions
  for select using (true);

-- Any logged-in user can ask
create policy "questions_insert_own" on public.product_questions
  for insert with check (auth.uid() = asker_id);

-- Seller answers: update only the answer/answered_at columns
-- We allow update if the user owns the product (physical or digital)
create policy "questions_update_seller_physical" on public.product_questions
  for update using (
    product_type = 'physical' and
    exists (
      select 1 from public.products
      where id = product_id and user_id = auth.uid()
    )
  );

create policy "questions_update_seller_digital" on public.product_questions
  for update using (
    product_type = 'digital' and
    exists (
      select 1 from public.digital_products
      where id = product_id and user_id = auth.uid()
    )
  );

-- Asker can delete their own unanswered question
create policy "questions_delete_own" on public.product_questions
  for delete using (auth.uid() = asker_id and answer is null);
