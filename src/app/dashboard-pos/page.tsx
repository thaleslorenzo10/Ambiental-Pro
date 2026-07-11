import { getDashboardData } from "@/lib/data";
import { Card, CardTitle } from "@/components/Card";
import { KpiCard } from "@/components/KpiCard";
import { GoalProgress } from "@/components/GoalProgress";
import {
  CampaignBars,
  CplChart,
  LeadsPerDayChart,
  PlatformPie,
  SpendVsLeadsChart,
} from "@/components/Charts";
import { CampaignTable } from "@/components/CampaignTable";
import { LeadsTable } from "@/components/LeadsTable";
import { compact, money, money2, num, pct, shortDate } from "@/lib/format";

export const revalidate = 300;

function trend(today: number, yesterday: number) {
  if (!yesterday) return undefined;
  return { value: ((today - yesterday) / yesterday) * 100, positiveIsGood: true };
}

export default async function DashboardPos() {
  const data = await getDashboardData();
  const t = data.totals;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-lg">
              📊
            </div>
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">
                Dashboard de Leads — Lançamento
              </h1>
              <p className="text-sm text-slate-400">{data.accountName}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300">
            {shortDate(data.periodStart)} — {shortDate(data.periodEnd)}
          </span>
          <span
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              data.source === "meta"
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-amber-500/15 text-amber-300"
            }`}
          >
            {data.source === "meta" ? "● Meta Ads (ao vivo)" : "● Dados de exemplo"}
          </span>
        </div>
      </header>

      {/* KPI row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total de Leads"
          value={num(t.leads)}
          accent="brand"
          icon="👥"
          trend={trend(t.leadsToday, t.leadsYesterday)}
          hint="vs. ontem"
        />
        <KpiCard
          label="Investimento"
          value={money(t.spend)}
          accent="sky"
          icon="💸"
          hint={`${num(t.impressions)} impressões`}
        />
        <KpiCard
          label="CPL (Custo por Lead)"
          value={money2(t.cpl)}
          accent="violet"
          icon="🎯"
          hint={`CTR ${pct(t.ctr)}`}
        />
        <KpiCard
          label="Alcance"
          value={compact(t.reach)}
          accent="amber"
          icon="📡"
          hint={`${num(t.clicks)} cliques`}
        />
      </section>

      {/* Goal + leads per day */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GoalProgress leads={t.leads} goal={data.goal} />
        <Card className="lg:col-span-2">
          <CardTitle>Leads por dia</CardTitle>
          <LeadsPerDayChart data={data.daily} />
        </Card>
      </section>

      {/* Spend vs leads + CPL */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Investimento x Leads</CardTitle>
          <SpendVsLeadsChart data={data.daily} />
        </Card>
        <Card>
          <CardTitle>Evolução do CPL</CardTitle>
          <CplChart data={data.daily} />
        </Card>
      </section>

      {/* Campaigns + platform */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Leads por campanha</CardTitle>
          <CampaignBars data={data.campaigns} />
        </Card>
        <Card>
          <CardTitle>Leads por origem</CardTitle>
          <PlatformPie data={data.platforms} />
        </Card>
      </section>

      {/* Campaign performance table */}
      <section className="mt-4">
        <Card>
          <CardTitle>Desempenho por campanha</CardTitle>
          <CampaignTable campaigns={data.campaigns} />
        </Card>
      </section>

      {/* Recent leads */}
      <section className="mt-4">
        <Card>
          <CardTitle>Últimos leads captados</CardTitle>
          <LeadsTable leads={data.recentLeads} />
        </Card>
      </section>

      <footer className="mt-10 text-center text-xs text-slate-600">
        Atualizado a cada 5 min · Fonte:{" "}
        {data.source === "meta" ? "Meta Marketing API" : "dados de exemplo"}
      </footer>
    </main>
  );
}
