import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { mesRef, mesRefLabel, shiftMes, fmtEUR } from "@/lib/fin-shared";
import {
  listTransactionsByMonth,
  deleteTransaction,
} from "@/lib/fin-transactions";
import { listCategories } from "@/lib/fin-categories";
import { TransactionDialog } from "@/components/financas/TransactionDialog";

export const Route = createFileRoute("/_authenticated/financas/variaveis")({
  head: () => ({ meta: [{ title: "Finanças · Variáveis" }] }),
  component: VariaveisPage,
});

function VariaveisPage() {
  const [mes, setMes] = useState(() => mesRef(new Date()));
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ["fin_transactions", mes],
    queryFn: () => listTransactionsByMonth(mes),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["fin_categories"],
    queryFn: listCategories,
  });

  const grouped = useMemo(() => {
    const m: Record<string, typeof txs> = {};
    for (const t of txs) {
      (m[t.data] ??= []).push(t);
    }
    return Object.entries(m).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [txs]);

  const totalReceitas = txs
    .filter((t) => t.tipo === "receita")
    .reduce((s, t) => s + Number(t.valor), 0);
  const totalDespesas = txs
    .filter((t) => t.tipo === "despesa")
    .reduce((s, t) => s + Number(t.valor), 0);

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar esta transação?")) return;
    try {
      await deleteTransaction(id);
      toast.success("Eliminado");
      qc.invalidateQueries({ queryKey: ["fin_transactions"] });
      qc.invalidateQueries({ queryKey: ["fin_overview"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <main className="px-5 pt-2 pb-6 space-y-4">
      <div className="flex items-center justify-between bg-surface border border-border rounded-xl px-2 py-1.5">
        <Button variant="ghost" size="icon" onClick={() => setMes((m) => shiftMes(m, -1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <p className="font-display text-base capitalize">{mesRefLabel(mes)}</p>
        <Button variant="ghost" size="icon" onClick={() => setMes((m) => shiftMes(m, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 bg-surface border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Receitas
          </p>
          <p className="font-display text-xl text-[var(--color-success,#5a8a5a)] mt-1">
            {fmtEUR(totalReceitas)}
          </p>
        </Card>
        <Card className="p-3 bg-surface border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Despesas
          </p>
          <p className="font-display text-xl text-destructive mt-1">{fmtEUR(totalDespesas)}</p>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Transações
        </p>
        <Button size="sm" onClick={() => setOpen(true)} className="h-8 gap-1">
          <Plus className="w-3.5 h-3.5" /> Nova
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 flex justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <Card className="p-8 text-center bg-surface border-border">
          <p className="text-sm text-muted-foreground">Sem transações neste mês.</p>
        </Card>
      ) : (
        grouped.map(([date, list]) => (
          <div key={date} className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pl-1">
              {new Date(date).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            {list.map((t) => {
              const cat = categories.find((c) => c.id === t.categoria_id);
              const isReceita = t.tipo === "receita";
              return (
                <Card
                  key={t.id}
                  className="p-3 bg-surface border-border flex items-center gap-3"
                >
                  <div
                    className="w-2 h-10 rounded-full shrink-0"
                    style={{ background: cat?.cor ?? "#8a8a8a" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {t.descricao || cat?.nome || (isReceita ? "Receita" : "Despesa")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {cat?.nome ?? "Sem categoria"}
                      {t.origem === "fixa_gerada" && " · fixa"}
                    </p>
                  </div>
                  <span
                    className={`font-mono text-sm shrink-0 ${
                      isReceita ? "text-[var(--color-success,#5a8a5a)]" : "text-destructive"
                    }`}
                  >
                    {isReceita ? "+" : "−"}
                    {fmtEUR(Number(t.valor))}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </Card>
              );
            })}
          </div>
        ))
      )}

      <TransactionDialog
        open={open}
        onOpenChange={setOpen}
        defaultMonth={mes}
        categories={categories}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["fin_transactions"] });
          qc.invalidateQueries({ queryKey: ["fin_overview"] });
        }}
      />
    </main>
  );
}
