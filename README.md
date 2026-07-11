# Dashboard de Captação — Imersão GIS 2026 (Ambiental Pro)

Dashboard de acompanhamento de leads, investimento e CPL do lançamento, no padrão
Lorenzo Media: tema claro, multi-canal, com radar de tracking, pacing de budget,
funil de captação e leads reais.

> Rota principal: **`/dashboard-pos`** (`/` redireciona pra ela).

## Fontes de dados

- **Meta Marketing (Graph) API** → investimento, impressões, cliques, CTR, CPM,
  campanhas (com split HOT/COLD via tag no nome) e leads do pixel. Filtra apenas as
  campanhas cujo nome contém a tag do lançamento (`[IMERSÃOGIS] [JUL26]`).
- **Google Sheets** → leads reais da página de captura (aba
  `[IMERSÃO GIS][JUL26] Trackeamento de Lançamento`), lidos via CSV. Definem os
  "leads reais", o CPL real, a quebra por origem (utm_source) e o radar de tracking.

Sem credenciais, o dashboard renderiza com um **snapshot dos números reais do Meta**
(pulados da conta) + leads estimados, então sempre funciona.

## Stack

Next.js 15 (App Router) · React 19 · Tailwind CSS · Recharts.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha Meta + Google Sheet
npm run dev                  # http://localhost:3000
```

## Variáveis de ambiente

Veja `.env.example`. Principais:

| Variável             | Descrição                                                     |
| -------------------- | ------------------------------------------------------------- |
| `META_ACCESS_TOKEN`  | Token (system user) com `ads_read`                            |
| `META_AD_ACCOUNT_ID` | `673524229757641`                                             |
| `META_CAMPAIGN_TAG`  | `[IMERSÃOGIS] [JUL26]` — tag presente no nome das campanhas   |
| `GOOGLE_SHEET_ID`    | ID da planilha de leads                                       |
| `GOOGLE_SHEET_TAB`   | Nome da aba dos leads (`[IMERSÃO GIS][JUL26] Trackeamento...`) |
| `LAUNCH_LEAD_GOAL`   | Meta de leads (barra de progresso)                            |
| `LAUNCH_BUDGET_TOTAL`| Budget total do lançamento (pacing)                           |

> A planilha precisa estar acessível ("qualquer um com o link" ou publicada na web)
> para o app conseguir ler o CSV.

## Estrutura

```
src/
  app/dashboard-pos/page.tsx   # página principal (server component)
  components/                  # Header, KpiStrip, TrackingRadar, Charts, tabelas...
  lib/
    data.ts                    # compõe snapshot + Meta ao vivo + leads da planilha
    format.ts                  # formatação pt-BR (R$, datas, %)
    meta/                       # client (Graph API), snapshot (dados reais), types
    sheets/                     # leitor de leads do Google Sheets
```

## Seções do dashboard

Header do lançamento · KPI strip (Investido, Leads Reais, CPL Real, Meta) · Radar de
tracking (pixel x planilha) · Budget & pacing · Investimento acumulado (real x ideal)
· Comparativo de canais (Meta/TikTok/Google) · Funil de captação · Evolução diária
(investido/leads/CPL) · Campanhas Meta (HOT/COLD) · Leads por origem · Últimos leads.

## Deploy (Vercel)

Importe o repo, configure as variáveis de ambiente e faça o deploy. A página revalida
a cada 5 minutos (`revalidate = 300`).
