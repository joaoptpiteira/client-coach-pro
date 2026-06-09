-- Categoria: orçamento mensal opcional
ALTER TABLE public.fin_categories
  ADD COLUMN IF NOT EXISTS orcamento_mensal numeric(10,2);

-- Cliente PT: motivo da saída e último treino
ALTER TABLE public.pt_clients
  ADD COLUMN IF NOT EXISTS motivo_saida text,
  ADD COLUMN IF NOT EXISTS ultimo_treino_em date;

-- Backfill ultimo_treino_em a partir do histórico
UPDATE public.pt_clients c
SET ultimo_treino_em = sub.max_data
FROM (
  SELECT client_id, MAX(data) AS max_data
  FROM public.pt_trainings
  GROUP BY client_id
) sub
WHERE c.id = sub.client_id AND c.ultimo_treino_em IS NULL;

-- Trigger para manter ultimo_treino_em atualizado
CREATE OR REPLACE FUNCTION public.pt_trainings_touch_last()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE public.pt_clients
      SET ultimo_treino_em = GREATEST(COALESCE(ultimo_treino_em, '1900-01-01'::date), NEW.data),
          updated_at = now()
      WHERE id = NEW.client_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.pt_clients
      SET ultimo_treino_em = (
        SELECT MAX(data) FROM public.pt_trainings WHERE client_id = OLD.client_id
      ),
      updated_at = now()
      WHERE id = OLD.client_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS pt_trainings_touch_last_trg ON public.pt_trainings;
CREATE TRIGGER pt_trainings_touch_last_trg
AFTER INSERT OR UPDATE OR DELETE ON public.pt_trainings
FOR EACH ROW EXECUTE FUNCTION public.pt_trainings_touch_last();