import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  TrendingUp, TrendingDown, Users, CreditCard, Package, Gift, AlertTriangle, Dumbbell, CheckCircle2, Pencil, MessageCircle, Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ForecastDialog } from "@/components/pt/ForecastDialog";
import {
  listClients,
  type PtClient,
  fmtEUR,
  previsaoCliente,
  valorAPagar,
} from "@/lib/pt-clients";
import { listPaymentsByMonth, mesRef, shiftMes } from "@/lib/pt-payments";
import { listTrainingsByMonth } from "@/lib/pt-trainings";
import { daysSince, deltaPct, fmtDelta, whatsappLink } from "@/lib/analytics-shared";

export const Route = createFileRoute("/_authenticated/pt/")({
  head: () => ({ meta: [{ title: "Dashboard · PT" }] }),
  component: DashboardPage,
});

const mesNome = (d: Date) =>
  new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(d);

function DashboardPage() {
  const now = new Date();
  const proxMes = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const ymAtual = mesRef(now);
  const ymAnterior = shiftMes(ymAtual, -1);
  const queryClient = useQueryClient();
  const [forecastOpen, setForecastOpen] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["pt_clients"],
    queryFn: listClients,
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["pt_payments", ymAtual],
    queryFn: () => listPaymentsByMonth(ymAtual),
  });
  const { data: paymentsPrev = [] } = useQuery({
    queryKey: ["pt_payments", ymAnterior],
    queryFn: () => listPaymentsByMonth(ymAnterior),
  });
  const { data: trainings = [] } = useQuery({
    queryKey: ["pt_trainings_month", ymAtual],
    queryFn: () => listTrainingsByMonth(ymAtual),
  });

  const ativos = clients.filter((c) => c.status === "ativo");
  const antigos = clients.filter((c) => c.status === "antigo");
  const prospects = clients.filter((c) => c.status === "prospect");
  const vaiParar = ativos.filter((c) => c.forecast === "parar");
  const comDesconto = ativos.filter((c) => Number(c.desconto_afiliado ?? 0) > 0);

  const previstoMes = ativos.reduce((s, c) => s + valorAPagar(c), 0);
  const previstoProx = ativos.reduce((s, c) => s + previsaoCliente(c), 0);
  const totalDescontos = comDesconto.reduce((s, c) => s + Number(c.desconto_afiliado || 0), 0);

  const recebido = payments.reduce((s, p) => s + Number(p.valor_pt ?? p.valor_pago), 0);
  const recebidoPrev = paymentsPrev.reduce((s, p) => s + Number(p.valor_pt ?? p.valor_pago), 0);
  const deltaRecebido = deltaPct(recebido, recebidoPrev);

  const pagosIds = new Set(payments.map((p) => p.client_id));
  const emFalta = ativos.filter((c) => !pagosIds.has(c.id));
  const falta = emFalta.reduce((s, c) => s + valorAPagar(c), 0);

  // Dias em atraso: a partir do dia 5 do mês contamos atraso para mensalidades
  const hoje = now.getDate();
  const diasAtraso = Math.max(0, hoje - 5);

  // Clientes sem treino há ≥14 dias
  const semTreino = ativos
    .map((c) => {
      const ultimo = (c as unknown as { ultimo_treino_em: string | null }).ultimo_treino_em;
      const dias = daysSince(ultimo);
      return { c, dias, ultimo };
    })
    .filter((r) => r.dias !== null && r.dias >= 14)
    .sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0));

  if (isLoading) {
    return (
      <div className="py-16 flex justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <main className="px-5 pt-2 pb-8 space-y-4">
      {/* Recebido mês — hero */}
      <Card className="relative overflow-hidden p-6 bg-surface border-border">
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-medium">
              {mesNome(now)}
            </p>
            {deltaRecebido !== null && (
              <span className={`text-[10px] font-mono inline-flex items-center gap-1 ${
                deltaRecebido > 0
                  ? "text-[var(--color-success,#5a8a5a)]"
                  : deltaRecebido < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}>
                {deltaRecebido >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {fmtDelta(deltaRecebido)} vs mês anterior
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="font-display text-5xl text-foreground font-semibold tracking-tight privacy-blur">{fmtEUR(recebido)}</span>
          </div>
          <div className="mt-4 h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, previstoMes ? (recebido / previstoMes) * 100 : 0)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2.5 text-[11px] text-muted-foreground">
            <span className="privacy-blur">{ativos.length - emFalta.length}/{ativos.length} pagos · {fmtEUR(previstoMes)}</span>
            {falta > 0 && <span className="text-destructive font-medium privacy-blur">−{fmtEUR(falta)}</span>}
          </div>
        </div>
      </Card>

      {/* Previsão próximo mês */}
      <button onClick={() => setForecastOpen(true)} className="w-full text-left group">
        <Card className="p-5 bg-surface border-border hover:border-primary/40 transition-all active:scale-[0.99]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-medium flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-primary" />
                Previsão · {mesNome(proxMes).split(" ")[0]}
              </p>
              <p className="font-display text-3xl mt-2 text-foreground font-semibold privacy-blur">{fmtEUR(previstoProx)}</p>
              {vaiParar.length > 0 && (
                <p className="text-xs text-destructive mt-1.5 privacy-blur">
                  −{fmtEUR(vaiParar.reduce((s, c) => s + valorAPagar(c), 0))} · {vaiParar.length} a sair
                </p>
              )}
            </div>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
          </div>
        </Card>
      </button>

      <ForecastDialog
        open={forecastOpen}
        onOpenChange={setForecastOpen}
        clients={ativos}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["pt_clients"] })}
      />

      {/* Em falta com WhatsApp + atraso */}
      {emFalta.length > 0 && diasAtraso > 0 && (
        <Card className="p-4 bg-surface border-border">
          <p className="text-sm font-semibold flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Por receber
            <Badge variant="outline" className="text-[10px] ml-1 gap-1 px-1.5 py-0">
              <Clock className="w-2.5 h-2.5" /> {diasAtraso}d atraso
            </Badge>
          </p>
          <ul className="space-y-1.5">
            {emFalta.slice(0, 5).map((c) => {
              const valor = valorAPagar(c);
              const wa = whatsappLink(
                c.telefone,
                `Olá ${c.nome}! Lembrete amigável do PT — mensalidade ${mesNome(now)} (${fmtEUR(valor)}). Obrigado! 💪`,
              );
              return (
                <li key={c.id} className="flex items-center gap-2 text-sm py-1">
                  <span className="flex-1 truncate">{c.nome}</span>
                  <span className="font-mono text-xs text-primary privacy-blur">{fmtEUR(valor)}</span>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 transition-colors"
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

      {/* Sem treino há X dias */}
      {semTreino.length > 0 && (
        <Card className="p-4 bg-surface border-[var(--color-warning,#c9893a)]/30">
          <p className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Dumbbell className="w-4 h-4 text-[var(--color-warning,#c9893a)]" />
            Sem treino há +14 dias ({semTreino.length})
          </p>
          <ul className="space-y-1.5">
            {semTreino.slice(0, 5).map(({ c, dias }) => {
              const wa = whatsappLink(
                c.telefone,
                `Olá ${c.nome}! Há ${dias} dias que não treinamos. Quando podemos marcar próxima sessão? 💪`,
              );
              return (
                <li key={c.id} className="flex items-center gap-2 text-sm py-1">
                  <span className="flex-1 truncate">{c.nome}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{dias}d</span>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 transition-colors"
                      aria-label="Contactar via WhatsApp"
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

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard icon={Users} value={ativos.length} label="Ativos" />
        <StatCard icon={CheckCircle2} value={payments.length} label="Pagamentos" />
        <StatCard icon={Dumbbell} value={trainings.length} label="Treinos" />
        <StatCard icon={Users} value={prospects.length} label="Prospects" tone="muted" />
        <StatCard icon={CreditCard} value={ativos.filter((c) => c.service_type === "mensalidade").length} label="Mensal" />
        <StatCard icon={Package} value={ativos.filter((c) => c.service_type === "pack").length} label="Pack" />
      </div>

      {vaiParar.length > 0 && (
        <Card className="p-4 bg-surface border-destructive/30">
          <p className="text-sm font-semibold text-destructive flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4" /> Vai parar próximo mês ({vaiParar.length})
          </p>
          <ul className="space-y-1.5 text-sm">
            {vaiParar.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span>{c.nome}</span>
                <span className="text-muted-foreground font-mono text-xs">{fmtEUR(Number(c.valor_acordado))}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {comDesconto.length > 0 && (
        <Card className="p-4 bg-surface border-border">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4 text-primary" /> Descontos de afiliado
          </p>
          <ul className="space-y-1.5 text-sm">
            {comDesconto.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span>{c.nome}</span>
                <span className="text-primary font-mono text-xs">−{fmtEUR(Number(c.desconto_afiliado))}</span>
              </li>
            ))}
            <li className="flex justify-between pt-2 mt-1 border-t border-border font-medium">
              <span>Total</span>
              <span className="text-primary font-mono">−{fmtEUR(totalDescontos)}</span>
            </li>
          </ul>
        </Card>
      )}

      {antigos.length > 0 && (
        <Card className="p-4 bg-muted/40 border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            {antigos.length} cliente{antigos.length === 1 ? "" : "s"} antigo{antigos.length === 1 ? "" : "s"}
          </p>
        </Card>
      )}

      {clients.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Ainda sem clientes. Vai a <span className="text-primary font-medium">Clientes</span> para criar o primeiro.
          </p>
        </div>
      )}
    </main>
  );
}

interface StatProps {
  icon: typeof Users;
  value: number;
  label: string;
  tone?: "default" | "muted";
}
function StatCard({ icon: Icon, value, label, tone = "default" }: StatProps) {
  return (
    <Card className="p-4 bg-surface border-border hover:border-primary/30 transition-colors">
      <Icon className={`w-3.5 h-3.5 mb-3 ${tone === "muted" ? "text-muted-foreground" : "text-primary"}`} strokeWidth={1.8} />
      <p className="font-display text-3xl leading-none font-semibold tracking-tight">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1.5">{label}</p>
    </Card>
  );
}

export type { PtClient };
