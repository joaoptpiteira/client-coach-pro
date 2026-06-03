import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Imovel = Database["public"]["Tables"]["imoveis"]["Row"];
export type ConfigImoveis = Database["public"]["Tables"]["config_imoveis"]["Row"];
export type ConfigImoveisUpdate = Database["public"]["Tables"]["config_imoveis"]["Update"];

export const PORTAIS = [
  { id: "imovirtual", label: "Imovirtual" },
  { id: "idealista", label: "Idealista" },
  { id: "olx", label: "OLX" },
  { id: "casasapo", label: "Casa Sapo" },
] as const;

export type PortalId = (typeof PORTAIS)[number]["id"];

export async function getConfig(): Promise<ConfigImoveis | null> {
  const { data, error } = await supabase
    .from("config_imoveis")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function ensureConfig(): Promise<ConfigImoveis> {
  const existing = await getConfig();
  if (existing) return existing;
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("config_imoveis")
    .insert({ owner_id: uid })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveConfig(patch: ConfigImoveisUpdate): Promise<ConfigImoveis> {
  const cfg = await ensureConfig();
  const { data, error } = await supabase
    .from("config_imoveis")
    .update(patch)
    .eq("id", cfg.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listImoveis(filtros?: {
  portal?: string;
  tipo?: string;
}): Promise<Imovel[]> {
  let q = supabase.from("imoveis").select("*").order("data_encontrado", { ascending: false }).limit(500);
  if (filtros?.portal) q = q.eq("portal", filtros.portal);
  if (filtros?.tipo) q = q.eq("tipo", filtros.tipo);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function countNovosDesde(desde: string | null): Promise<number> {
  if (!desde) return 0;
  const { count, error } = await supabase
    .from("imoveis")
    .select("*", { count: "exact", head: true })
    .gt("data_encontrado", desde);
  if (error) throw error;
  return count ?? 0;
}

export async function marcarTodosVistos(): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { error } = await supabase
    .from("imoveis")
    .update({ visto: true })
    .eq("owner_id", uid)
    .eq("visto", false);
  if (error) throw error;
  await supabase.from("config_imoveis").update({ ultima_visita: new Date().toISOString() }).eq("owner_id", uid);
}
