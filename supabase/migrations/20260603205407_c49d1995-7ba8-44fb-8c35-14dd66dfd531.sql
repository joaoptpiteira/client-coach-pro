
ALTER TABLE public.fin_transactions
  ADD COLUMN IF NOT EXISTS credit_id uuid REFERENCES public.fin_credits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS fin_transactions_credit_id_idx ON public.fin_transactions(credit_id);

CREATE OR REPLACE FUNCTION public.fin_tx_credit_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_credit uuid;
  new_credit uuid;
  old_val numeric;
  new_val numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_credit := NEW.credit_id;
    new_val := COALESCE(NEW.valor, 0);
    IF new_credit IS NOT NULL AND NEW.tipo = 'despesa' THEN
      UPDATE public.fin_credits
        SET valor_em_divida = GREATEST(0, COALESCE(valor_em_divida, 0) - new_val),
            updated_at = now()
        WHERE id = new_credit;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    old_credit := OLD.credit_id;
    new_credit := NEW.credit_id;
    old_val := COALESCE(OLD.valor, 0);
    new_val := COALESCE(NEW.valor, 0);
    IF old_credit IS NOT NULL AND OLD.tipo = 'despesa' THEN
      UPDATE public.fin_credits
        SET valor_em_divida = COALESCE(valor_em_divida, 0) + old_val,
            updated_at = now()
        WHERE id = old_credit;
    END IF;
    IF new_credit IS NOT NULL AND NEW.tipo = 'despesa' THEN
      UPDATE public.fin_credits
        SET valor_em_divida = GREATEST(0, COALESCE(valor_em_divida, 0) - new_val),
            updated_at = now()
        WHERE id = new_credit;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    old_credit := OLD.credit_id;
    old_val := COALESCE(OLD.valor, 0);
    IF old_credit IS NOT NULL AND OLD.tipo = 'despesa' THEN
      UPDATE public.fin_credits
        SET valor_em_divida = COALESCE(valor_em_divida, 0) + old_val,
            updated_at = now()
        WHERE id = old_credit;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS fin_tx_credit_sync_trg ON public.fin_transactions;
CREATE TRIGGER fin_tx_credit_sync_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.fin_transactions
  FOR EACH ROW EXECUTE FUNCTION public.fin_tx_credit_sync();
