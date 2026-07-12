import { getDashboardData } from "@/lib/data";
import { Card, SectionTitle } from "@/components/Card";
import { Header } from "@/components/Header";
import { KpiStrip } from "@/components/Sections";
import { SalesCard } from "@/components/Sections2";
import { PhaseCard } from "@/components/PhaseCard";
import { CumulativeInvestment } from "@/components/Charts";
import { money, num } from "@/lib/format";

export const revalidate = 300;

export default async function VisaoGeral({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const data = await getDashboardData(p);
  const totalBudget = data.phases.reduce((a, p) => a + p.budget, 0);
  const totalSpent = data.phases.reduce((a, p) => a + p.spent, 0);

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <Header data={data} active="/dashboard-pos/visao-geral" />

      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Visão Geral do Lançamento — {data.launch}
        </h2>
        <p className="text-sm text-slate-500">
          Investimento e leads por fase · budget total {money(totalBudget)} ({num(data.goalLeads)} leads · {num(data.salesGoal)} vendas)
        </p>
      </div>

      <KpiStrip data={data} />

      <Card>
        <SectionTitle hint="Ritmo real x pace ideal da captação">
          Investimento acumulado
        </SectionTitle>
        <CumulativeInvestment data={data.daily} budget={data.budget} />
      </Card>

      <section className="space-y-3">
        <SectionTitle hint={`${money(totalSpent)} investidos de ${money(totalBudget)}`}>
          Fases do lançamento
        </SectionTitle>
        {data.phases.map((p) => (
          <PhaseCard key={p.id} phase={p} />
        ))}
      </section>

      <SalesCard s={data.sales} />

      <footer className="pt-4 text-center text-xs text-slate-400">
        {data.launch} · {data.client} · atualizado a cada 5 min · fonte:{" "}
        {data.source === "meta" ? "Meta Marketing API" : "snapshot"}
      </footer>
    </main>
  );
}
