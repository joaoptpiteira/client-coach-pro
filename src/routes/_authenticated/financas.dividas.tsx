import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Plus, Trash2, Check, RotateCcw, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { listDebts, deleteDebt, togglePago, type FinDebt } from "@/lib/fin-debts";
import { DebtDialog } from "@/components/financas/DebtDialog";
import { fmtEUR } from "@/lib/pt-clients";

export const Route = createFileRoute("/_authenticated/financas/dividas")({
  head: () => ({ meta: [{ title: "Dívidas · Finanças" }] }),
  component: DividasPage,
});

type Filter = "pendentes" | "pagas";

function DividasPage() {
  const [filter, setFilter] = useState<Filter>("pendentes");
  const [debtOpen, setDebtOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<FinDebt | null>(null);

  const { data: debts = [], isLoading, refetch } = useQuery({
    queryKey: ["fin_debts"], queryFn: listDebts,
  });

  const { devo, devem, list, saldo } = useMemo(() => {
    const pendentes = debts.filter((d) => !d.pago);
    const devo = pendentes.filter((d) => d.direcao === "devo").reduce((s, d) => s + Number(d.valor), 0);
    const devem = pendentes.filter((d) => d.direcao === "devem").reduce((s, d) => s + Number(d.valor), 0);
    const list = debts.filter((d) => (filter === "pendentes" ? !d.pago : d.pago));
    return { devo, devem, list, saldo: devem - devo };
  }, [debts, filter]);

  const handleDel = async (id: string) => {
    if (!confirm("Eliminar?")) return;
    try { await deleteDebt(id); toast.success("Eliminado"); refetch(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };
  const handleToggle = async (d: FinDebt) => {
    try { await togglePago(d.id, !d.pago); refetch(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };

  const openNew = () => { setEditingDebt(null); setDebtOpen(true); };
  const openEdit = (d: FinDebt) => { setEditingDebt(d); setDebtOpen(true); };

  return (
    <main className="px-5 pt-2 pb-6 space-y-4">
      <Card className="p-5 bg-gradient-to-br from-accent to-surface border-accent/50">
        <p className="text-[11px] uppercase tracking-widest text-accent-foreground/70 font-semibold">
          Saldo
        </p>
        <p className={`font-display text-4xl mt-1 privacy-blur ${saldo >= 0 ? "text-primary" : "text-destructive"}`}>
          {saldo >= 0 ? "+" : ""}{fmtEUR(saldo)}
        </p>
        <div className="grid grid-cols-2 gap-2 mt-4">
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
        </div>
      </Card>

      <div className="flex justify-end">
        <Button size="sm" className="rounded-xl" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Nova dívida
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="w-full">
          <TabsTrigger value="pendentes" className="flex-1">Pendentes</TabsTrigger>
          <TabsTrigger value="pagas" className="flex-1">Pagas</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
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
                <button onClick={() => handleToggle(d)}
                  className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${d.pago ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary"}`}>
                  {d.pago ? <Check className="w-3.5 h-3.5" /> : isDevo ? <ArrowUpRight className="w-3.5 h-3.5 text-destructive" /> : <ArrowDownLeft className="w-3.5 h-3.5 text-primary" />}
                </button>
                <button onClick={() => openEdit(d)} className="flex-1 min-w-0 text-left">
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
                  onClick={() => handleDel(d.id)}>
                  {d.pago ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </Card>
          );
        })
      )}

      <DebtDialog open={debtOpen} onOpenChange={setDebtOpen} debt={editingDebt} onSaved={() => refetch()} />
    </main>
  );
}
