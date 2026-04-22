-- PostgREST só enxerga o schema public para resolver relacionamentos em queries.
-- products.user_id e digital_products.user_id apontavam para auth.users(id),
-- causando erro PGRST200. Aqui mudamos para public.profiles(id), que é válido
-- pois profiles.id já é FK de auth.users(id).

-- ── products ─────────────────────────────────────────────────────────────────

DO $$
DECLARE
  c text;
BEGIN
  SELECT conname INTO c
    FROM pg_constraint
   WHERE conrelid = 'products'::regclass
     AND contype  = 'f'
     AND conkey   = ARRAY[
           (SELECT attnum FROM pg_attribute
             WHERE attrelid = 'products'::regclass AND attname = 'user_id')
         ]::smallint[];
  IF c IS NOT NULL THEN
    EXECUTE 'ALTER TABLE products DROP CONSTRAINT ' || quote_ident(c);
  END IF;
END $$;

ALTER TABLE products
  ADD CONSTRAINT products_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ── digital_products ─────────────────────────────────────────────────────────

DO $$
DECLARE
  c text;
BEGIN
  SELECT conname INTO c
    FROM pg_constraint
   WHERE conrelid = 'digital_products'::regclass
     AND contype  = 'f'
     AND conkey   = ARRAY[
           (SELECT attnum FROM pg_attribute
             WHERE attrelid = 'digital_products'::regclass AND attname = 'user_id')
         ]::smallint[];
  IF c IS NOT NULL THEN
    EXECUTE 'ALTER TABLE digital_products DROP CONSTRAINT ' || quote_ident(c);
  END IF;
END $$;

ALTER TABLE digital_products
  ADD CONSTRAINT digital_products_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
