import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Users, TrendingUp, Dumbbell, CreditCard, UserPlus, UserMinus, Gift, Trophy, Activity, Wallet, CalendarDays,
} from "lucide-react";
import { listClients, fmtEUR, valorAPagar, type PtClient } from "@/lib/pt-clients";
import { listAllPayments } from "@/lib/pt-payments";
import { listAllTrainings } from "@/lib/pt-trainings";

export const Route = createFileRoute("/_authenticated/pt/reports")({
  head: () => ({ meta: [{ title: "Relatórios · PT" }] }),
  component: ReportsPage,
});

const MONTHS = 12;

const ymKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const ymLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-PT", { month: "short" })
    .format(new Date(y, (m ?? 1) - 1, 1))
    .replace(".", "");
};

function lastMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    out.push(ymKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return out;
}

const ymLabelLong = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" })
    .format(new Date(y, (m ?? 1) - 1, 1));
};

function ReportsPage() {
  const { data: clients = [], isLoading: l1 } = useQuery({
    queryKey: ["pt_clients"], queryFn: listClients,
  });
  const { data: payments = [], isLoading: l2 } = useQuery({
    queryKey: ["pt_payments_all"], queryFn: listAllPayments,
  });
  const { data: trainings = [], isLoading: l3 } = useQuery({
    queryKey: ["pt_trainings_all"], queryFn: listAllTrainings,
  });

  const months = useMemo(() => lastMonths(MONTHS), []);

  const byMonth = useMemo(() => {
    const map = new Map<string, { ym: string; receita: number; treinos: number; novos: number; saidas: number; pagamentos: number }>();
    months.forEach((ym) =>
      map.set(ym, { ym, receita: 0, treinos: 0, novos: 0, saidas: 0, pagamentos: 0 }),
    );
    for (const p of payments) {
      const row = map.get(p.mes_referencia);
      if (row) {
        row.receita += Number(p.valor_pt ?? p.valor_pago);
        row.pagamentos += 1;
      }
    }
    for (const t of trainings) {
      const ym = t.data.slice(0, 7);
      const row = map.get(ym);
      if (row) row.treinos += 1;
    }
    for (const c of clients) {
      if (c.mes_inicio) {
        const ym = c.mes_inicio.slice(0, 7);
        const row = map.get(ym);
        if (row) row.novos += 1;
      }
      if (c.status === "antigo" && c.updated_at) {
        const ym = c.updated_at.slice(0, 7);
        const row = map.get(ym);
        if (row) row.saidas += 1;
      }
    }
    return Array.from(map.values()).map((r) => ({ ...r, label: ymLabel(r.ym) }));
  }, [clients, payments, trainings, months]);

  const ativos = clients.filter((c) => c.status === "ativo");
  const antigos = clients.filter((c) => c.status === "antigo");
  const prospects = clients.filter((c) => c.status === "prospect");

  const receitaTotal = payments.reduce((s, p) => s + Number(p.valor_pt ?? p.valor_pago), 0);
  const receita12m = byMonth.reduce((s, r) => s + r.receita, 0);
  const treinos12m = byMonth.reduce((s, r) => s + r.treinos, 0);
  const [selectedMonth, setSelectedMonth] = useState(ymKey(new Date()));

  const novosMes = clients.filter((c) => c.mes_inicio?.slice(0, 7) === selectedMonth).length;
  const saidasMes = clients.filter(
    (c) => c.status === "antigo" && c.updated_at?.slice(0, 7) === selectedMonth,
  ).length;

  const pagosMesSelecionado = payments.filter((p) => p.mes_referencia === selectedMonth);
  const ticketMedio = pagosMesSelecionado.length
    ? pagosMesSelecionado.reduce((s, p) => s + Number(p.valor_pt ?? p.valor_pago), 0) / pagosMesSelecionado.length
    : 0;

  const mediaReceitaMes = receita12m / MONTHS;
  const mediaTreinosMes = treinos12m / MONTHS;

  const monthOptions = useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      out.push(ymKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    }
    return out;
  }, []);

  const totalDescontos = ativos.reduce((s, c) => s + Number(c.desconto_afiliado || 0), 0);
  const previstoMes = ativos.reduce((s, c) => s + valorAPagar(c), 0);

  // Top 5 clientes por receita total
  const receitaPorCliente = new Map<string, number>();
  for (const p of payments) {
    receitaPorCliente.set(
      p.client_id,
      (receitaPorCliente.get(p.client_id) ?? 0) + Number(p.valor_pt ?? p.valor_pago),
    );
  }
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const topClientes = Array.from(receitaPorCliente.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, total]) => ({ client: clientMap.get(id), total }))
    .filter((r): r is { client: PtClient; total: number } => !!r.client);

  // Top treinos
  const treinosPorCliente = new Map<string, number>();
  for (const t of trainings) {
    treinosPorCliente.set(t.client_id, (treinosPorCliente.get(t.client_id) ?? 0) + 1);
  }
  const topTreinos = Array.from(treinosPorCliente.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, n]) => ({ client: clientMap.get(id), n }))
    .filter((r): r is { client: PtClient; n: number } => !!r.client);

  // Distribuição por tipo
  const mensalidade = ativos.filter((c) => c.service_type === "mensalidade").length;
  const pack = ativos.filter((c) => c.service_type === "pack").length;

  // Frequência semanal
  const freqDist = [1, 2, 3, 4, 5].map((f) => ({
    label: `${f}x`,
    n: ativos.filter((c) => c.frequencia_semanal === f).length,
  })).filter((r) => r.n > 0);

  // Net growth do mês atual
  const netGrowth = novosMes - saidasMes;

  // Taxa de retenção: ativos / (ativos + antigos)
  const retencao = ativos.length + antigos.length > 0
    ? (ativos.length / (ativos.length + antigos.length)) * 100
    : 0;

  if (l1 || l2 || l3) {
    return (
      <div className="py-16 flex justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <main className="px-5 pt-2 pb-8 space-y-4">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-medium">
          Relatórios
        </p>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[160px] h-8 text-xs bg-surface border-border">
            <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-primary" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((ym) => (
              <SelectItem key={ym} value={ym} className="text-xs">
                {ymLabelLong(ym)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hero — Receita lifetime */}
      <Card className="relative overflow-hidden p-6 bg-surface border-border">
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-medium">
            Receita total
          </p>
          <p className="font-display text-5xl mt-3 text-foreground font-semibold tracking-tight privacy-blur">
            {fmtEUR(receitaTotal)}
          </p>
          <p className="text-xs text-muted-foreground mt-2 privacy-blur">
            {payments.length} pagamentos · média {fmtEUR(mediaReceitaMes)}/mês
          </p>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <Stat icon={Users} value={clients.length} label="Clientes totais" />
        <Stat icon={Activity} value={ativos.length} label="Ativos" />
        <Stat icon={UserPlus} value={novosMes} label={`Novos · ${ymLabel(selectedMonth)}`} />
        <Stat icon={UserMinus} value={saidasMes} label={`Saídas · ${ymLabel(selectedMonth)}`} tone={saidasMes > 0 ? "danger" : "default"} />
        <Stat icon={Dumbbell} value={treinos12m} label="Treinos · 12m" />
        <Stat icon={CreditCard} value={payments.length} label="Pagamentos" />
        <Stat icon={Wallet} value={fmtEUR(ticketMedio)} label="Ticket médio" small blur />
        <Stat icon={TrendingUp} value={fmtEUR(previstoMes)} label="Previsto mês" small blur />
      </div>

      {/* Receita por mês */}
      <Card className="p-5 bg-surface border-border">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-medium mb-1">
          Receita · últimos 12 meses
        </p>
        <p className="font-display text-2xl font-semibold mb-4 privacy-blur">{fmtEUR(receita12m)}</p>
        <div className="h-44 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byMonth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={50} />
              <Tooltip
                cursor={{ fill: "oklch(from var(--muted) l c h / 0.3)" }}
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [fmtEUR(v), "Receita"]}
              />
              <Bar dataKey="receita" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Treinos por mês */}
      <Card className="p-5 bg-surface border-border">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-medium mb-1">
          Treinos · últimos 12 meses
        </p>
        <p className="font-display text-2xl font-semibold mb-4">
          {treinos12m} <span className="text-sm text-muted-foreground font-normal">· {mediaTreinosMes.toFixed(1)}/mês</span>
        </p>
        <div className="h-40 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={byMonth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="treinos" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Novos vs saídas — mês selecionado */}
      <Card className="p-5 bg-surface border-border">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-medium mb-1">
          Crescimento · {ymLabelLong(selectedMonth)}
        </p>
        <p className="font-display text-2xl font-semibold mb-4">
          {netGrowth >= 0 ? "+" : ""}{netGrowth}
          <span className="text-sm text-muted-foreground font-normal ml-2">líquido</span>
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              <span className="w-2 h-2 rounded-sm bg-primary" /> Novos
            </div>
            <p className="font-display text-3xl font-semibold leading-none">{novosMes}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              <span className="w-2 h-2 rounded-sm bg-destructive" /> Saídas
            </div>
            <p className="font-display text-3xl font-semibold leading-none">{saidasMes}</p>
          </div>
        </div>
      </Card>

      {/* Top 5 receita */}
      {topClientes.length > 0 && (
        <Card className="p-4 bg-surface border-border">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-primary" /> Top 5 · receita total
          </p>
          <ul className="space-y-2 text-sm">
            {topClientes.map((r, i) => (
              <li key={r.client.id} className="flex justify-between items-center">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-muted-foreground font-mono w-4">{i + 1}</span>
                  <span className="truncate">{r.client.nome}</span>
                </span>
                <span className="text-primary font-mono text-xs shrink-0">{fmtEUR(r.total)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Top treinos */}
      {topTreinos.length > 0 && (
        <Card className="p-4 bg-surface border-border">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Dumbbell className="w-4 h-4 text-primary" /> Top 5 · treinos dados
          </p>
          <ul className="space-y-2 text-sm">
            {topTreinos.map((r, i) => (
              <li key={r.client.id} className="flex justify-between items-center">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-muted-foreground font-mono w-4">{i + 1}</span>
                  <span className="truncate">{r.client.nome}</span>
                </span>
                <span className="text-muted-foreground font-mono text-xs shrink-0">{r.n}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Mix de serviço + frequência */}
      <div className="grid grid-cols-2 gap-2.5">
        <Card className="p-4 bg-surface border-border">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Tipo</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Mensal</span><span className="font-mono text-xs text-muted-foreground">{mensalidade}</span></div>
            <div className="flex justify-between"><span>Pack</span><span className="font-mono text-xs text-muted-foreground">{pack}</span></div>
          </div>
        </Card>
        <Card className="p-4 bg-surface border-border">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Frequência</p>
          <div className="space-y-2 text-sm">
            {freqDist.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
            {freqDist.map((f) => (
              <div key={f.label} className="flex justify-between">
                <span>{f.label}/sem</span>
                <span className="font-mono text-xs text-muted-foreground">{f.n}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Saúde do negócio */}
      <Card className="p-4 bg-surface border-border">
        <p className="text-sm font-semibold text-foreground mb-3">Saúde do negócio</p>
        <ul className="space-y-2 text-sm">
          <Row label="Taxa de retenção" value={`${retencao.toFixed(0)}%`} />
          <Row label="Prospects no pipeline" value={String(prospects.length)} />
          <Row label="Descontos ativos" value={fmtEUR(totalDescontos)} icon={Gift} />
          <Row label="Receita média / mês (12m)" value={fmtEUR(mediaReceitaMes)} />
          <Row label="Treinos médios / mês (12m)" value={mediaTreinosMes.toFixed(1)} />
        </ul>
      </Card>

      {clients.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">Ainda sem dados para gerar relatórios.</p>
        </div>
      )}
    </main>
  );
}

function Row({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Gift }) {
  return (
    <li className="flex justify-between items-center">
      <span className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </span>
      <span className="font-mono text-xs text-foreground">{value}</span>
    </li>
  );
}

function Stat({
  icon: Icon, value, label, tone = "default", small = false, blur = false,
}: {
  icon: typeof Users;
  value: number | string;
  label: string;
  tone?: "default" | "danger";
  small?: boolean;
  blur?: boolean;
}) {
  return (
    <Card className="p-4 bg-surface border-border">
      <Icon
        className={`w-3.5 h-3.5 mb-3 ${tone === "danger" ? "text-destructive" : "text-primary"}`}
        strokeWidth={1.8}
      />
      <p className={`font-display ${small ? "text-xl" : "text-3xl"} leading-none font-semibold tracking-tight ${blur ? "privacy-blur" : ""}`}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1.5">{label}</p>
    </Card>
  );
}
