import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  listCategories, createCategory, deleteCategory, updateCategory, type FinCategory,
} from "@/lib/fin-categories";
import { fmtEUR } from "@/lib/fin-shared";

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
  const [budgetEditing, setBudgetEditing] = useState<FinCategory | null>(null);
  const [budgetVal, setBudgetVal] = useState("");

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

  const openBudget = (c: FinCategory) => {
    setBudgetEditing(c);
    const b = Number((c as unknown as { orcamento_mensal: number | null }).orcamento_mensal ?? 0);
    setBudgetVal(b > 0 ? String(b) : "");
  };

  const saveBudget = async () => {
    if (!budgetEditing) return;
    const raw = budgetVal.replace(",", ".");
    const n = raw === "" ? null : Number(raw);
    if (n !== null && (!Number.isFinite(n) || n < 0)) {
      toast.error("Valor inválido"); return;
    }
    try {
      await updateCategory(budgetEditing.id, { orcamento_mensal: n } as never);
      toast.success(n === null ? "Orçamento removido" : "Orçamento atualizado");
      setBudgetEditing(null);
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const renderGroup = (title: string, list: FinCategory[], allowBudget: boolean) => (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pl-1">{title}</p>
      {list.map((c) => {
        const budget = Number((c as unknown as { orcamento_mensal: number | null }).orcamento_mensal ?? 0);
        return (
          <Card key={c.id} className="p-3 bg-surface border-border flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: c.cor }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm">{c.nome}</p>
              {allowBudget && budget > 0 && (
                <p className="text-[10px] text-muted-foreground font-mono privacy-blur">
                  Orçamento: {fmtEUR(budget)}/mês
                </p>
              )}
            </div>
            {allowBudget && (
              <Button
                variant="ghost" size="icon"
                className={`h-7 w-7 ${budget > 0 ? "text-primary" : "text-muted-foreground"}`}
                onClick={() => openBudget(c)}
                aria-label="Editar orçamento"
              >
                <Target className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(c)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </Card>
        );
      })}
    </div>
  );

  return (
    <main className="px-5 pt-2 pb-6 space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)} className="h-8 gap-1">
          <Plus className="w-3.5 h-3.5" /> Nova
        </Button>
      </div>

      {renderGroup("Despesas", despesas, true)}
      {renderGroup("Receitas", receitas, false)}

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

      <Dialog open={!!budgetEditing} onOpenChange={(v) => { if (!v) setBudgetEditing(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Orçamento — {budgetEditing?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Define um teto mensal para esta categoria. Quando estiveres acima de 80% vais ver alerta no dashboard.
            </p>
            <div>
              <Label htmlFor="budget" className="text-xs">Valor mensal (€)</Label>
              <Input
                id="budget"
                type="number"
                inputMode="decimal"
                step="0.01"
                autoFocus
                placeholder="Deixa vazio para remover"
                value={budgetVal}
                onChange={(e) => setBudgetVal(e.target.value)}
                className="text-lg h-12 font-display"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBudgetEditing(null)}>Cancelar</Button>
            <Button onClick={saveBudget}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
