import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listClients, fmtEUR, valorAPagar } from "@/lib/pt-clients";
import {
  listPaymentsByMonth, deletePayment, mesRef, mesRefLabel, shiftMes,
} from "@/lib/pt-payments";
import { PaymentDialog } from "@/components/pt/PaymentDialog";

export const Route = createFileRoute("/_authenticated/pt/payments")({
  head: () => ({ meta: [{ title: "Pagamentos · PT" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const [mes, setMes] = useState(() => mesRef(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preselectClient, setPreselectClient] = useState<string | null>(null);

  const { data: clients = [] } = useQuery({ queryKey: ["pt_clients"], queryFn: listClients });
  const { data: payments = [], refetch, isLoading } = useQuery({
    queryKey: ["pt_payments", mes],
    queryFn: () => listPaymentsByMonth(mes),
  });

  const ativos = clients.filter((c) => c.status === "ativo");
  const byClient = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of payments) map[p.client_id] = (map[p.client_id] ?? 0) + Number(p.valor_pago);
    return map;
  }, [payments]);

  const totalRecebido = payments.reduce((s, p) => s + Number(p.valor_pago), 0);
  const emFalta = ativos.filter((c) => !byClient[c.id]);
  const totalFalta = emFalta.reduce((s, c) => s + valorAPagar(c), 0);

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar este pagamento?")) return;
    try {
      await deletePayment(id);
      toast.success("Eliminado");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const openNew = (clientId?: string) => {
    setPreselectClient(clientId ?? null);
    setDialogOpen(true);
  };

  return (
    <main className="px-5 pt-2 pb-6 space-y-4">
      {/* Month navigator */}
      <div className="flex items-center justify-between bg-surface border border-border rounded-xl px-2 py-1.5">
        <Button variant="ghost" size="icon" onClick={() => setMes((m) => shiftMes(m, -1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <p className="font-display text-base capitalize">{mesRefLabel(mes)}</p>
        <Button variant="ghost" size="icon" onClick={() => setMes((m) => shiftMes(m, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Totals */}
      <Card className="p-5 bg-gradient-to-br from-accent to-surface border-accent/50">
        <p className="text-[11px] uppercase tracking-widest text-accent-foreground/70 font-semibold">
          Total recebido
        </p>
        <p className="font-display text-4xl text-primary mt-1">{fmtEUR(totalRecebido)}</p>
        <p className="text-xs text-muted-foreground mt-2">
          {payments.length} pagamento{payments.length === 1 ? "" : "s"} · {ativos.length - emFalta.length}/{ativos.length} clientes pagos
        </p>
      </Card>

      {emFalta.length > 0 && (
        <Card className="p-4 bg-surface border-border">
          <p className="text-sm font-semibold flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-destructive" />
            Falta receber · {fmtEUR(totalFalta)}
          </p>
          <ul className="space-y-1.5">
            {emFalta.map((c) => (
              <li key={c.id}>
                <button onClick={() => openNew(c.id)}
                  className="w-full flex justify-between items-center text-sm py-1.5 px-2 -mx-2 rounded-lg hover:bg-muted/60 transition-colors">
                  <span>{c.nome}</span>
                  <span className="font-mono text-xs text-primary">{fmtEUR(valorAPagar(c))} →</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Payments list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Pagamentos do mês
          </p>
          <Button size="sm" onClick={() => openNew()} className="h-8 gap-1">
            <Plus className="w-3.5 h-3.5" /> Novo
          </Button>
        </div>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <Card className="p-8 text-center bg-surface border-border">
            <p className="text-sm text-muted-foreground">Sem pagamentos este mês.</p>
          </Card>
        ) : (
          payments.map((p) => {
            const c = clients.find((c) => c.id === p.client_id);
            return (
              <Card key={p.id} className="p-3.5 bg-surface border-border flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c?.nome ?? "Cliente eliminado"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(p.data).toLocaleDateString("pt-PT")}
                    {p.notas && ` · ${p.notas}`}
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-xs">{fmtEUR(Number(p.valor_pago))}</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(p.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </Card>
            );
          })
        )}
      </div>

      <PaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clients={ativos}
        defaultMonth={mes}
        defaultClientId={preselectClient}
        onSaved={() => refetch()}
      />
    </main>
  );
}
