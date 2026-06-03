-- Enum tipo de imóvel
CREATE TYPE public.imo_tipo AS ENUM ('apartamento', 'moradia', 'ambos');

-- Tabela de configuração (1 por user)
CREATE TABLE public.config_imoveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL UNIQUE,
  portais TEXT[] NOT NULL DEFAULT ARRAY['imovirtual','idealista','olx','casasapo'],
  tipo public.imo_tipo NOT NULL DEFAULT 'ambos',
  preco_min NUMERIC,
  preco_max NUMERIC,
  quartos_min INTEGER,
  zona TEXT,
  ultima_atualizacao TIMESTAMPTZ,
  ultima_visita TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_imoveis TO authenticated;
GRANT ALL ON public.config_imoveis TO service_role;

ALTER TABLE public.config_imoveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read config" ON public.config_imoveis FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner insert config" ON public.config_imoveis FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner update config" ON public.config_imoveis FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner delete config" ON public.config_imoveis FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER trg_config_imoveis_updated BEFORE UPDATE ON public.config_imoveis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tabela de imóveis encontrados
CREATE TABLE public.imoveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  preco NUMERIC,
  localizacao TEXT,
  area NUMERIC,
  quartos INTEGER,
  tipo TEXT,
  portal TEXT NOT NULL,
  url TEXT NOT NULL,
  data_encontrado TIMESTAMPTZ NOT NULL DEFAULT now(),
  visto BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, portal, url)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.imoveis TO authenticated;
GRANT ALL ON public.imoveis TO service_role;

ALTER TABLE public.imoveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read imoveis" ON public.imoveis FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner insert imoveis" ON public.imoveis FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner update imoveis" ON public.imoveis FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner delete imoveis" ON public.imoveis FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX idx_imoveis_owner_data ON public.imoveis(owner_id, data_encontrado DESC);
CREATE INDEX idx_imoveis_owner_visto ON public.imoveis(owner_id, visto);