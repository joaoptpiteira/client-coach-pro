import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/** Invalida todas as queries de Finanças de uma vez. */
export function useFinInvalidate() {
  const qc = useQueryClient();
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: ["fin_overview"] });
    qc.invalidateQueries({ queryKey: ["fin_history"] });
    qc.invalidateQueries({ queryKey: ["fin_transactions"] });
    qc.invalidateQueries({ queryKey: ["fin_categories"] });
    qc.invalidateQueries({ queryKey: ["fin_fixed"] });
    qc.invalidateQueries({ queryKey: ["fin_credits"] });
    qc.invalidateQueries({ queryKey: ["fin_debts"] });
  }, [qc]);
}

/** Invalida todas as queries de PT de uma vez. */
export function usePtInvalidate() {
  const qc = useQueryClient();
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: ["pt_clients"] });
    qc.invalidateQueries({ queryKey: ["pt_payments"] });
    qc.invalidateQueries({ queryKey: ["pt_payments_all"] });
    qc.invalidateQueries({ queryKey: ["pt_trainings_month"] });
    qc.invalidateQueries({ queryKey: ["pt_trainings_all"] });
    // PT entra em finanças → invalidar também
    qc.invalidateQueries({ queryKey: ["fin_overview"] });
    qc.invalidateQueries({ queryKey: ["fin_history"] });
  }, [qc]);
}
