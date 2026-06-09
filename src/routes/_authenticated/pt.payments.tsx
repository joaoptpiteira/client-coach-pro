import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, CheckCircle2, AlertCircle, MessageCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listClients, fmtEUR, valorAPagar } from "@/lib/pt-clients";
import {
  listPaymentsByMonth, deletePayment, mesRef, mesRefLabel,
} from "@/lib/pt-payments";
import { PaymentDialog } from "@/components/pt/PaymentDialog";
import { AddTrainingsDialog } from "@/components/pt/AddTrainingsDialog";
import { MonthNavigator } from "@/components/MonthNavigator";
import { whatsappLink } from "@/lib/analytics-shared";
import type { PtClient } from "@/lib/pt-clients";

export const Route = createFileRoute("/_authenticated/pt/payments")({
  head: () => ({ meta: [{ title: "Pagamentos · PT" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const [mes, setMes] = useState(() => mesRef(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preselectClient, setPreselectClient] = useState<string | null>(null);
  const [trainingsDialogOpen, setTrainingsDialogOpen] = useState(false);
  const [trainingsClient, setTrainingsClient] = useState<PtClient | null>(null);
  const qc = useQueryClient();


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

  const totalRecebido = payments.reduce((s, p) => s + Number(p.valor_pt ?? p.valor_pago), 0);
  const emFalta = ativos.filter((c) => !byClient[c.id]);
  const totalFalta = emFalta.reduce((s, c) => s + valorAPagar(c), 0);

  // Dias em atraso só faz sentido no mês corrente
  const isCurrentMonth = mes === mesRef(new Date());
  const today = new Date();
  const diasAtraso = isCurrentMonth ? Math.max(0, today.getDate() - 5) : 0;

  // Agrupar pagamentos por data
  const groupedPayments = useMemo(() => {
    const m: Record<string, typeof payments> = {};
    for (const p of payments) (m[p.data] ??= []).push(p);
    return Object.entries(m).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [payments]);

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
      <MonthNavigator value={mes} onChange={setMes} label={mesRefLabel(mes)} />

      {/* Totals */}
      <Card className="p-5 bg-gradient-to-br from-accent to-surface border-accent/50">
        <p className="text-[11px] uppercase tracking-widest text-accent-foreground/70 font-semibold">
          Total recebido
        </p>
        <p className="font-display text-4xl text-primary mt-1 privacy-blur">{fmtEUR(totalRecebido)}</p>
        <p className="text-xs text-muted-foreground mt-2">
          {payments.length} pagamento{payments.length === 1 ? "" : "s"} · {ativos.length - emFalta.length}/{ativos.length} clientes pagos
        </p>
      </Card>

      {emFalta.length > 0 && (
        <Card className="p-4 bg-surface border-border">
          <p className="text-sm font-semibold flex items-center gap-2 mb-3 flex-wrap">
            <AlertCircle className="w-4 h-4 text-destructive" />
            Falta receber · <span className="privacy-blur">{fmtEUR(totalFalta)}</span>
            {diasAtraso > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
                <Clock className="w-2.5 h-2.5" /> {diasAtraso}d atraso
              </Badge>
            )}
          </p>
          <ul className="space-y-1">
            {emFalta.map((c) => {
              const valor = valorAPagar(c);
              const wa = whatsappLink(
                c.telefone,
                `Olá ${c.nome}! Lembrete amigável do PT — mensalidade ${mesRefLabel(mes)} (${fmtEUR(valor)}). Obrigado! 💪`,
              );
              return (
                <li key={c.id} className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-lg hover:bg-muted/60 transition-colors">
                  <button onClick={() => openNew(c.id)} className="flex-1 min-w-0 text-left text-sm flex justify-between items-center gap-2">
                    <span className="truncate">{c.nome}</span>
                    <span className="font-mono text-xs text-primary privacy-blur shrink-0">{fmtEUR(valor)} →</span>
                  </button>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 transition-colors shrink-0"
                      aria-label="Lembrar via WhatsApp"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Payments list — agrupado por data */}
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
          groupedPayments.map(([date, list]) => (
            <div key={date} className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pl-1 pt-2">
                {new Date(date).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              {list.map((p) => {
                const c = clients.find((c) => c.id === p.client_id);
                return (
                  <Card key={p.id} className="p-3.5 bg-surface border-border flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c?.nome ?? "Cliente eliminado"}</p>
                      {p.notas && (
                        <p className="text-[11px] text-muted-foreground truncate">{p.notas}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="font-mono text-xs privacy-blur">{fmtEUR(Number(p.valor_pt ?? p.valor_pago))}</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </Card>
                );
              })}
            </div>
          ))
        )}
      </div>

      <PaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clients={ativos}
        defaultMonth={mes}
        defaultClientId={preselectClient}
        onSaved={(c) => {
          refetch();
          setTrainingsClient(c);
          setTrainingsDialogOpen(true);
        }}
      />

      <AddTrainingsDialog
        open={trainingsDialogOpen}
        onOpenChange={setTrainingsDialogOpen}
        client={trainingsClient}
        onDone={() => qc.invalidateQueries({ queryKey: ["pt_clients"] })}
      />
    </main>
  );
}
