import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PtPayment = Database["public"]["Tables"]["pt_payments"]["Row"];
export type PtPaymentInsert = Database["public"]["Tables"]["pt_payments"]["Insert"];

export const mesRef = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const mesRefLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" })
    .format(new Date(y, (m ?? 1) - 1, 1));
};

export const shiftMes = (ym: string, delta: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + delta, 1);
  return mesRef(d);
};

export async function listPaymentsByMonth(ym: string): Promise<PtPayment[]> {
  const { data, error } = await supabase
    .from("pt_payments")
    .select("*")
    .eq("mes_referencia", ym)
    .order("data", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAllPayments(): Promise<PtPayment[]> {
  const { data, error } = await supabase
    .from("pt_payments")
    .select("*")
    .order("data", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPayment(input: Omit<PtPaymentInsert, "owner_id">) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("pt_payments")
    .insert({ ...input, owner_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePayment(id: string) {
  const { error } = await supabase.from("pt_payments").delete().eq("id", id);
  if (error) throw error;
}
