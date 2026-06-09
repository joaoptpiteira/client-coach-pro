import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  TrendingUp, TrendingDown, Repeat, PiggyBank, Calendar, Target, Sparkles, Wallet,
} from "lucide-react";
import { mesRef, mesRefLabel, shiftMes, fmtEUR, fmtEURcompact } from "@/lib/fin-shared";
import { getMonthOverview } from "@/lib/fin-month";
import { valorMensalEfetivo } from "@/lib/fin-fixed";
import { deltaPct, projectToEndOfMonth, fmtDelta, monthsRunway, avg } from "@/lib/analytics-shared";
import { Card } from "@/components/ui/card";
import { MonthNavigator } from "@/components/MonthNavigator";
import { CategoryDrillDownDialog } from "@/components/financas/CategoryDrillDownDialog";
import { BarChart, Bar, Line, ComposedChart, XAxis, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/_authenticated/financas/")({
  head: () => ({ meta: [{ title: "Finanças · Geral" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const [mes, setMes] = useState(() => mesRef(new Date()));

  const { data, isLoading } = useQuery({
    queryKey: ["fin_overview", mes],
    queryFn: () => getMonthOverview(mes),
  });

  const mesAnterior = shiftMes(mes, -1);
  const { data: prev } = useQuery({
    queryKey: ["fin_overview", mesAnterior],
    queryFn: () => getMonthOverview(mesAnterior),
  });

  const months6 = useMemo(() => {
    const arr: string[] = [];
    for (let i = 5; i >= 0; i--) arr.push(shiftMes(mes, -i));
    return arr;
  }, [mes]);

  const { data: history = [] } = useQuery({
    queryKey: ["fin_history", months6.join(",")],
    queryFn: async () => {
      const results = await Promise.all(months6.map((m) => getMonthOverview(m)));
      return months6.map((m, i) => ({
        mes: m.slice(5),
        receitas: Math.round(results[i].receitas.total),
        despesas: Math.round(results[i].despesas.total),
        saldo: Math.round(results[i].saldo),
      }));
    },
  });

  if (isLoading || !data) {
    return (
      <main className="px-5 py-10 flex justify-center">
        <div className="w:5 h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </main>
    );
  }

  const today = new Date();
  const isCurrentMonth = mes === mesRef(today);
  const proximas = data.fixasAtivas
    .filter((f) => f.dia_pagamento && (!isCurrentMonth || f.dia_pagamento >= today.getDate()))
    .sort((a, b) => (a.dia_pagamento ?? 99) - (b.dia_pagamento ?? 99))
    .slice(0, 5);

  const maxCat = data.porCategoria[0]?.total ?? 1;

  const deltaSaldo = prev ? deltaPct(data.saldo, prev.saldo) : null;
  const deltaReceitas = prev ? deltaPct(data.receitas.total, prev.receitas.total) : null;
  const deltaDespesas = prev ? deltaPct(data.despesas.total, prev.despesas.total) : null;

  // Projeção do mês corrente (extrapola variáveis; fixas já estão na contagem)
  const projVariaveis = isCurrentMonth ? projectToEndOfMonth(data.despesas.variaveis, mes) : data.despesas.variaveis;
  const projDespesas = data.despesas.fixas + data.despesas.provisoes + projVariaveis;
  const projSaldo = data.receitas.total - projDespesas;

  // Orçamentos por categoria
  const catBudgets = useBudgets(data.categories);
  const orcamentosExcedidos = data.porCategoria
    .map((c) => {
      const budget = c.id ? catBudgets[c.id] ?? 0 : 0;
      if (!budget) return null;
      const pct = (c.total / budget) * 100;
      return { ...c, budget, pct };
    })
    .filter((c): c is NonNullable<typeof c> => !!c && c.pct >= 80)
    .sort((a, b) => b.pct - a.pct);

  // Runway: saldo acumulado dos últimos 6 meses / despesa média
  const saldoAcumulado = history.reduce((s, m) => s + m.saldo, 0);
  const despesaMedia = avg(history.map((m) => m.despesas));
  const runway = monthsRunway(saldoAcumulado, despesaMedia);

  // Drill-down de categoria
  const [drill, setDrill] = useState<{ id: string | null; nome: string; cor: string; total: number } | null>(null);
  const drillTxs = drill
    ? data.transactions.filter(
        (t) => t.tipo === "despesa" && (t.categoria_id ?? null) === drill.id,
      )
    : [];
  const drillFixas = drill
    ? data.fixasAtivas.filter((f) => (f.categoria_id ?? null) === drill.id)
    : [];

  return (
    <main className="px-5 pt-2 pb-6 space-y-4">
      <MonthNavigator value={mes} onChange={setMes} label={mesRefLabel(mes)} />

      {/* Saldo grande */}
      <Card className="p-5 bg-gradient-to-br from-accent to-surface border-accent/50">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] uppercase tracking-widest text-accent-foreground/70 font-semibold">
            Saldo do mês
          </p>
          {deltaSaldo !== null && (
            <DeltaBadge value={deltaSaldo} positiveGood />
          )}
        </div>
        <p
          className={`font-display text-4xl mt-1 privacy-blur ${data.saldo >= 0 ? "text-primary" : "text-destructive"}`}
        >
          {data.saldo >= 0 ? "+" : ""}
          {fmtEUR(data.saldo)}
        </p>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="text-muted-foreground privacy-blur">
            <TrendingUp className="w-3 h-3 inline mr-1 text-[var(--color-success,#5a8a5a)]" />
            {fmtEUR(data.receitas.total)}
          </span>
          <span className="text-muted-foreground privacy-blur">
            <TrendingDown className="w-3 h-3 inline mr-1 text-destructive" />
            {fmtEUR(data.despesas.total)}
          </span>
        </div>
        {isCurrentMonth && (
          <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" /> Projetado fim do mês
            </span>
            <span className={`font-mono privacy-blur ${projSaldo >= 0 ? "text-primary" : "text-destructive"}`}>
              {projSaldo >= 0 ? "+" : ""}{fmtEUR(projSaldo)}
            </span>
          </div>
        )}
      </Card>

      {/* Runway / saldo acumulado */}
      {history.length >= 3 && (
        <Card className="p-4 bg-surface border-border">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <Wallet className="w-3 h-3 text-primary" /> Runway · 6 meses
            </p>
            {runway !== null && (
              <span className={`font-mono text-xs ${runway >= 3 ? "text-[var(--color-success,#5a8a5a)]" : runway >= 1 ? "text-[var(--color-warning,#c9893a)]" : "text-destructive"}`}>
                {runway.toFixed(1)} {runway === 1 ? "mês" : "meses"}
              </span>
            )}
          </div>
          <p className={`font-display text-2xl mt-1 privacy-blur ${saldoAcumulado >= 0 ? "text-primary" : "text-destructive"}`}>
            {saldoAcumulado >= 0 ? "+" : ""}{fmtEUR(saldoAcumulado)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 privacy-blur">
            Saldo acumulado · despesa média {fmtEUR(despesaMedia)}/mês
          </p>
        </Card>
      )}

      {/* Grid 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Receitas"
          value={data.receitas.total}
          icon={TrendingUp}
          accent="success"
          sub={`PT ${fmtEURcompact(data.receitas.pt)} · Outros ${fmtEURcompact(data.receitas.manual)}`}
          delta={deltaReceitas}
          positiveGood
        />
        <StatCard
          label="Despesas"
          value={data.despesas.total}
          icon={TrendingDown}
          accent="destructive"
          sub={`Fixas ${fmtEURcompact(data.despesas.fixas)} · Var ${fmtEURcompact(data.despesas.variaveis)}`}
          delta={deltaDespesas}
          positiveGood={false}
        />
        <StatCard
          label="Compromisso fixo"
          value={data.despesas.fixas}
          icon={Repeat}
          accent="primary"
          sub={`${data.fixasAtivas.filter((f) => f.tipo_recorrencia === "mensal").length} despesas mensais`}
        />
        <StatCard
          label="Provisão anual"
          value={data.despesas.provisoes}
          icon={PiggyBank}
          accent="warning"
          sub={`${data.fixasAtivas.filter((f) => f.tipo_recorrencia === "anual_provisao").length} provisões /mês`}
        />
      </div>

      {/* Alertas de orçamento */}
      {orcamentosExcedidos.length > 0 && (
        <Card className="p-4 bg-surface border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-primary" /> Orçamentos no limite
          </p>
          <ul className="space-y-2.5">
            {orcamentosExcedidos.map((c) => {
              const over = c.pct > 100;
              return (
                <li key={c.id ?? c.nome}>
                  <div className="flex justify-between items-baseline text-xs mb-1">
                    <span className="font-medium">{c.nome}</span>
                    <span className={`font-mono ${over ? "text-destructive font-semibold" : "text-muted-foreground"} privacy-blur`}>
                      {fmtEUR(c.total)} / {fmtEUR(c.budget)} · {c.pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${over ? "bg-destructive" : "bg-[var(--color-warning,#c9893a)]"}`}
                      style={{ width: `${Math.min(100, c.pct)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Gráfico 6m com saldo */}
      {history.length > 0 && (
        <Card className="p-4 bg-surface border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Últimos 6 meses
          </p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(v: number) => fmtEUR(v)}
                />
                <Bar dataKey="receitas" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="despesas" fill="var(--color-destructive)" radius={[3, 3, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  stroke="var(--color-foreground)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-foreground)" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-3 text-[10px] text-muted-foreground mt-2 justify-center">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-primary mr-1" />Receitas</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-destructive mr-1" />Despesas</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-foreground mr-1" />Saldo</span>
          </div>
        </Card>
      )}

      {/* Por categoria */}
      {data.porCategoria.length > 0 && (
        <Card className="p-4 bg-surface border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Despesas por categoria
          </p>
          <ul className="space-y-2.5">
            {data.porCategoria.map((c) => {
              const pct = (c.total / data.despesas.total) * 100;
              const widthPct = (c.total / maxCat) * 100;
              return (
                <li key={c.id ?? c.nome}>
                  <div className="flex justify-between items-baseline text-xs mb-1">
                    <span className="font-medium">{c.nome}</span>
                    <span className="text-muted-foreground font-mono privacy-blur">
                      {fmtEUR(c.total)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${widthPct}%`, background: c.cor }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Top variáveis */}
      {data.topVariaveis.length > 0 && (
        <Card className="p-4 bg-surface border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Top 5 variáveis
          </p>
          <ul className="space-y-2">
            {data.topVariaveis.map((t) => {
              const cat = data.categories.find((c) => c.id === t.categoria_id);
              return (
                <li key={t.id} className="flex justify-between items-center text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{t.descricao || cat?.nome || "Sem descrição"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(t.data).toLocaleDateString("pt-PT")} · {cat?.nome ?? "—"}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-destructive shrink-0 privacy-blur">
                    {fmtEUR(Number(t.valor))}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Próximas fixas */}
      {proximas.length > 0 && (
        <Card className="p-4 bg-surface border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Próximos pagamentos
          </p>
          <ul className="space-y-2">
            {proximas.map((f) => (
              <li key={f.id} className="flex justify-between items-center text-sm">
                <div className="min-w-0">
                  <p className="truncate">{f.nome}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Dia {f.dia_pagamento}
                    {f.tipo_recorrencia === "anual_provisao" ? " · provisão anual" : ""}
                  </p>
                </div>
                <span className="font-mono text-xs text-primary shrink-0 privacy-blur">
                  {fmtEUR(valorMensalEfetivo(f))}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}

function useBudgets(categories: Array<{ id: string } & Record<string, unknown>>): Record<string, number> {
  return useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of categories) {
      const b = Number((c as Record<string, unknown>).orcamento_mensal ?? 0);
      if (b > 0) map[c.id] = b;
    }
    return map;
  }, [categories]);
}

function DeltaBadge({ value, positiveGood }: { value: number; positiveGood: boolean }) {
  const isUp = value >= 0;
  const good = positiveGood ? isUp : !isUp;
  const color = value === 0
    ? "text-muted-foreground"
    : good
      ? "text-[var(--color-success,#5a8a5a)]"
      : "text-destructive";
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono ${color}`}>
      <Icon className="w-3 h-3" />
      {fmtDelta(value)}
    </span>
  );
}

function StatCard({
  label, value, icon: Icon, accent, sub, delta, positiveGood,
}: {
  label: string;
  value: number;
  icon: typeof TrendingUp;
  accent: "success" | "destructive" | "primary" | "warning";
  sub?: string;
  delta?: number | null;
  positiveGood?: boolean;
}) {
  const colorClass = {
    success: "text-[var(--color-success,#5a8a5a)]",
    destructive: "text-destructive",
    primary: "text-primary",
    warning: "text-[var(--color-warning)]",
  }[accent];
  return (
    <Card className="p-3.5 bg-surface border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          <Icon className={`w-3 h-3 ${colorClass}`} /> {label}
        </div>
        {delta !== undefined && delta !== null && positiveGood !== undefined && (
          <DeltaBadge value={delta} positiveGood={positiveGood} />
        )}
      </div>
      <p className={`font-display text-xl mt-1 privacy-blur ${colorClass}`}>{fmtEURcompact(value)}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1 truncate privacy-blur">{sub}</p>}
    </Card>
  );
}
