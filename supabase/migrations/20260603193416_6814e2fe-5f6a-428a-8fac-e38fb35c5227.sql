CREATE TABLE public.fin_debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  pessoa text NOT NULL,
  direcao text NOT NULL CHECK (direcao IN ('devo','devem')),
  valor numeric NOT NULL DEFAULT 0,
  descricao text,
  data date NOT NULL DEFAULT CURRENT_DATE,
  pago boolean NOT NULL DEFAULT false,
  data_pago date,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_debts TO authenticated;
GRANT ALL ON public.fin_debts TO service_role;

ALTER TABLE public.fin_debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read debts" ON public.fin_debts FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner insert debts" ON public.fin_debts FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner update debts" ON public.fin_debts FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner delete debts" ON public.fin_debts FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER fin_debts_set_updated_at BEFORE UPDATE ON public.fin_debts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();