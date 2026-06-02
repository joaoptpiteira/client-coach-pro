-- 1. Novo enum para status do cliente (ativo / antigo / prospect)
CREATE TYPE public.pt_client_status AS ENUM ('ativo', 'antigo', 'prospect');

-- 2. Acrescentar colunas a pt_clients
ALTER TABLE public.pt_clients
  ADD COLUMN telefone text,
  ADD COLUMN status public.pt_client_status NOT NULL DEFAULT 'ativo',
  ADD COLUMN frequencia_semanal integer NOT NULL DEFAULT 2,
  ADD COLUMN mes_inicio date,
  ADD COLUMN valor_ginasio_por_treino numeric NOT NULL DEFAULT 0,
  ADD COLUMN valor_acompanhamento_online numeric NOT NULL DEFAULT 0,
  ADD COLUMN desconto_afiliado numeric NOT NULL DEFAULT 0,
  ADD COLUMN indicado_por text;

-- 3. Migrar dados do antigo `ativo` boolean para o novo `status`
UPDATE public.pt_clients SET status = 'antigo' WHERE ativo = false;

-- 4. Garantir validade
ALTER TABLE public.pt_clients
  ADD CONSTRAINT pt_clients_freq_check CHECK (frequencia_semanal BETWEEN 0 AND 7);

-- 5. Trigger updated_at para pt_clients (caso ainda não tenha)
DROP TRIGGER IF EXISTS pt_clients_set_updated_at ON public.pt_clients;
CREATE TRIGGER pt_clients_set_updated_at
  BEFORE UPDATE ON public.pt_clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Tabela de pagamentos
CREATE TABLE public.pt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.pt_clients(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT current_date,
  mes_referencia text NOT NULL, -- formato 'YYYY-MM'
  valor_pago numeric NOT NULL DEFAULT 0,
  valor_pt numeric NOT NULL DEFAULT 0,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_payments TO authenticated;
GRANT ALL ON public.pt_payments TO service_role;

ALTER TABLE public.pt_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own payments" ON public.pt_payments
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner can insert own payments" ON public.pt_payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update own payments" ON public.pt_payments
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can delete own payments" ON public.pt_payments
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER pt_payments_set_updated_at
  BEFORE UPDATE ON public.pt_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX pt_payments_owner_mes_idx ON public.pt_payments(owner_id, mes_referencia);
CREATE INDEX pt_payments_client_idx ON public.pt_payments(client_id);

-- 7. Tabela de treinos dados (1 registo por treino realizado)
CREATE TABLE public.pt_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.pt_clients(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT current_date,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_trainings TO authenticated;
GRANT ALL ON public.pt_trainings TO service_role;

ALTER TABLE public.pt_trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own trainings" ON public.pt_trainings
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner can insert own trainings" ON public.pt_trainings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update own trainings" ON public.pt_trainings
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can delete own trainings" ON public.pt_trainings
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX pt_trainings_owner_data_idx ON public.pt_trainings(owner_id, data);
CREATE INDEX pt_trainings_client_idx ON public.pt_trainings(client_id);