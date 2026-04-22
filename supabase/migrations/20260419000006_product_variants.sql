-- Adiciona atributos de variação na tabela products
alter table products
  add column if not exists variant_attributes text[] not null default '{}';

-- Tabela de variantes
create table product_variants (
  id          uuid          primary key default gen_random_uuid(),
  product_id  uuid          not null references products(id) on delete cascade,
  attributes  jsonb         not null default '{}',
  stock       integer       not null default 0 check (stock >= 0),
  price       numeric(10,2),
  sku         text,
  created_at  timestamptz   not null default now()
);

alter table product_variants enable row level security;

create policy "variants are public"
  on product_variants for select
  using (true);

create policy "owner can insert variants"
  on product_variants for insert
  with check (
    auth.uid() = (select user_id from products where id = product_id)
  );

create policy "owner can update variants"
  on product_variants for update
  using (
    auth.uid() = (select user_id from products where id = product_id)
  );

create policy "owner can delete variants"
  on product_variants for delete
  using (
    auth.uid() = (select user_id from products where id = product_id)
  );

-- Storage bucket para imagens de produtos
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product images are public"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "authenticated users can upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "owners can delete their product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and auth.uid()::text = (storage.foldername(name))[1]);
