ALTER TABLE public.config_imoveis 
  ADD COLUMN IF NOT EXISTS dias_recentes integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS esconder_vistos boolean NOT NULL DEFAULT false;