import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type FinFixed = Database["public"]["Tables"]["fin_fixed_expenses"]["Row"];
export type FinFixedInsert = Database["public"]["Tables"]["fin_fixed_expenses"]["Insert"];
export type FinFixedUpdate = Database["public"]["Tables"]["fin_fixed_expenses"]["Update"];

/** Valor efetivo mensal — provisões anuais são divididas por 12. */
export function valorMensalEfetivo(f: FinFixed): number {
  if (f.tipo_recorrencia === "anual_provisao") {
    return Number(f.valor_anual ?? 0) / 12;
  }
  return Number(f.valor_mensal ?? 0);
}

/** Está ativo no mês YYYY-MM? */
export function ativoNoMes(f: FinFixed, ym: string): boolean {
  if (!f.ativo) return false;
  const [y, m] = ym.split("-").map(Number);
  const target = new Date(y, (m ?? 1) - 1, 1);
  if (f.mes_inicio) {
    const ini = new Date(f.mes_inicio);
    const iniStart = new Date(ini.getFullYear(), ini.getMonth(), 1);
    if (target < iniStart) return false;
  }
  if (f.mes_fim) {
    const fim = new Date(f.mes_fim);
    const fimEnd = new Date(fim.getFullYear(), fim.getMonth(), 1);
    if (target > fimEnd) return false;
  }
  return true;
}

export async function listFixed(): Promise<FinFixed[]> {
  const { data, error } = await supabase
    .from("fin_fixed_expenses")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createFixed(input: Omit<FinFixedInsert, "owner_id">) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("fin_fixed_expenses")
    .insert({ ...input, owner_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFixed(id: string, patch: FinFixedUpdate) {
  const { data, error } = await supabase
    .from("fin_fixed_expenses")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFixed(id: string) {
  const { error } = await supabase.from("fin_fixed_expenses").delete().eq("id", id);
  if (error) throw error;
}
