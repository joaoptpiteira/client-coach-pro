## Objetivo

Reescrever a app de PT para igualar o sistema antigo em funcionalidades, com um visual mais moderno (paleta âmbar modernizada: `#fdfaf3` background, `#1a1a1a` ink, `#c9893a` primary, `#e8b84a` accent), mantendo a simplicidade de um único utilizador (tu).

Para não fazer um big bang, divido em **3 fases**. Esta proposta de plano cobre o que fazemos agora (Fase 1) e o que fica para depois.

---

## Decisões-chave de UX (das tuas screenshots)

- **Bottom nav fixo** com 4 secções: Dashboard · Clientes · Pagamentos · Treinos. Substitui o "Hub" atual.
- **3 estados de cliente** em vez de 2: `ativo`, `antigo`, `prospect` (prospect é alguém que ainda não começou, sem valores).
- **Frequência semanal** (1x/2x/3x/4x) substitui o cálculo manual de "treinos pagos" — o nº de treinos/mês deriva da frequência.
- **Mês de início** por cliente → permite o histórico mensal não considerar como "não pago" meses anteriores ao início.
- **Decomposição simplificada**: Valor total acordado − Ginásio = Valor real PT. Acompanhamento online é separado. Desconto afiliado aplica-se por cima.
- **Pagamentos são eventos** (não um campo no cliente): cada registo tem data, valor, mês de referência. Isto dá o histórico mensal automático.
- **Treinos dados** são eventos diários (não um contador): permite a vista "Terça-feira 2 de Junho" com botão "Treino dado".
- **"Vai parar"** marca o cliente para sair no próximo mês — aparece destacado no dashboard.

---

## Fase 1 — Esqueleto + Clientes + Dashboard (este pedido)

### Schema (migração)

Alterações a `pt_clients`:
- adicionar `telefone` (text, opcional)
- adicionar `status` enum `ativo|antigo|prospect` (substitui o `ativo` boolean)
- adicionar `frequencia_semanal` (int 0–7, default 2)
- adicionar `mes_inicio` (date, opcional)
- adicionar `valor_ginasio_por_treino` (numeric) — para calcular Valor real PT
- adicionar `valor_acompanhamento_online` (numeric, default 0)
- adicionar `desconto_afiliado` (numeric, default 0)
- adicionar `indicado_por` (text, opcional)
- remover/deprecar `treinos_pagos`, `treinos_dados`, `valor_attivo` (substituídos por frequência + tabelas de pagamentos/treinos na Fase 2/3)

Nova tabela `pt_payments`:
- `id`, `owner_id`, `client_id`, `data` (date), `mes_referencia` (text YYYY-MM), `valor_pago` (numeric), `valor_pt` (numeric, calculado), `notas`

Nova tabela `pt_trainings`:
- `id`, `owner_id`, `client_id`, `data` (date), `notas`

Todas com RLS por `owner_id = auth.uid()` + GRANTs.

### Rotas

```
/_authenticated/pt.tsx              → layout com bottom nav + Outlet
/_authenticated/pt/index.tsx        → Dashboard
/_authenticated/pt/clients.tsx      → Clientes (3 tabs: Ativos/Antigos/Prospects)
/_authenticated/pt/payments.tsx     → placeholder "Em breve" (Fase 2)
/_authenticated/pt/trainings.tsx    → placeholder "Em breve" (Fase 3)
```

Remover o "Hub" — abrir direto no Dashboard PT após login.

### Dashboard (Fase 1, sem pagamentos reais ainda)

Mostra com base nos dados de clientes:
- Cartão grande com mês atual: contagem de ativos × valor previsto total.
- Cartão "Previsão próximo mês": soma do `forecast_valor` ou do valor acordado dos que ficam.
- Grid de stats: nº Ativos · Mensalidade · Pack · Prospects · "Vai parar".
- Bloco "Descontos de afiliado ativos".
- Bloco "Vai parar este mês".

(Os blocos "recebido / falta pagar / treinos dados" entram na Fase 2/3 quando existirem pagamentos e treinos.)

### Clientes (Fase 1 redesenhado)

- 3 tabs: Ativos / Antigos / Prospects.
- Card mais limpo: nome em destaque, telefone (com ícone), pills (Mensal/Pack + Frequência), badge de previsão ("Vai continuar"/"Vai parar"), pill âmbar com desconto afiliado se existir.
- Formulário com seções: Estado · Identidade · Mês de início · Plano (tipo + frequência + valor + decomposição) · Indicado por · Previsão.
- Ações no card de edição: Guardar · Suspender (= passa a antigo) · Eliminar.

### Design tokens

Atualizar `src/styles.css`:
- `--background: oklch(0.985 0.012 85)` (#fdfaf3)
- `--foreground: oklch(0.18 0 0)` (#1a1a1a)
- `--primary: oklch(0.68 0.13 65)` (#c9893a)
- `--accent: oklch(0.82 0.13 80)` (#e8b84a)
- `--surface` cards brancos com sombra suave, borda quase invisível
- raio `0.875rem` nos cards, `1.25rem` nos cartões grandes
- tipografia: continuar com display existente ou trocar para um par mais moderno (proponho manter o display atual se já gostas; podemos refinar depois)

---

## Fase 2 — Pagamentos (próxima iteração)

- Página `/pt/payments` com navegação mensal (← Jun 2026 →).
- Cartão "Total recebido (PT)" + contagem pagos/em falta.
- Stats: treinos vendidos · treinos parados.
- Lista de pagamentos do mês com eliminar.
- Modal "Registar Pagamento" com o breakdown que mostraste (acordado · ginásio · valor real PT · desc. afiliado · a pagar) + input editável.
- Dashboard passa a mostrar "recebido este mês" + "falta receber" + histórico mensal real.

## Fase 3 — Treinos

- Página `/pt/trainings` com navegação diária.
- Lista de clientes que treinam nesse dia (derivado da frequência semanal + dias da semana por cliente — vamos precisar de adicionar isto).
- Botão "Treino dado" → cria registo em `pt_trainings`.
- Dashboard ganha contador "treinos dados este mês".

---

## Aspetos técnicos

- Migração SQL única para todas as alterações de schema da Fase 1 (com GRANTs e RLS).
- Lógica de cálculo (valor real PT, restantes do mês) em `src/lib/pt-clients.ts` como funções puras testáveis.
- Bottom nav num componente reutilizável `src/components/pt/BottomNav.tsx`.
- Manter Lovable Cloud (gratuito) + Google sign-in já existente.

---

## O que **não** está incluído

- Pagamentos reais (Fase 2).
- Registo de treinos diário (Fase 3).
- Notificações, exportações, multi-utilizador.

Confirma este plano (ou pede ajustes) e avanço com a migração + código da Fase 1.