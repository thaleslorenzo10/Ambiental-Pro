# Dashboard de Leads — Lançamento

Dashboard de acompanhamento de leads e investimento para lançamentos, alimentado
pela **API do Meta** (Marketing/Graph API — campanhas de captação e Lead Ads).

> Rota principal: **`/dashboard-pos`** (`/` redireciona pra ela).

## Stack

- Next.js 15 (App Router) + React 19
- Tailwind CSS
- Recharts (gráficos)

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha as credenciais do Meta (opcional)
npm run dev
```

Abra http://localhost:3000 — sem credenciais, a dashboard carrega com **dados de
exemplo** (mock determinístico), então ela sempre renderiza. Ao configurar o
`.env.local`, os números passam a vir ao vivo da conta de anúncios.

## Configuração da API do Meta

| Variável              | Descrição                                                        |
| --------------------- | ---------------------------------------------------------------- |
| `META_ACCESS_TOKEN`   | Token longo (system user / page) com `ads_read` + `leads_retrieval` |
| `META_AD_ACCOUNT_ID`  | ID da conta de anúncios, com prefixo `act_`                      |
| `META_GRAPH_VERSION`  | Versão da Graph API (padrão `v21.0`)                             |
| `META_ACCOUNT_NAME`   | Nome exibido no cabeçalho                                        |
| `META_LEAD_GOAL`      | Meta de leads do lançamento (barra de progresso)                |

## De onde vêm os dados

- **KPIs / gráficos por dia**: `/{account}/insights` com `time_increment=1`
  (gasto, impressões, alcance, cliques e ações de lead → CPL).
- **Por campanha**: mesmo endpoint com `level=campaign`.
- **Por origem** (Instagram/Facebook/…): `breakdowns=publisher_platform`.
- **Últimos leads**: `/{form}/leads` para cada formulário de Lead Ads.

Toda a integração fica isolada em `src/lib/meta/`. A UI só consome o tipo
normalizado `DashboardData` (`src/lib/meta/types.ts`), nunca o payload cru do Meta.

## Estrutura

```
src/
  app/
    dashboard-pos/page.tsx   # página principal (server component)
    page.tsx                 # redirect -> /dashboard-pos
  components/                # KpiCard, Charts, tabelas, etc.
  lib/
    data.ts                  # getDashboardData() — Meta ao vivo ou mock
    format.ts                # formatação pt-BR (R$, datas, %)
    meta/                     # client.ts, mock.ts, types.ts
```

## Deploy (Vercel)

Importe o repo na Vercel, configure as variáveis de ambiente do Meta e faça o
deploy. A página revalida a cada 5 minutos (`revalidate = 300`).
