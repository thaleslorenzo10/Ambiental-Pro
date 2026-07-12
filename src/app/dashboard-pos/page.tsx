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
import {
  AdEntityTable,
  CountrySection,
  CreativesToScale,
  CumulativeSources,
  HotColdSplit,
  PacingCard,
  PaidOrganicCard,
  PlacementSection,
  ProjectionCard,
  SalesCard,
  SecondaryMetricsRow,
  SubNav,
} from "@/components/Sections2";
import { CumulativeInvestment, CumulativeLeads, DailyEvolution } from "@/components/Charts";

export const revalidate = 300;

export default async function DashboardPos({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const data = await getDashboardData(p);

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <Header data={data} active="/dashboard-pos" />
      <SubNav />

      {/* Resumo */}
      <section id="resumo" className="scroll-mt-16 space-y-4">
        <KpiStrip data={data} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TrackingRadar tracking={data.tracking} />
          <BudgetPace data={data} />
        </div>
        <SecondaryMetricsRow m={data.secondary} />
      </section>

      {/* Projeção */}
      <section id="projecao" className="scroll-mt-16 space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ProjectionCard p={data.projection} />
          <PacingCard p={data.projection} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <SectionTitle hint="Ritmo real x pace ideal até o fim da captação">
              Investimento acumulado
            </SectionTitle>
            <CumulativeInvestment data={data.daily} budget={data.budget} />
          </Card>
          <Card>
            <SectionTitle dot="#7c3aed" hint="Leads reais x linha da meta">
              Leads acumulados vs meta
            </SectionTitle>
            <CumulativeLeads
              data={data.daily}
              goal={data.goalLeads}
              daysTotal={data.budget.daysTotal}
            />
          </Card>
        </div>
      </section>

      {/* Canais */}
      <section id="canais" className="scroll-mt-16">
        <ChannelComparison channels={data.channels} />
      </section>

      {/* Funil */}
      <section id="funil" className="scroll-mt-16">
        <FunnelCard funnel={data.funnel} />
      </section>

      {/* Evolução */}
      <section id="evolucao" className="scroll-mt-16">
        <Card>
          <SectionTitle hint="Investido, leads e CPL por dia (linha vermelha = CPL alvo)">
            Evolução diária
          </SectionTitle>
          <DailyEvolution data={data.daily} cplTarget={data.cplTarget} />
        </Card>
      </section>

      {/* Campanhas */}
      <section id="campanhas" className="scroll-mt-16">
        <CampaignsTable data={data} />
      </section>

      {/* Conjuntos */}
      <section id="conjuntos" className="scroll-mt-16">
        <AdEntityTable
          title="Conjuntos — Meta"
          hint="Ad sets das campanhas do lançamento"
          rows={data.adsets}
          showCampaign
        />
      </section>

      {/* Anúncios */}
      <section id="anuncios" className="scroll-mt-16 space-y-4">
        <CreativesToScale ads={data.ads} />
        <AdEntityTable
          title="Anúncios — Meta"
          hint="Criativos ativos no lançamento"
          rows={data.ads}
          showCampaign
        />
      </section>

      {/* Placement */}
      <section id="placement" className="scroll-mt-16">
        <PlacementSection placements={data.placements} />
      </section>

      {/* Países */}
      <section id="paises" className="scroll-mt-16">
        <CountrySection countries={data.countries} />
      </section>

      {/* HOT + COLD */}
      <section id="hotcold" className="scroll-mt-16">
        <HotColdSplit temps={data.temperatures} />
      </section>

      {/* Vendas / ROAS */}
      <section id="vendas" className="scroll-mt-16">
        <SalesCard s={data.sales} />
      </section>

      {/* Leads */}
      <section id="leads" className="scroll-mt-16 space-y-4">
        <PaidOrganicCard po={data.paidOrganic} />
        <CumulativeSources series={data.sourceSeries} keys={data.sourceKeys} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <SourcesList sources={data.sources} />
          </div>
          <div className="lg:col-span-2">
            <LeadsTable leads={data.recentLeads} real={data.leadsFromSheet} />
          </div>
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
