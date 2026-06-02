import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PtTraining = Database["public"]["Tables"]["pt_trainings"]["Row"];
export type PtTrainingInsert = Database["public"]["Tables"]["pt_trainings"]["Insert"];

export const isoDay = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const shiftDay = (iso: string, delta: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, (d ?? 1) + delta);
  return isoDay(dt);
};

export const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(dt);
};

export async function listTrainingsByDay(iso: string): Promise<PtTraining[]> {
  const { data, error } = await supabase
    .from("pt_trainings")
    .select("*")
    .eq("data", iso)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listTrainingsByMonth(ym: string): Promise<PtTraining[]> {
  const start = `${ym}-01`;
  const [y, m] = ym.split("-").map(Number);
  const endDate = new Date(y, m, 1);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-01`;
  const { data, error } = await supabase
    .from("pt_trainings")
    .select("*")
    .gte("data", start)
    .lt("data", end);
  if (error) throw error;
  return data ?? [];
}

export async function createTraining(input: Omit<PtTrainingInsert, "owner_id">) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("pt_trainings")
    .insert({ ...input, owner_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTraining(id: string) {
  const { error } = await supabase.from("pt_trainings").delete().eq("id", id);
  if (error) throw error;
}
