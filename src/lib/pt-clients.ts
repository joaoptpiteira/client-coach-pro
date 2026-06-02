import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ServiceType = "mensalidade" | "pack";
export type Forecast = "continuar" | "parar" | "indefinido";

export type PtClient = Database["public"]["Tables"]["pt_clients"]["Row"];
export type PtClientInsert = Database["public"]["Tables"]["pt_clients"]["Insert"];
export type PtClientUpdate = Database["public"]["Tables"]["pt_clients"]["Update"];

export async function listClients(): Promise<PtClient[]> {
  const { data, error } = await supabase
    .from("pt_clients")
    .select("*")
    .order("numero", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createClient(input: Omit<PtClientInsert, "owner_id" | "numero">) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("pt_clients")
    .insert({ ...input, owner_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClient(id: string, patch: PtClientUpdate) {
  const { data, error } = await supabase
    .from("pt_clients")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("pt_clients").delete().eq("id", id);
  if (error) throw error;
}

export const FORECAST_LABEL: Record<Forecast, string> = {
  continuar: "Continua",
  parar: "Vai parar",
  indefinido: "Indefinido",
};

export const SERVICE_LABEL: Record<ServiceType, string> = {
  mensalidade: "Mensalidade",
  pack: "Pack",
};
