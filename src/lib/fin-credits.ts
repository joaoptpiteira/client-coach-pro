import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type FinCredit = Database["public"]["Tables"]["fin_credits"]["Row"];
export type FinCreditInsert = Database["public"]["Tables"]["fin_credits"]["Insert"];
export type FinCreditUpdate = Database["public"]["Tables"]["fin_credits"]["Update"];

export async function listCredits(): Promise<FinCredit[]> {
  const { data, error } = await supabase
    .from("fin_credits")
    .select("*")
    .order("ativo", { ascending: false })
    .order("nome", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCredit(input: Omit<FinCreditInsert, "owner_id">) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("fin_credits")
    .insert({ ...input, owner_id: uid })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCredit(id: string, patch: FinCreditUpdate) {
  const { data, error } = await supabase
    .from("fin_credits")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCredit(id: string) {
  const { error } = await supabase.from("fin_credits").delete().eq("id", id);
  if (error) throw error;
}
