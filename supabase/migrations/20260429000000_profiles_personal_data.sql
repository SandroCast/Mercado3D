ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS person_type  text CHECK (person_type IN ('pf', 'pj')),
  ADD COLUMN IF NOT EXISTS cpf_cnpj     text,
  ADD COLUMN IF NOT EXISTS phone        text,
  ADD COLUMN IF NOT EXISTS birth_date   date;
