import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Power, Landmark, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fmtEUR } from "@/lib/fin-shared";
import { listFixed, deleteFixed, updateFixed, valorMensalEfetivo, type FinFixed } from "@/lib/fin-fixed";
import { listCategories } from "@/lib/fin-categories";
import { listCredits, type FinCredit } from "@/lib/fin-credits";
import { listTransactionsByMonth } from "@/lib/fin-transactions";
import { FixedExpenseDialog } from "@/components/financas/FixedExpenseDialog";
import { CreditPaymentDialog } from "@/components/financas/CreditPaymentDialog";

export const Route = createFileRoute("/_authenticated/financas/fixas")({
  head: () => ({ meta: [{ title: "Finanças · Fixas" }] }),
  component: FixasPage,
});

function FixasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinFixed | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [payCredit, setPayCredit] = useState<FinCredit | null>(null);

  const ym = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const { data: fixed = [] } = useQuery({ queryKey: ["fin_fixed"], queryFn: listFixed });
  const { data: categories = [] } = useQuery({ queryKey: ["fin_categories"], queryFn: listCategories });
  const { data: credits = [] } = useQuery({ queryKey: ["fin_credits"], queryFn: listCredits });
  const { data: monthTx = [] } = useQuery({
    queryKey: ["fin_tx", ym],
    queryFn: () => listTransactionsByMonth(ym),
  });

  const creditTxByCredit = useMemo(() => {
    const m = new Map<string, typeof monthTx[number]>();
    for (const t of monthTx) {
      if (t.credit_id) m.set(t.credit_id, t);
    }
    return m;
  }, [monthTx]);

  const activeCredits = credits.filter((c) => c.ativo);

  const visible = useMemo(
    () => fixed.filter((f) => (showInactive ? true : f.ativo)),
    [fixed, showInactive],
  );

  const byCat = useMemo(() => {
    const m: Record<string, FinFixed[]> = {};
    for (const f of visible) {
      const key = f.categoria_id ?? "_none";
      (m[key] ??= []).push(f);
    }
    return m;
  }, [visible]);

  const totalFixasMensal = visible.filter((f) => f.ativo).reduce((s, f) => s + valorMensalEfetivo(f), 0);
  const totalProvisoes = visible
    .filter((f) => f.ativo && f.tipo_recorrencia === "anual_provisao")
    .reduce((s, f) => s + valorMensalEfetivo(f), 0);
  const totalCreditos = activeCredits.reduce((s, c) => {
    const tx = creditTxByCredit.get(c.id);
    return s + (tx ? Number(tx.valor) : Number(c.prestacao_mensal ?? 0));
  }, 0);
  const totalMensal = totalFixasMensal + totalCreditos;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["fin_fixed"] });
    qc.invalidateQueries({ queryKey: ["fin_credits"] });
    qc.invalidateQueries({ queryKey: ["fin_tx", ym] });
    qc.invalidateQueries({ queryKey: ["fin_overview"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar esta despesa fixa?")) return;
    try {
      await deleteFixed(id);
      toast.success("Eliminado");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleToggle = async (f: FinFixed) => {
    try {
      await updateFixed(f.id, { ativo: !f.ativo });
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (f: FinFixed) => { setEditing(f); setOpen(true); };

  return (
    <main className="px-5 pt-2 pb-6 space-y-4">
      <Card className="p-5 bg-gradient-to-br from-accent to-surface border-accent/50">
        <p className="text-[11px] uppercase tracking-widest text-accent-foreground/70 font-semibold">
          Compromisso mensal
        </p>
        <p className="font-display text-4xl text-primary mt-1 privacy-blur">{fmtEUR(totalMensal)}</p>
        <p className="text-xs text-muted-foreground mt-2 privacy-blur">
          Fixas {fmtEUR(totalFixasMensal)} · Créditos {fmtEUR(totalCreditos)} · Provisões {fmtEUR(totalProvisoes)}
        </p>
      </Card>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowInactive((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showInactive ? "Esconder inativas" : "Mostrar inativas"}
        </button>
        <Button size="sm" onClick={openNew} className="h-8 gap-1">
          <Plus className="w-3.5 h-3.5" /> Nova
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card className="p-8 text-center bg-surface border-border">
          <p className="text-sm text-muted-foreground">Sem despesas fixas.</p>
        </Card>
      ) : (
        Object.entries(byCat).map(([catKey, list]) => {
          const cat = categories.find((c) => c.id === catKey);
          return (
            <div key={catKey} className="space-y-2">
              <div className="flex items-center gap-2 pl-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: cat?.cor ?? "#8a8a8a" }}
                />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {cat?.nome ?? "Sem categoria"}
                </p>
              </div>
              {list.map((f) => (
                <Card
                  key={f.id}
                  className={`p-3 bg-surface border-border flex items-center gap-3 ${
                    !f.ativo ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{f.nome}</p>
                      {f.tipo_recorrencia === "anual_provisao" && (
                        <Badge variant="outline" className="text-[9px] py-0 h-4">anual</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {f.dia_pagamento ? `Dia ${f.dia_pagamento}` : "Sem dia"}
                      {f.tipo_recorrencia === "anual_provisao" && f.valor_anual
                        ? ` · ${fmtEUR(Number(f.valor_anual))}/ano`
                        : ""}
                    </p>
                  </div>
                  <span className="font-mono text-sm text-primary shrink-0">
                    {fmtEUR(valorMensalEfetivo(f))}
                  </span>
                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggle(f)}>
                      <Power className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(f.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          );
        })
      )}

      {activeCredits.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 pl-1">
            <Landmark className="w-3 h-3 text-[var(--color-warning)]" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Créditos — {ym}
            </p>
          </div>
          {activeCredits.map((c) => {
            const tx = creditTxByCredit.get(c.id) ?? null;
            const valor = tx ? Number(tx.valor) : Number(c.prestacao_mensal ?? 0);
            const pago = !!tx;
            return (
              <Card key={c.id} className="p-3 bg-surface border-border flex items-center gap-3">
                <button
                  onClick={() => setPayCredit(c)}
                  className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
                    pago ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary"
                  }`}
                  title={pago ? "Editar pagamento" : "Registar pagamento"}
                >
                  {pago ? <Check className="w-3.5 h-3.5" /> : <Landmark className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <button onClick={() => setPayCredit(c)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    {pago && <Badge variant="outline" className="text-[9px] py-0 h-4">pago</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground privacy-blur">
                    {c.dia_pagamento ? `Dia ${c.dia_pagamento} · ` : ""}
                    Em dívida {fmtEUR(Number(c.valor_em_divida))}
                  </p>
                </button>
                <span className={`font-mono text-sm shrink-0 privacy-blur ${pago ? "text-primary" : "text-muted-foreground"}`}>
                  {fmtEUR(valor)}
                </span>
              </Card>
            );
          })}
        </div>
      )}

      <FixedExpenseDialog
        open={open}
        onOpenChange={setOpen}
        categories={categories}
        editing={editing}
        onSaved={invalidate}
      />
      <CreditPaymentDialog
        open={!!payCredit}
        onOpenChange={(v) => { if (!v) setPayCredit(null); }}
        credit={payCredit}
        ym={ym}
        existing={payCredit ? (creditTxByCredit.get(payCredit.id) ?? null) : null}
        onSaved={invalidate}
      />
    </main>
  );
}
