import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Plus, Trash2, Check, RotateCcw, ArrowDownLeft, ArrowUpRight,
  Landmark, Pencil, Power,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { listDebts, deleteDebt, togglePago, type FinDebt } from "@/lib/fin-debts";
import { listCredits, deleteCredit, updateCredit, type FinCredit } from "@/lib/fin-credits";
import { DebtDialog } from "@/components/financas/DebtDialog";
import { CreditDialog } from "@/components/financas/CreditDialog";
import { fmtEUR } from "@/lib/pt-clients";

export const Route = createFileRoute("/_authenticated/financas/dividas")({
  head: () => ({ meta: [{ title: "Dívidas & Créditos · Finanças" }] }),
  component: DividasPage,
});

type Filter = "pendentes" | "pagas";

function DividasPage() {
  const [filter, setFilter] = useState<Filter>("pendentes");
  const [debtOpen, setDebtOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<FinDebt | null>(null);
  const [editingCredit, setEditingCredit] = useState<FinCredit | null>(null);

  const { data: debts = [], isLoading: lDebts, refetch: rDebts } = useQuery({
    queryKey: ["fin_debts"], queryFn: listDebts,
  });
  const { data: credits = [], isLoading: lCredits, refetch: rCredits } = useQuery({
    queryKey: ["fin_credits"], queryFn: listCredits,
  });

  const { devo, devem, list, creditosAtivos, totalEmDivida, totalPrestacao } = useMemo(() => {
    const pendentes = debts.filter((d) => !d.pago);
    const devo = pendentes.filter((d) => d.direcao === "devo").reduce((s, d) => s + Number(d.valor), 0);
    const devem = pendentes.filter((d) => d.direcao === "devem").reduce((s, d) => s + Number(d.valor), 0);
    const list = debts.filter((d) => (filter === "pendentes" ? !d.pago : d.pago));
    const creditosAtivos = credits.filter((c) => c.ativo);
    const totalEmDivida = creditosAtivos.reduce((s, c) => s + Number(c.valor_em_divida), 0);
    const totalPrestacao = creditosAtivos.reduce((s, c) => s + Number(c.prestacao_mensal), 0);
    return { devo, devem, list, creditosAtivos, totalEmDivida, totalPrestacao };
  }, [debts, credits, filter]);

  const saldoLiquido = devem - devo - totalEmDivida;

  const handleDelDebt = async (id: string) => {
    if (!confirm("Eliminar?")) return;
    try { await deleteDebt(id); toast.success("Eliminado"); rDebts(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };
  const handleToggleDebt = async (d: FinDebt) => {
    try { await togglePago(d.id, !d.pago); rDebts(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };
  const handleDelCredit = async (id: string) => {
    if (!confirm("Eliminar crédito?")) return;
    try { await deleteCredit(id); toast.success("Eliminado"); rCredits(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };
  const handleToggleCredit = async (c: FinCredit) => {
    try { await updateCredit(c.id, { ativo: !c.ativo }); rCredits(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };

  const openNewDebt = () => { setEditingDebt(null); setDebtOpen(true); };
  const openEditDebt = (d: FinDebt) => { setEditingDebt(d); setDebtOpen(true); };
  const openNewCredit = () => { setEditingCredit(null); setCreditOpen(true); };
  const openEditCredit = (c: FinCredit) => { setEditingCredit(c); setCreditOpen(true); };

  return (
    <main className="px-5 pt-2 pb-6 space-y-4">
      {/* Saldo global */}
      <Card className="p-5 bg-gradient-to-br from-accent to-surface border-accent/50">
        <p className="text-[11px] uppercase tracking-widest text-accent-foreground/70 font-semibold">
          Saldo líquido
        </p>
        <p className={`font-display text-4xl mt-1 privacy-blur ${saldoLiquido >= 0 ? "text-primary" : "text-destructive"}`}>
          {saldoLiquido >= 0 ? "+" : ""}{fmtEUR(saldoLiquido)}
        </p>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-surface/60 rounded-lg p-2.5 border border-border">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3 text-primary" /> Devem-me
            </p>
            <p className="font-mono text-sm mt-1 text-primary privacy-blur">{fmtEUR(devem)}</p>
          </div>
          <div className="bg-surface/60 rounded-lg p-2.5 border border-border">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-destructive" /> Devo
            </p>
            <p className="font-mono text-sm mt-1 text-destructive privacy-blur">{fmtEUR(devo)}</p>
          </div>
          <div className="bg-surface/60 rounded-lg p-2.5 border border-border">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Landmark className="w-3 h-3 text-[var(--color-warning)]" /> Créditos
            </p>
            <p className="font-mono text-sm mt-1 text-[var(--color-warning)] privacy-blur">{fmtEUR(totalEmDivida)}</p>
          </div>
        </div>
        {totalPrestacao > 0 && (
          <p className="text-[10px] text-muted-foreground mt-2 privacy-blur">
            Prestações mensais: <span className="font-mono">{fmtEUR(totalPrestacao)}</span>
          </p>
        )}
      </Card>

      {/* Botão adicionar */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="rounded-xl">
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={openNewDebt}>
              <HandIcon /> Dívida pessoal
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openNewCredit}>
              <Landmark className="w-4 h-4 mr-2" /> Crédito / empréstimo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Créditos */}
      <section className="space-y-2">
        <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1.5 px-1">
          <Landmark className="w-3 h-3" /> Créditos
        </h2>
        {lCredits ? (
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
                  <button className="flex-1 min-w-0 text-left" onClick={() => openEditCredit(c)}>
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
                    onClick={() => handleToggleCredit(c)} title={c.ativo ? "Marcar como pago" : "Reativar"}>
                    <Power className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                    onClick={() => openEditCredit(c)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelCredit(c.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </section>

      {/* Dívidas pessoais */}
      <section className="space-y-2 pt-2">
        <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-1">
          Dívidas pessoais
        </h2>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="w-full">
            <TabsTrigger value="pendentes" className="flex-1">Pendentes</TabsTrigger>
            <TabsTrigger value="pagas" className="flex-1">Pagas</TabsTrigger>
          </TabsList>
        </Tabs>

        {lDebts ? (
          <div className="py-4 flex justify-center">
            <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <Card className="p-5 text-center bg-surface border-border">
            <p className="text-xs text-muted-foreground">
              {filter === "pendentes" ? "Sem dívidas pendentes." : "Sem dívidas pagas."}
            </p>
          </Card>
        ) : (
          list.map((d) => {
            const isDevo = d.direcao === "devo";
            return (
              <Card key={d.id} className="p-3.5 bg-surface border-border">
                <div className="flex items-center gap-3">
                  <button onClick={() => handleToggleDebt(d)}
                    className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${d.pago ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary"}`}>
                    {d.pago ? <Check className="w-3.5 h-3.5" /> : isDevo ? <ArrowUpRight className="w-3.5 h-3.5 text-destructive" /> : <ArrowDownLeft className="w-3.5 h-3.5 text-primary" />}
                  </button>
                  <button onClick={() => openEditDebt(d)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{d.pessoa}</p>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0">
                        {isDevo ? "devo" : "devem"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {new Date(d.data).toLocaleDateString("pt-PT")}
                      {d.descricao && ` · ${d.descricao}`}
                    </p>
                  </button>
                  <span className={`font-mono text-sm privacy-blur ${isDevo ? "text-destructive" : "text-primary"}`}>
                    {isDevo ? "−" : "+"}{fmtEUR(Number(d.valor))}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelDebt(d.id)}>
                    {d.pago ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </section>

      <DebtDialog open={debtOpen} onOpenChange={setDebtOpen} debt={editingDebt} onSaved={() => rDebts()} />
      <CreditDialog open={creditOpen} onOpenChange={setCreditOpen} credit={editingCredit} onSaved={() => rCredits()} />
    </main>
  );
}

function HandIcon() {
  return <ArrowDownLeft className="w-4 h-4 mr-2" />;
}
