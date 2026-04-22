alter table products
  add column if not exists variant_attributes text[] not null default '{}';
