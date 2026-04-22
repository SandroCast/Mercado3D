create table digital_products (
  id               uuid          primary key default gen_random_uuid(),
  user_id          uuid          not null references auth.users(id) on delete cascade,
  title            text          not null,
  description      text          not null default '',
  price            numeric(10,2) not null check (price >= 0),
  original_price   numeric(10,2),
  category         text          not null,
  thumbnail        text          not null default '',
  preview_images   text[]        not null default '{}',
  formats          text[]        not null default '{"STL"}',
  print_difficulty text          not null default 'easy' check (print_difficulty in ('easy', 'medium', 'hard', 'expert')),
  support_required boolean       not null default false,
  download_count   integer       not null default 0,
  rating           numeric(3,2)  not null default 0,
  review_count     integer       not null default 0,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now()
);

alter table digital_products enable row level security;

create policy "digital products are public"
  on digital_products for select
  using (true);

create policy "owner can insert digital products"
  on digital_products for insert
  with check (auth.uid() = user_id);

create policy "owner can update digital products"
  on digital_products for update
  using (auth.uid() = user_id);

create policy "owner can delete digital products"
  on digital_products for delete
  using (auth.uid() = user_id);

create trigger digital_products_updated_at
  before update on digital_products
  for each row execute function update_updated_at();
