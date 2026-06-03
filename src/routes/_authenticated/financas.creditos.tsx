import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, Landmark, Pencil, Power } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listCredits, deleteCredit, updateCredit, type FinCredit } from "@/lib/fin-credits";
import { CreditDialog } from "@/components/financas/CreditDialog";
import { fmtEUR } from "@/lib/pt-clients";

export const Route = createFileRoute("/_authenticated/financas/creditos")({
  head: () => ({ meta: [{ title: "Créditos · Finanças" }] }),
  component: CreditosPage,
});

function CreditosPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinCredit | null>(null);

  const { data: credits = [], isLoading, refetch } = useQuery({
    queryKey: ["fin_credits"], queryFn: listCredits,
  });

  const { totalEmDivida, totalPrestacao, totalOriginal, ativos } = useMemo(() => {
    const ativos = credits.filter((c) => c.ativo);
    const totalEmDivida = ativos.reduce((s, c) => s + Number(c.valor_em_divida), 0);
    const totalPrestacao = ativos.reduce((s, c) => s + Number(c.prestacao_mensal), 0);
    const totalOriginal = ativos.reduce((s, c) => s + Number(c.valor_total), 0);
    return { totalEmDivida, totalPrestacao, totalOriginal, ativos };
  }, [credits]);

  const handleDel = async (id: string) => {
    if (!confirm("Eliminar crédito?")) return;
    try { await deleteCredit(id); toast.success("Eliminado"); refetch(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };
  const handleToggle = async (c: FinCredit) => {
    try { await updateCredit(c.id, { ativo: !c.ativo }); refetch(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (c: FinCredit) => { setEditing(c); setOpen(true); };

  const pagoGlobalPct = totalOriginal > 0
    ? Math.min(100, Math.max(0, ((totalOriginal - totalEmDivida) / totalOriginal) * 100))
    : 0;

  return (
    <main className="px-5 pt-2 pb-6 space-y-4">
      <Card className="p-5 bg-gradient-to-br from-accent to-surface border-accent/50">
        <p className="text-[11px] uppercase tracking-widest text-accent-foreground/70 font-semibold flex items-center gap-1.5">
          <Landmark className="w-3.5 h-3.5" /> Total em dívida
        </p>
        <p className="font-display text-4xl mt-1 text-[var(--color-warning)] privacy-blur">
          {fmtEUR(totalEmDivida)}
        </p>
        {totalOriginal > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span className="privacy-blur">
                Pago {fmtEUR(totalOriginal - totalEmDivida)} de {fmtEUR(totalOriginal)}
              </span>
              <span className="font-mono">{pagoGlobalPct.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pagoGlobalPct}%` }} />
            </div>
          </div>
        )}
        {totalPrestacao > 0 && (
          <p className="text-[11px] text-muted-foreground mt-3 privacy-blur">
            Prestações mensais: <span className="font-mono text-foreground">{fmtEUR(totalPrestacao)}</span>
            {ativos.length > 0 && <span className="text-muted-foreground"> · {ativos.length} ativo{ativos.length === 1 ? "" : "s"}</span>}
          </p>
        )}
      </Card>

      <div className="flex justify-end">
        <Button size="sm" className="rounded-xl" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Novo crédito
        </Button>
      </div>

      {isLoading ? (
        <div className="py-4 flex justify-center">
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : credits.length === 0 ? (
        <Card className="p-5 text-center bg-surface border-border">
          <p className="text-xs text-muted-foreground">Sem créditos registados.</p>
        </Card>
      ) : (
        credits.map((c) => {
          const pagoPct = c.valor_total > 0
            ? Math.min(100, Math.max(0, ((Number(c.valor_total) - Number(c.valor_em_divida)) / Number(c.valor_total)) * 100))
            : 0;
          return (
            <Card key={c.id} className={`p-3.5 bg-surface border-border ${!c.ativo ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <button className="flex-1 min-w-0 text-left" onClick={() => openEdit(c)}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    {!c.ativo && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">pago</Badge>}
                  </div>
                  {c.credor && <p className="text-[11px] text-muted-foreground truncate">{c.credor}</p>}
                </button>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm text-[var(--color-warning)] privacy-blur">{fmtEUR(Number(c.valor_em_divida))}</p>
                  {c.prestacao_mensal > 0 && (
                    <p className="text-[10px] text-muted-foreground privacy-blur">
                      {fmtEUR(Number(c.prestacao_mensal))}/mês
                      {c.dia_pagamento ? ` · dia ${c.dia_pagamento}` : ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span className="privacy-blur">
                    Pago {fmtEUR(Number(c.valor_total) - Number(c.valor_em_divida))} de {fmtEUR(Number(c.valor_total))}
                  </span>
                  <span className="font-mono">{pagoPct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pagoPct}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-1 mt-2 -mr-1 justify-end">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                  onClick={() => handleToggle(c)} title={c.ativo ? "Marcar como pago" : "Reativar"}>
                  <Power className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                  onClick={() => openEdit(c)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDel(c.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          );
        })
      )}

      <CreditDialog open={open} onOpenChange={setOpen} credit={editing} onSaved={() => refetch()} />
    </main>
  );
}
