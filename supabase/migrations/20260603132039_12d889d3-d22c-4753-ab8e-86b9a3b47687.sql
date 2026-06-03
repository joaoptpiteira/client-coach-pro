
-- Enums
CREATE TYPE public.fin_tipo AS ENUM ('receita', 'despesa');
CREATE TYPE public.fin_recorrencia AS ENUM ('mensal', 'anual_provisao');
CREATE TYPE public.fin_origem AS ENUM ('manual', 'fixa_gerada', 'pt_payment');

-- Categorias
CREATE TABLE public.fin_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  nome text NOT NULL,
  tipo public.fin_tipo NOT NULL,
  cor text NOT NULL DEFAULT '#c9893a',
  icone text NOT NULL DEFAULT 'circle',
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_categories TO authenticated;
GRANT ALL ON public.fin_categories TO service_role;

ALTER TABLE public.fin_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own categories" ON public.fin_categories
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner can insert own categories" ON public.fin_categories
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update own categories" ON public.fin_categories
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can delete own categories" ON public.fin_categories
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER fin_categories_set_updated_at
  BEFORE UPDATE ON public.fin_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Despesas fixas
CREATE TABLE public.fin_fixed_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  nome text NOT NULL,
  categoria_id uuid REFERENCES public.fin_categories(id) ON DELETE SET NULL,
  tipo_recorrencia public.fin_recorrencia NOT NULL DEFAULT 'mensal',
  valor_mensal numeric NOT NULL DEFAULT 0,
  valor_anual numeric,
  mes_pagamento_anual integer,
  dia_pagamento integer,
  mes_inicio date,
  mes_fim date,
  ativo boolean NOT NULL DEFAULT true,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_fixed_expenses TO authenticated;
GRANT ALL ON public.fin_fixed_expenses TO service_role;

ALTER TABLE public.fin_fixed_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own fixed" ON public.fin_fixed_expenses
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner can insert own fixed" ON public.fin_fixed_expenses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update own fixed" ON public.fin_fixed_expenses
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can delete own fixed" ON public.fin_fixed_expenses
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER fin_fixed_set_updated_at
  BEFORE UPDATE ON public.fin_fixed_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Transações
CREATE TABLE public.fin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  mes_referencia text NOT NULL,
  tipo public.fin_tipo NOT NULL,
  categoria_id uuid REFERENCES public.fin_categories(id) ON DELETE SET NULL,
  valor numeric NOT NULL DEFAULT 0,
  descricao text,
  notas text,
  origem public.fin_origem NOT NULL DEFAULT 'manual',
  fixed_expense_id uuid REFERENCES public.fin_fixed_expenses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fin_transactions_owner_mes_idx ON public.fin_transactions(owner_id, mes_referencia);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_transactions TO authenticated;
GRANT ALL ON public.fin_transactions TO service_role;

ALTER TABLE public.fin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own tx" ON public.fin_transactions
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner can insert own tx" ON public.fin_transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update own tx" ON public.fin_transactions
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can delete own tx" ON public.fin_transactions
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER fin_transactions_set_updated_at
  BEFORE UPDATE ON public.fin_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Função para semear categorias por defeito (chamada pelo cliente)
CREATE OR REPLACE FUNCTION public.fin_seed_default_categories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.fin_categories WHERE owner_id = uid) THEN RETURN; END IF;

  INSERT INTO public.fin_categories (owner_id, nome, tipo, cor, icone, ordem) VALUES
    (uid, 'Casa', 'despesa', '#c9893a', 'home', 1),
    (uid, 'Carro', 'despesa', '#8b6a3a', 'car', 2),
    (uid, 'Créditos', 'despesa', '#a14d4d', 'landmark', 3),
    (uid, 'Subscrições', 'despesa', '#6b7a8f', 'repeat', 4),
    (uid, 'Alimentação', 'despesa', '#7a9a4d', 'utensils', 5),
    (uid, 'Gasolina', 'despesa', '#4d6b8f', 'fuel', 6),
    (uid, 'Seguros', 'despesa', '#9a7a4d', 'shield', 7),
    (uid, 'Saúde', 'despesa', '#c97a8a', 'heart-pulse', 8),
    (uid, 'Lazer', 'despesa', '#b89a4d', 'sparkles', 9),
    (uid, 'Outros', 'despesa', '#8a8a8a', 'circle', 99),
    (uid, 'Salário', 'receita', '#5a8a5a', 'briefcase', 1),
    (uid, 'PT', 'receita', '#c9893a', 'dumbbell', 2),
    (uid, 'Outros', 'receita', '#8a8a8a', 'circle', 99);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fin_seed_default_categories() TO authenticated;
