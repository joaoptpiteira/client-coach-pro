# Deploy no Cloudflare Pages (com Workers)

Este projeto está configurado para fazer build com o preset **`cloudflare-pages`** do Nitro (adapter do TanStack Start para Cloudflare), gerando uma saída compatível com Cloudflare Pages + Pages Functions (Workers runtime).

## Configuração no dashboard do Cloudflare Pages

Em **Workers & Pages → Create → Pages → Connect to Git**, escolhe este repositório e usa:

| Campo | Valor |
|---|---|
| Framework preset | `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | (vazio) |
| Node version (env var `NODE_VERSION`) | `20` |

O ficheiro `dist/server/wrangler.json` é gerado automaticamente pelo Nitro com `pages_build_output_dir: ".."`, `compatibility_date` e a flag `nodejs_compat` — o Cloudflare Pages deteta-o sozinho.

## Variáveis de ambiente (Pages → Settings → Environment variables)

**Build (Production + Preview):**

- `VITE_SUPABASE_URL` = `https://tupkasjxsapdcdmwpkfw.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = (mesma chave que já está em `.env`)
- `VITE_SUPABASE_PROJECT_ID` = `tupkasjxsapdcdmwpkfw`

**Runtime (Production + Preview) — para server functions:**

- `SUPABASE_URL` = `https://tupkasjxsapdcdmwpkfw.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY` = (a anon key)
- `SUPABASE_SERVICE_ROLE_KEY` = (a service role key — marcar como **Secret**)

> ⚠️ Nunca uses o prefixo `VITE_` para `SUPABASE_SERVICE_ROLE_KEY` — isso enviaria a chave para o browser.

## Build local / preview

```bash
npm run build                     # gera ./dist com preset cloudflare-pages
npx wrangler pages dev ./dist     # preview local com o runtime Workers
```

## Mudar para Cloudflare Workers (em vez de Pages)

Basta definir a env var na altura do build:

```bash
NITRO_PRESET=cloudflare-module npm run build
npx wrangler deploy
```
