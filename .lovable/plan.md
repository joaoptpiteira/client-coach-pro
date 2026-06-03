## Contexto

O ficheiro `src/lib/imoveis-scrape.functions.ts` já tem a base de fetch + parse dos 4 portais (Imovirtual, Idealista, OLX, Casa Sapo) como `createServerFn`. O que falta:

1. Endurecer parsing e tratamento de 403/429/timeouts sem rebentar.
2. Permitir chamada não-autenticada para o cron job (cron não tem sessão de utilizador).
3. Agendar execução horária via `pg_cron` para todos os utilizadores configurados.

**Nota técnica:** o stack do projeto é TanStack Start. A convenção é usar *server routes* TanStack em vez de Supabase Edge Functions para lógica aplicacional — o resultado para o utilizador é idêntico (endpoint HTTP chamado pelo botão e pelo cron). Vou seguir essa convenção.

## Mudanças

### 1. Endurecer `src/lib/imoveis-scrape.functions.ts`
- `fetchHtml`: adicionar `AbortSignal.timeout(15000)`, capturar 403/429/5xx e devolver `null` com aviso (já não crasha, mas explicito por portal).
- Headers mais completos (`Accept-Encoding`, `Referer`, `Cache-Control`) para reduzir bloqueios.
- Extrair a lógica de scraping para uma função pura `scrapeForOwner(supabase, userId)` reutilizável pela serverFn e pela rota pública.
- Devolver no resultado um array `erros: [{ portal, status }]` para a UI mostrar quais bloquearam.

### 2. Nova rota pública para o cron
- `src/routes/api/public/imoveis-scrape.ts` com handler `POST`.
- Verifica header `apikey` contra a anon key e um `x-cron-secret` adicional (novo secret `CRON_SECRET`) para evitar chamadas anónimas.
- Usa `supabaseAdmin` (service role) para listar todos os `owner_id` em `config_imoveis` com `portais` não vazios e correr `scrapeForOwner` para cada um sequencialmente.
- Devolve `{ users: N, novos_total: N, erros: [...] }`.

### 3. UI: mostrar erros por portal
- `src/routes/_authenticated/imobiliario.index.tsx`: após "Atualizar agora", se `erros.length > 0` mostrar toast/aviso a listar portais bloqueados (ex.: "Idealista: 403"). Sem mais mudanças de layout.

### 4. Cron job horário
Via `supabase--insert` (não migração, contém URL + secret):
```sql
select cron.schedule(
  'scrape-imoveis-hourly',
  '7 * * * *',
  $$
  select net.http_post(
    url := 'https://project--947ba0d6-b83c-45a0-af82-1d7d402ca387.lovable.app/api/public/imoveis-scrape',
    headers := '{"Content-Type":"application/json","apikey":"<ANON_KEY>","x-cron-secret":"<CRON_SECRET>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```
Extensões `pg_cron` e `pg_net` activadas via migração se ainda não estiverem.

### 5. Secret novo
Pedir ao utilizador para criar `CRON_SECRET` (string aleatória) — é o único secret novo necessário.

## Limitações conhecidas (a comunicar ao utilizador)

- **Idealista** bloqueia agressivamente (Cloudflare + JS challenge). Fetch direto vai dar 403 na maior parte das vezes; o código trata como "0 anúncios" sem crashar mas raramente devolve resultados sem um proxy residencial.
- **Imovirtual / OLX / Casa Sapo**: fetch direto funciona razoavelmente para 1 chamada/hora.
- Parsing HTML por regex é frágil — se o portal mudar markup, devolve 0. Pode ser preciso ajustar selectores periodicamente.

## Ficheiros tocados

- editar `src/lib/imoveis-scrape.functions.ts`
- criar `src/routes/api/public/imoveis-scrape.ts`
- editar `src/routes/_authenticated/imobiliario.index.tsx` (mostrar erros)
- migração: enable `pg_cron` + `pg_net`
- insert SQL: agendar cron
- pedir secret `CRON_SECRET`
