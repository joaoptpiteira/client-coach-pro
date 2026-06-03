
CREATE OR REPLACE FUNCTION public.fin_tx_credit_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.credit_id IS NOT NULL AND NEW.tipo = 'despesa' THEN
      UPDATE public.fin_credits
        SET valor_em_divida = GREATEST(0, COALESCE(valor_em_divida, 0) - COALESCE(NEW.valor, 0)),
            updated_at = now()
        WHERE id = NEW.credit_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.credit_id IS NOT NULL AND OLD.tipo = 'despesa' THEN
      UPDATE public.fin_credits
        SET valor_em_divida = COALESCE(valor_em_divida, 0) + COALESCE(OLD.valor, 0),
            updated_at = now()
        WHERE id = OLD.credit_id;
    END IF;
    IF NEW.credit_id IS NOT NULL AND NEW.tipo = 'despesa' THEN
      UPDATE public.fin_credits
        SET valor_em_divida = GREATEST(0, COALESCE(valor_em_divida, 0) - COALESCE(NEW.valor, 0)),
            updated_at = now()
        WHERE id = NEW.credit_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.credit_id IS NOT NULL AND OLD.tipo = 'despesa' THEN
      UPDATE public.fin_credits
        SET valor_em_divida = COALESCE(valor_em_divida, 0) + COALESCE(OLD.valor, 0),
            updated_at = now()
        WHERE id = OLD.credit_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
