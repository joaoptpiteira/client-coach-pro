CREATE TABLE public.fin_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  nome text NOT NULL,
  credor text,
  valor_total numeric NOT NULL DEFAULT 0,
  valor_em_divida numeric NOT NULL DEFAULT 0,
  prestacao_mensal numeric NOT NULL DEFAULT 0,
  taxa_juro numeric,
  data_inicio date,
  data_fim date,
  dia_pagamento integer,
  categoria_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_credits TO authenticated;
GRANT ALL ON public.fin_credits TO service_role;

ALTER TABLE public.fin_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read credits" ON public.fin_credits FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner insert credits" ON public.fin_credits FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner update credits" ON public.fin_credits FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner delete credits" ON public.fin_credits FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER fin_credits_set_updated_at
  BEFORE UPDATE ON public.fin_credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
