import { supabase } from "@/integrations/supabase/client";
import { buildDefaultCatalog, type CatalogEntry } from "./wc26-catalog";

export type Sticker = {
  id: string;
  user_id: string;
  number: number;
  section: string;
  team: string | null;
  label: string;
  is_special: boolean;
  owned: number;
  created_at: string;
  updated_at: string;
};

export async function listStickers(): Promise<Sticker[]> {
  const { data, error } = await supabase
    .from("wc26_stickers")
    .select("*")
    .order("number", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Sticker[];
}

export async function seedAlbum(userId: string): Promise<number> {
  const catalog = buildDefaultCatalog();
  const rows = catalog.map((c: CatalogEntry) => ({
    user_id: userId,
    number: c.number,
    section: c.section,
    team: c.team,
    label: c.label,
    is_special: c.is_special,
    owned: 0,
  }));
  // chunks de 500 para não estourar payload
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error, count } = await supabase
      .from("wc26_stickers")
      .insert(chunk, { count: "exact" });
    if (error) throw error;
    inserted += count ?? chunk.length;
  }
  return inserted;
}

export async function updateOwned(id: string, owned: number) {
  const next = Math.max(0, Math.floor(owned));
  const { error } = await supabase
    .from("wc26_stickers")
    .update({ owned: next })
    .eq("id", id);
  if (error) throw error;
}

export async function updateStickerMeta(
  id: string,
  patch: { label?: string; team?: string | null },
) {
  const { error } = await supabase.from("wc26_stickers").update(patch).eq("id", id);
  if (error) throw error;
}

export async function bulkRenameTeam(oldName: string, newName: string) {
  const { error } = await supabase
    .from("wc26_stickers")
    .update({
      team: newName,
      // também actualiza o prefixo da label se começar pelo nome antigo
    })
    .eq("team", oldName);
  if (error) throw error;
  // actualizar labels que começam por "OLD — "
  const { data } = await supabase
    .from("wc26_stickers")
    .select("id,label")
    .eq("team", newName);
  if (data) {
    for (const row of data) {
      if (row.label.startsWith(`${oldName} — `)) {
        const newLabel = row.label.replace(`${oldName} — `, `${newName} — `);
        await supabase.from("wc26_stickers").update({ label: newLabel }).eq("id", row.id);
      }
    }
  }
}

export async function resetAlbum() {
  const { error } = await supabase
    .from("wc26_stickers")
    .update({ owned: 0 })
    .gte("number", 0);
  if (error) throw error;
}

export async function wipeAlbum() {
  const { error } = await supabase.from("wc26_stickers").delete().gte("number", 0);
  if (error) throw error;
}
