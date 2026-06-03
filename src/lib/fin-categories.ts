import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type FinCategory = Database["public"]["Tables"]["fin_categories"]["Row"];
export type FinCategoryInsert = Database["public"]["Tables"]["fin_categories"]["Insert"];
export type FinCategoryUpdate = Database["public"]["Tables"]["fin_categories"]["Update"];

const DEFAULTS: Array<Omit<FinCategoryInsert, "owner_id">> = [
  { nome: "Casa", tipo: "despesa", cor: "#c9893a", icone: "home", ordem: 1 },
  { nome: "Carro", tipo: "despesa", cor: "#8b6a3a", icone: "car", ordem: 2 },
  { nome: "Créditos", tipo: "despesa", cor: "#a14d4d", icone: "landmark", ordem: 3 },
  { nome: "Subscrições", tipo: "despesa", cor: "#6b7a8f", icone: "repeat", ordem: 4 },
  { nome: "Alimentação", tipo: "despesa", cor: "#7a9a4d", icone: "utensils", ordem: 5 },
  { nome: "Gasolina", tipo: "despesa", cor: "#4d6b8f", icone: "fuel", ordem: 6 },
  { nome: "Seguros", tipo: "despesa", cor: "#9a7a4d", icone: "shield", ordem: 7 },
  { nome: "Saúde", tipo: "despesa", cor: "#c97a8a", icone: "heart-pulse", ordem: 8 },
  { nome: "Lazer", tipo: "despesa", cor: "#b89a4d", icone: "sparkles", ordem: 9 },
  { nome: "Outros", tipo: "despesa", cor: "#8a8a8a", icone: "circle", ordem: 99 },
  { nome: "Salário", tipo: "receita", cor: "#5a8a5a", icone: "briefcase", ordem: 1 },
  { nome: "PT", tipo: "receita", cor: "#c9893a", icone: "dumbbell", ordem: 2 },
  { nome: "Outros", tipo: "receita", cor: "#8a8a8a", icone: "circle", ordem: 99 },
];

export async function listCategories(): Promise<FinCategory[]> {
  const { data, error } = await supabase
    .from("fin_categories")
    .select("*")
    .order("tipo", { ascending: true })
    .order("ordem", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function ensureSeededCategories(): Promise<FinCategory[]> {
  const existing = await listCategories();
  if (existing.length > 0) return existing;
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];
  const rows = DEFAULTS.map((d) => ({ ...d, owner_id: userId }));
  const { data, error } = await supabase.from("fin_categories").insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(input: Omit<FinCategoryInsert, "owner_id">) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("fin_categories")
    .insert({ ...input, owner_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, patch: FinCategoryUpdate) {
  const { data, error } = await supabase
    .from("fin_categories")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("fin_categories").delete().eq("id", id);
  if (error) throw error;
}
