import { listCategories, type FinCategory } from "./fin-categories";
import { listFixed, valorMensalEfetivo, ativoNoMes, type FinFixed } from "./fin-fixed";
import { listTransactionsByMonth, type FinTransaction } from "./fin-transactions";
import { listPaymentsByMonth, type PtPayment } from "./pt-payments";

export type CategoryBreakdown = {
  id: string | null;
  nome: string;
  cor: string;
  total: number;
};


export type MonthOverview = {
  receitas: { pt: number; manual: number; total: number };
  despesas: { fixas: number; provisoes: number; variaveis: number; total: number };
  saldo: number;
  porCategoria: CategoryBreakdown[];
  topVariaveis: FinTransaction[];
  fixasAtivas: FinFixed[];
  transactions: FinTransaction[];
  payments: PtPayment[];
  categories: FinCategory[];
};

export async function getMonthOverview(ym: string): Promise<MonthOverview> {
  const [categories, fixed, transactions, payments] = await Promise.all([
    listCategories(),
    listFixed(),
    listTransactionsByMonth(ym),
    listPaymentsByMonth(ym),
  ]);

  const fixasAtivas = fixed.filter((f) => ativoNoMes(f, ym));

  // Receitas
  const ptReceita = payments.reduce((s, p) => s + Number(p.valor_pt ?? p.valor_pago), 0);
  const manualReceita = transactions
    .filter((t) => t.tipo === "receita")
    .reduce((s, t) => s + Number(t.valor), 0);

  // Despesas
  const txDespesas = transactions.filter((t) => t.tipo === "despesa");
  const variaveis = txDespesas
    .filter((t) => t.origem !== "fixa_gerada")
    .reduce((s, t) => s + Number(t.valor), 0);

  // Fixas (uma vez por despesa, exclui aquelas já materializadas em fin_transactions)
  const materializedIds = new Set(
    txDespesas.filter((t) => t.fixed_expense_id).map((t) => t.fixed_expense_id as string),
  );
  const fixasNaoMaterializadas = fixasAtivas.filter((f) => !materializedIds.has(f.id));
  const fixasMaterializadasTotal = txDespesas
    .filter((t) => t.origem === "fixa_gerada")
    .reduce((s, t) => s + Number(t.valor), 0);
  const fixasVirtuaisTotal = fixasNaoMaterializadas
    .filter((f) => f.tipo_recorrencia === "mensal")
    .reduce((s, f) => s + valorMensalEfetivo(f), 0);
  const provisoes = fixasNaoMaterializadas
    .filter((f) => f.tipo_recorrencia === "anual_provisao")
    .reduce((s, f) => s + valorMensalEfetivo(f), 0);

  const fixas = fixasVirtuaisTotal + fixasMaterializadasTotal;
  const despesasTotal = fixas + provisoes + variaveis;

  // Breakdown por categoria (despesas)
  const catMap = new Map<string, { id: string | null; nome: string; cor: string; total: number }>();
  const catLookup = new Map(categories.map((c) => [c.id, c]));

  const addCat = (catId: string | null, nome: string, cor: string, valor: number) => {
    const key = catId ?? `_${nome}`;
    const cur = catMap.get(key);
    if (cur) cur.total += valor;
    else catMap.set(key, { id: catId, nome, cor, total: valor });
  };

  for (const t of txDespesas) {
    const c = t.categoria_id ? catLookup.get(t.categoria_id) : null;
    addCat(c?.id ?? null, c?.nome ?? "Sem categoria", c?.cor ?? "#8a8a8a", Number(t.valor));
  }
  for (const f of fixasNaoMaterializadas) {
    const c = f.categoria_id ? catLookup.get(f.categoria_id) : null;
    addCat(
      c?.id ?? null,
      c?.nome ?? "Sem categoria",
      c?.cor ?? "#8a8a8a",
      valorMensalEfetivo(f),
    );
  }
  const porCategoria = Array.from(catMap.values()).sort((a, b) => b.total - a.total);

  const topVariaveis = [...txDespesas]
    .filter((t) => t.origem !== "fixa_gerada")
    .sort((a, b) => Number(b.valor) - Number(a.valor))
    .slice(0, 5);

  return {
    receitas: { pt: ptReceita, manual: manualReceita, total: ptReceita + manualReceita },
    despesas: { fixas, provisoes, variaveis, total: despesasTotal },
    saldo: ptReceita + manualReceita - despesasTotal,
    porCategoria,
    topVariaveis,
    fixasAtivas,
    transactions,
    payments,
    categories,
  };
}
