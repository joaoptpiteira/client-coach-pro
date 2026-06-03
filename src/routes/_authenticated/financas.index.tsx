import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Repeat, PiggyBank, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { mesRef, mesRefLabel, shiftMes, fmtEUR, fmtEURcompact } from "@/lib/fin-shared";
import { getMonthOverview } from "@/lib/fin-month";
import { valorMensalEfetivo } from "@/lib/fin-fixed";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from "recharts";

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

  // 6 meses para o gráfico
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
      }));
    },
  });

  if (isLoading || !data) {
    return (
      <main className="px-5 py-10 flex justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
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

      {/* Saldo grande */}
      <Card className="p-5 bg-gradient-to-br from-accent to-surface border-accent/50">
        <p className="text-[11px] uppercase tracking-widest text-accent-foreground/70 font-semibold">
          Saldo do mês
        </p>
        <p
          className={`font-display text-4xl mt-1 ${data.saldo >= 0 ? "text-primary" : "text-destructive"}`}
        >
          {data.saldo >= 0 ? "+" : ""}
          {fmtEUR(data.saldo)}
        </p>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="text-muted-foreground">
            <TrendingUp className="w-3 h-3 inline mr-1 text-[var(--color-success,#5a8a5a)]" />
            {fmtEUR(data.receitas.total)}
          </span>
          <span className="text-muted-foreground">
            <TrendingDown className="w-3 h-3 inline mr-1 text-destructive" />
            {fmtEUR(data.despesas.total)}
          </span>
        </div>
      </Card>

      {/* Grid 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Receitas"
          value={data.receitas.total}
          icon={TrendingUp}
          accent="success"
          sub={`PT ${fmtEURcompact(data.receitas.pt)} · Outros ${fmtEURcompact(data.receitas.manual)}`}
        />
        <StatCard
          label="Despesas"
          value={data.despesas.total}
          icon={TrendingDown}
          accent="destructive"
          sub={`Fixas ${fmtEURcompact(data.despesas.fixas)} · Var ${fmtEURcompact(data.despesas.variaveis)}`}
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

      {/* Gráfico 6m */}
      {history.length > 0 && (
        <Card className="p-4 bg-surface border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Últimos 6 meses
          </p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
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
              </BarChart>
            </ResponsiveContainer>
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
                    <span className="text-muted-foreground font-mono">
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
                  <span className="font-mono text-xs text-destructive shrink-0">
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
                <span className="font-mono text-xs text-primary shrink-0">
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

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: number;
  icon: typeof TrendingUp;
  accent: "success" | "destructive" | "primary" | "warning";
  sub?: string;
}) {
  const colorClass = {
    success: "text-[var(--color-success,#5a8a5a)]",
    destructive: "text-destructive",
    primary: "text-primary",
    warning: "text-[var(--color-warning)]",
  }[accent];
  return (
    <Card className="p-3.5 bg-surface border-border">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        <Icon className={`w-3 h-3 ${colorClass}`} /> {label}
      </div>
      <p className={`font-display text-xl mt-1 ${colorClass}`}>{fmtEURcompact(value)}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1 truncate">{sub}</p>}
    </Card>
  );
}
