import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type FinTransaction = Database["public"]["Tables"]["fin_transactions"]["Row"];
export type FinTransactionInsert = Database["public"]["Tables"]["fin_transactions"]["Insert"];

export async function listTransactionsByMonth(ym: string): Promise<FinTransaction[]> {
  const { data, error } = await supabase
    .from("fin_transactions")
    .select("*")
    .eq("mes_referencia", ym)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTransaction(input: Omit<FinTransactionInsert, "owner_id">) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("fin_transactions")
    .insert({ ...input, owner_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from("fin_transactions").delete().eq("id", id);
  if (error) throw error;
}
