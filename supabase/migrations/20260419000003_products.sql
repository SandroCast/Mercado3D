create table products (
  id             uuid          primary key default gen_random_uuid(),
  user_id        uuid          not null references auth.users(id) on delete cascade,
  title          text          not null,
  description    text          not null default '',
  price          numeric(10,2) not null check (price >= 0),
  original_price numeric(10,2),
  category       text          not null,
  condition      text          not null default 'new' check (condition in ('new', 'used')),
  images         text[]        not null default '{}',
  in_stock       boolean       not null default true,
  free_shipping  boolean       not null default false,
  rating         numeric(3,2)  not null default 0,
  review_count   integer       not null default 0,
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now()
);

alter table products enable row level security;

-- Qualquer pessoa pode ver os produtos
create policy "products are public"
  on products for select
  using (true);

-- Só o dono pode criar/editar/deletar
create policy "owner can insert products"
  on products for insert
  with check (auth.uid() = user_id);

create policy "owner can update products"
  on products for update
  using (auth.uid() = user_id);

create policy "owner can delete products"
  on products for delete
  using (auth.uid() = user_id);

-- Atualiza updated_at automaticamente
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger products_updated_at
  before update on products
  for each row execute function update_updated_at();
