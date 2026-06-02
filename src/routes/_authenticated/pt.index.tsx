import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Users, CreditCard, Package, Gift, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  listClients,
  type PtClient,
  fmtEUR,
  previsaoCliente,
} from "@/lib/pt-clients";

export const Route = createFileRoute("/_authenticated/pt/")({
  head: () => ({ meta: [{ title: "Dashboard · PT" }] }),
  component: DashboardPage,
});

const mesNome = (d: Date) =>
  new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(d);

function DashboardPage() {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["pt_clients"],
    queryFn: listClients,
  });

  const ativos = clients.filter((c) => c.status === "ativo");
  const antigos = clients.filter((c) => c.status === "antigo");
  const prospects = clients.filter((c) => c.status === "prospect");
  const vaiParar = ativos.filter((c) => c.forecast === "parar");
  const comDesconto = ativos.filter((c) => Number(c.desconto_afiliado ?? 0) > 0);

  const now = new Date();
  const proxMes = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const previstoMes = ativos.reduce((s, c) => s + Number(c.valor_acordado || 0), 0);
  const previstoProx = ativos.reduce((s, c) => s + previsaoCliente(c), 0);
  const totalDescontos = comDesconto.reduce((s, c) => s + Number(c.desconto_afiliado || 0), 0);

  if (isLoading) {
    return (
      <div className="py-16 flex justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <main className="px-5 pt-2 pb-6 space-y-5">
      {/* Mês atual previsto */}
      <Card className="p-5 bg-gradient-to-br from-accent to-surface border-accent/50 shadow-sm">
        <p className="text-[11px] uppercase tracking-widest text-accent-foreground/70 font-semibold">
          {mesNome(now)}
        </p>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-display text-4xl text-primary">{fmtEUR(previstoMes)}</span>
          <span className="text-xs text-muted-foreground">previstos</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {ativos.length} cliente{ativos.length === 1 ? "" : "s"} ativo{ativos.length === 1 ? "" : "s"}
        </p>
      </Card>

      {/* Previsão próximo mês */}
      <Card className="p-5 bg-surface border-border">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-primary" />
            Previsão {mesNome(proxMes).split(" ")[0]}
          </p>
        </div>
        <p className="font-display text-3xl mt-1 text-foreground">{fmtEUR(previstoProx)}</p>
        {vaiParar.length > 0 && (
          <p className="text-xs text-destructive mt-1">
            −{fmtEUR(vaiParar.reduce((s, c) => s + Number(c.valor_acordado || 0), 0))} de {vaiParar.length} a sair
          </p>
        )}
      </Card>

      {/* Grid de stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Users} value={ativos.length} label="Ativos" />
        <StatCard icon={CreditCard} value={ativos.filter((c) => c.service_type === "mensalidade").length} label="Mensal" />
        <StatCard icon={Package} value={ativos.filter((c) => c.service_type === "pack").length} label="Pack" />
        <StatCard icon={Users} value={prospects.length} label="Prospects" tone="muted" />
      </div>

      {/* Vai parar */}
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

      {/* Descontos afiliado */}
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

      {/* Antigos */}
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
    <Card className="p-4 bg-surface border-border">
      <Icon className={`w-4 h-4 mb-2 ${tone === "muted" ? "text-muted-foreground" : "text-primary"}`} strokeWidth={1.75} />
      <p className="font-display text-3xl leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </Card>
  );
}

// Re-export so unused imports don't break
export type { PtClient };
