
## Visão geral

App pessoal de finanças integrada no mesmo JP HUB. Bottom nav próprio, paleta consistente com a app PT. Foco em **simplicidade de input** (porque sabemos que o que mata estas apps é o atrito de registar).

Igual ao PT, divido em **fases**. Aqui vai a Fase 1 que cobre 80% do uso diário; Património e investimentos ficam para Fase 2.

---

## Decisões-chave (das tuas respostas)

- **Modo híbrido**: despesas fixas (renda, créditos, subscrições...) são lançadas **automaticamente** todo mês; despesas variáveis (gasolina, comida, lazer) tu lanças à mão quando quiseres, podem ser transação única ou total mensal.
- **Despesas anuais** (IUC, seguro carro): registas o valor anual + mês de pagamento → a app divide por 12 e mostra-te o "custo mensal real". Internamente continua a ser uma despesa fixa mensal, com uma flag a dizer que é provisão de anual.
- **Receita PT entra automaticamente**: cada pagamento registado em `pt_payments` aparece como linha de receita no mês correspondente (sem duplicação na BD — leitura cruzada).
- **Categorias fixas predefinidas** com possibilidade de adicionar próprias.
- **Mês como unidade central**: dashboard, listagens e seletor mensal igual ao da página de pagamentos PT.

---

## Schema (1 migração)

### Tabelas novas

`fin_categories` — categorias de receita/despesa
- `id`, `owner_id`, `nome`, `tipo` (`receita`|`despesa`), `cor` (text), `icone` (text), `ordem` (int)
- Semeadas por defeito: Casa, Carro, Alimentação, Gasolina, Subscrições, Créditos, Saúde, Lazer, Outros (despesa); Salário, PT, Outros (receita).

`fin_fixed_expenses` — despesas recorrentes
- `id`, `owner_id`, `nome`, `categoria_id`, `valor_mensal` (numeric), `dia_pagamento` (int 1–31, opcional)
- `tipo_recorrencia` enum `mensal`|`anual_provisao` (anual = divide por 12 mas continua a entrar todo mês)
- `valor_anual` (numeric, só quando `anual_provisao`), `mes_pagamento_anual` (int 1–12, informativo)
- `mes_inicio` (date), `mes_fim` (date, opcional para subscrições canceladas), `ativo` (bool)
- `notas`

`fin_transactions` — lançamentos avulsos (variáveis e ajustes)
- `id`, `owner_id`, `data` (date), `mes_referencia` (text YYYY-MM), `tipo` (`receita`|`despesa`), `categoria_id`, `valor` (numeric, positivo), `descricao` (text), `notas`
- `origem` enum `manual`|`fixa_gerada`|`pt_payment` — `pt_payment` nunca é criada manualmente, é uma view; mas guardamos a enum para flexibilidade futura.

Todas com RLS por `auth.uid() = owner_id` + GRANTs (`authenticated` + `service_role`, sem `anon`). Trigger `set_updated_at` igual ao das tabelas PT.

### Sem duplicação de PT
Os pagamentos PT **não** são copiados para `fin_transactions`. A query do dashboard/listagem faz `UNION` entre `fin_transactions` (receitas/despesas) e `pt_payments` (lidos como receita categoria "PT"). Isto evita inconsistências e mantém a verdade única na tabela PT.

---

## Geração automática de despesas fixas

Não criamos linhas físicas todo mês (mais simples). Em vez disso, ao ler um mês:
- Lista todas as `fin_fixed_expenses` ativas (`mes_inicio <= mês <= mes_fim || null`)
- Soma com as `fin_transactions` desse mês
- Soma com os `pt_payments` desse mês (como receita PT)

→ "lançamento automático" é virtual, calculado on-read. Vantagem: editar uma despesa fixa atualiza retroativamente sem migrações de dados.

Se quiseres "marcar como paga" uma despesa fixa num mês específico (ex: confirmar que a renda saiu), há um botão que cria uma `fin_transactions` com `origem='fixa_gerada'` e essa substitui a virtual nesse mês — fica registo da data real.

---

## Rotas

```
/_authenticated/financas.tsx              → layout com bottom nav próprio + Outlet
/_authenticated/financas/index.tsx        → Dashboard mensal
/_authenticated/financas/despesas.tsx     → Transações variáveis (lista + adicionar)
/_authenticated/financas/fixas.tsx        → Gestão de despesas fixas
/_authenticated/financas/categorias.tsx   → CRUD de categorias (página secundária)
```

Bottom nav: **Dashboard · Variáveis · Fixas · Categorias**. Botão "voltar ao hub" e logout iguais ao PT.

A página `/` (hub) passa a ter 2 cartões grandes: **PT Manager** e **Finanças**.

---

## Dashboard mensal (página principal)

Seletor de mês no topo (← Jun 2026 →), igual ao da Reports.

**Cartão grande** — saldo do mês: Receitas − Despesas = X €, com indicador vs mês anterior.

**Grid de 4 stats**:
- Receitas totais (com breakdown: PT · Salário · Outros)
- Despesas totais (com breakdown: Fixas · Variáveis)
- Despesas fixas mensais (soma para referência rápida)
- Provisão anual mensal (quanto estás a "guardar" virtualmente para IUC/seguros)

**Bloco "Por categoria"** — barras horizontais ordenadas por valor, mostra % do total e € por categoria de despesa.

**Bloco "Top 5 despesas variáveis"** do mês.

**Bloco "Próximas despesas fixas"** — lista as fixas com `dia_pagamento` >= hoje, ajuda a antecipar.

**Mini gráfico** — barras dos últimos 6 meses: receitas vs despesas (reutilizar Recharts).

---

## Página "Variáveis"

Lista de `fin_transactions` do mês selecionado (manual + fixa_gerada). Agrupadas por dia.

Botão flutuante "+" → modal "Nova transação":
- Toggle Despesa/Receita
- Valor (input grande, foco automático)
- Categoria (pills com ícone+cor)
- Data (default hoje)
- Descrição (opcional)

Swipe/long-press → eliminar.

---

## Página "Fixas"

Lista das `fin_fixed_expenses` agrupadas por categoria, mostrando valor mensal real (incluindo provisões anuais convertidas).

Total no topo: "Compromisso mensal fixo: X €".

Form "Nova despesa fixa":
- Nome, categoria, dia de pagamento
- Toggle "Pagamento anual" → mostra `valor_anual` + `mês de pagamento`, esconde `valor_mensal` (calcula = valor_anual/12)
- Mês de início, opção "tem fim previsto" → mês de fim

Editar/Eliminar inline.

---

## Lib functions (frontend)

`src/lib/fin-categories.ts` — CRUD categorias
`src/lib/fin-fixed.ts` — CRUD despesas fixas + cálculo do valor mensal efetivo
`src/lib/fin-transactions.ts` — CRUD transações
`src/lib/fin-month.ts` — função composta `getMonthOverview(ym)` que devolve:
  ```ts
  { receitas: { pt, manual, total }, despesas: { fixas, variaveis, provisoes, total }, saldo, porCategoria: [...], transacoes: [...] }
  ```
  Faz reads paralelos das 4 fontes (`fin_transactions`, `fin_fixed_expenses`, `pt_payments`, `fin_categories`) e combina.

---

## Design tokens

Reutilizar o que já existe. Adicionar:
- `--receita` (verde sóbrio compatível com a paleta âmbar)
- `--despesa` (vermelho terra)
- `--provisao` (laranja/dourado)

Sem novas fontes. Sem novos pacotes (Recharts já está).

---

## Fase 2 (futuro, não agora)

- Património: contas bancárias + investimentos + cripto (snapshot mensal)
- Objetivos de poupança com progresso
- Comparativos anuais
- Exportação CSV/PDF
- Lembretes/notificações de despesas fixas com `dia_pagamento` próximo

---

## O que **não** está incluído na Fase 1

- Património / investimentos / cripto
- Múltiplas contas bancárias
- Importação de extratos bancários
- Orçamentos com tetos por categoria

Confirma o plano (ou ajusta) e avanço com a migração + código.
