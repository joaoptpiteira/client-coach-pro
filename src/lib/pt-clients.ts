import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ServiceType = "mensalidade" | "pack";
export type Forecast = "continuar" | "parar" | "indefinido";
export type ClientStatus = "ativo" | "antigo" | "prospect";

export type PtClient = Database["public"]["Tables"]["pt_clients"]["Row"];
export type PtClientInsert = Database["public"]["Tables"]["pt_clients"]["Insert"];
export type PtClientUpdate = Database["public"]["Tables"]["pt_clients"]["Update"];

export async function listClients(): Promise<PtClient[]> {
  const { data, error } = await supabase
    .from("pt_clients")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createClient(input: Omit<PtClientInsert, "owner_id" | "numero">) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("pt_clients")
    .insert({ ...input, owner_id: userId, numero: 0 })
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
  continuar: "Vai continuar",
  parar: "Vai parar",
  indefinido: "Indefinido",
};

export const SERVICE_LABEL: Record<ServiceType, string> = {
  mensalidade: "Mensalidade",
  pack: "Pack",
};

export const STATUS_LABEL: Record<ClientStatus, string> = {
  ativo: "Cliente ativo",
  antigo: "Antigo",
  prospect: "Prospect",
};

export const FREQUENCY_LABEL: Record<number, string> = {
  1: "1x / semana",
  2: "2x / semana",
  3: "3x / semana",
  4: "4x / semana",
  5: "5x / semana",
};

// ---- Cálculos derivados ----

/** Custo do ginásio mensal = frequência semanal × 4 × valor por treino */
export function custoGinasioMensal(c: Pick<PtClient, "frequencia_semanal" | "valor_ginasio_por_treino">) {
  return Number(c.frequencia_semanal ?? 0) * 4 * Number(c.valor_ginasio_por_treino ?? 0);
}

/** Valor real PT = valor acordado − ginásio − acompanhamento online */
export function valorRealPT(
  c: Pick<PtClient, "valor_acordado" | "frequencia_semanal" | "valor_ginasio_por_treino" | "valor_acompanhamento_online">,
) {
  return Math.max(
    0,
    Number(c.valor_acordado) - custoGinasioMensal(c) - Number(c.valor_acompanhamento_online ?? 0),
  );
}

/** Valor a pagar = valor real PT − desconto afiliado */
export function valorAPagar(
  c: Pick<PtClient, "valor_acordado" | "frequencia_semanal" | "valor_ginasio_por_treino" | "valor_acompanhamento_online" | "desconto_afiliado">,
) {
  return Math.max(0, valorRealPT(c) - Number(c.desconto_afiliado ?? 0));
}

/** Previsão para próximo mês com base nas escolhas individuais */
export function previsaoCliente(c: PtClient): number {
  if (c.status !== "ativo" || c.forecast === "parar") return 0;
  if (c.forecast_valor != null) return Number(c.forecast_valor);
  return Number(c.valor_acordado);
}

export const fmtEUR = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);
