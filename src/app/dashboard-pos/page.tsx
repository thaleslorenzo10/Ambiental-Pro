import { getDashboardData } from "@/lib/data";
import { Card, SectionTitle } from "@/components/Card";
import { Header } from "@/components/Header";
import {
  BudgetPace,
  CampaignsTable,
  ChannelComparison,
  FunnelCard,
  KpiStrip,
  LeadsTable,
  SourcesList,
  TrackingRadar,
} from "@/components/Sections";
import { CumulativeInvestment, DailyEvolution } from "@/components/Charts";

export const revalidate = 300;

export default async function DashboardPos() {
  const data = await getDashboardData();

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <Header data={data} />

      <KpiStrip data={data} />

      {/* Tracking radar + budget/pace */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TrackingRadar tracking={data.tracking} />
        <BudgetPace data={data} />
      </section>

      {/* Cumulative investment */}
      <Card>
        <SectionTitle hint="Ritmo real x pace ideal até o fim da captação">
          Investimento acumulado
        </SectionTitle>
        <CumulativeInvestment data={data.daily} budget={data.budget} />
      </Card>

      {/* Channels */}
      <ChannelComparison channels={data.channels} />

      {/* Funnel */}
      <FunnelCard funnel={data.funnel} />

      {/* Daily evolution */}
      <Card>
        <SectionTitle hint="Investido, leads e CPL por dia">
          Evolução diária
        </SectionTitle>
        <DailyEvolution data={data.daily} />
      </Card>

      {/* Campaigns */}
      <CampaignsTable data={data} />

      {/* Sources + leads */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SourcesList sources={data.sources} />
        </div>
        <div className="lg:col-span-2">
          <LeadsTable leads={data.recentLeads} real={data.leadsFromSheet} />
        </div>
      </section>

      <footer className="pt-4 text-center text-xs text-slate-400">
        {data.launch} · {data.client} · atualizado a cada 5 min · fonte:{" "}
        {data.source === "meta" ? "Meta Marketing API" : "snapshot"}
        {data.leadsFromSheet ? " + Google Sheets" : ""}
      </footer>
    </main>
  );
}
