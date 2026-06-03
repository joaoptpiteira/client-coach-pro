import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  listCategories, createCategory, deleteCategory, type FinCategory,
} from "@/lib/fin-categories";

export const Route = createFileRoute("/_authenticated/financas/categorias")({
  head: () => ({ meta: [{ title: "Finanças · Categorias" }] }),
  component: CategoriasPage,
});

const PRESET_COLORS = [
  "#c9893a", "#8b6a3a", "#a14d4d", "#6b7a8f", "#7a9a4d",
  "#4d6b8f", "#9a7a4d", "#c97a8a", "#b89a4d", "#5a8a5a", "#8a8a8a",
];

function CategoriasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<"despesa" | "receita">("despesa");
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const { data: cats = [] } = useQuery({ queryKey: ["fin_categories"], queryFn: listCategories });

  const despesas = cats.filter((c) => c.tipo === "despesa");
  const receitas = cats.filter((c) => c.tipo === "receita");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["fin_categories"] });
    qc.invalidateQueries({ queryKey: ["fin_overview"] });
  };

  const handleSave = async () => {
    if (!nome.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    try {
      await createCategory({ nome: nome.trim(), tipo, cor, icone: "circle", ordem: 50 });
      toast.success("Adicionada");
      setNome(""); setCor(PRESET_COLORS[0]); setOpen(false);
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: FinCategory) => {
    if (!confirm(`Eliminar "${c.nome}"? Despesas/transações associadas ficam sem categoria.`)) return;
    try {
      await deleteCategory(c.id);
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const renderGroup = (title: string, list: FinCategory[]) => (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pl-1">{title}</p>
      {list.map((c) => (
        <Card key={c.id} className="p-3 bg-surface border-border flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ background: c.cor }} />
          <p className="flex-1 text-sm">{c.nome}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => handleDelete(c)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </Card>
      ))}
    </div>
  );

  return (
    <main className="px-5 pt-2 pb-6 space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)} className="h-8 gap-1">
          <Plus className="w-3.5 h-3.5" /> Nova
        </Button>
      </div>

      {renderGroup("Despesas", despesas)}
      {renderGroup("Receitas", receitas)}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTipo("despesa")}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${tipo === "despesa" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"}`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setTipo("receita")}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${tipo === "receita" ? "bg-[var(--color-success,#5a8a5a)] text-white" : "text-muted-foreground"}`}
              >
                Receita
              </button>
            </div>

            <div>
              <Label htmlFor="nome" className="text-xs">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
            </div>

            <div>
              <Label className="text-xs mb-2 block">Cor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      cor === c ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "A guardar…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
