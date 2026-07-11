import type {
  AdEntityRow,
  CountryBreakdown,
  DashboardData,
  PlacementBreakdown,
  Projection,
  SecondaryMetrics,
  TemperatureSplit,
} from "@/lib/meta/types";
import { compact, money, money2, num, pct } from "@/lib/format";
import { Card, SectionTitle, Badge } from "./Card";
import { CountryDonut } from "./Charts";

/* --------------------------- Section nav (anchors) ------------------------ */

const NAV = [
  { id: "resumo", label: "Resumo" },
  { id: "projecao", label: "Projeção" },
  { id: "canais", label: "Canais" },
  { id: "funil", label: "Funil" },
  { id: "evolucao", label: "Evolução" },
  { id: "campanhas", label: "Campanhas" },
  { id: "conjuntos", label: "Conjuntos" },
  { id: "anuncios", label: "Anúncios" },
  { id: "placement", label: "Placement" },
  { id: "paises", label: "Países" },
  { id: "hotcold", label: "HOT+COLD" },
  { id: "leads", label: "Leads" },
];

export function SubNav() {
  return (
    <div className="scroll-thin sticky top-0 z-10 -mx-1 overflow-x-auto rounded-xl border border-[#e7e9ee] bg-white/90 px-2 py-2 backdrop-blur">
      <div className="flex items-center gap-1">
        {NAV.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            {n.label}
          </a>
        ))}
      </div>
    </div>
  );
}

/* ------------------------- Secondary metrics row -------------------------- */

export function SecondaryMetricsRow({ m }: { m: SecondaryMetrics }) {
  const items = [
    { label: "CTR", value: pct(m.ctr) },
    { label: "CPM", value: money2(m.cpm) },
    { label: "Frequência", value: m.frequency.toFixed(2) },
    { label: "Landing Page Views", value: num(m.landingPageViews) },
    { label: "Cliques no link", value: num(m.linkClicks) },
    { label: "CPC", value: money2(m.costPerClick) },
  ];
  return (
    <Card>
      <SectionTitle hint="Indicadores de mídia (Meta)">Métricas secundárias</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">{it.label}</p>
            <p className="mt-0.5 text-lg font-bold text-slate-800 tnum">{it.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------- Projection ------------------------------- */

function ProjBlock({
  title,
  current,
  projected,
  target,
  fmt,
  good,
}: {
  title: string;
  current: string;
  projected: string;
  target: string;
  fmt: string;
  good: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase text-slate-400">Atual</p>
          <p className="text-base font-bold text-slate-800 tnum">{current}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-400">Projeção</p>
          <p className={`text-base font-bold tnum ${good ? "text-emerald-600" : "text-amber-600"}`}>
            {projected}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-400">{fmt}</p>
          <p className="text-base font-bold text-slate-500 tnum">{target}</p>
        </div>
      </div>
    </div>
  );
}

export function ProjectionCard({ p }: { p: Projection }) {
  return (
    <Card>
      <SectionTitle
        hint={`No ritmo atual, faltando ${p.daysRemaining} dias de captação`}
      >
        Projeção até o fim da captação
      </SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ProjBlock
          title="Leads"
          current={num(p.leadsCurrent)}
          projected={num(p.leadsProjected)}
          target={num(p.leadsGoal)}
          fmt="Meta"
          good={p.onPace}
        />
        <ProjBlock
          title="Investido"
          current={money(p.spendCurrent)}
          projected={money(p.spendProjected)}
          target={money(p.budgetTotal)}
          fmt="Budget"
          good={p.spendProjected <= p.budgetTotal}
        />
      </div>
      <div
        className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${
          p.onPace ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        }`}
      >
        {p.onPace
          ? `✅ No ritmo atual, o lançamento projeta ${num(p.leadsProjected)} leads — acima da meta de ${num(p.leadsGoal)}.`
          : `⚠️ No ritmo atual, projeta ${num(p.leadsProjected)} leads — abaixo da meta de ${num(p.leadsGoal)}. Faltam ${num(Math.max(p.leadsGoal - p.leadsProjected, 0))}.`}
      </div>
    </Card>
  );
}

/* ------------------------------ HOT + COLD -------------------------------- */

export function HotColdSplit({ temps }: { temps: TemperatureSplit[] }) {
  const total = temps.reduce((a, t) => a + t.spend, 0) || 1;
  const style: Record<string, { bg: string; badge: "orange" | "blue" }> = {
    HOT: { bg: "from-orange-50 to-white", badge: "orange" },
    COLD: { bg: "from-blue-50 to-white", badge: "blue" },
    "—": { bg: "from-slate-50 to-white", badge: "blue" },
  };
  return (
    <Card>
      <SectionTitle hint="Investimento e leads por temperatura de público">
        Proporção HOT + COLD
      </SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {temps.map((t) => {
          const s = style[t.temperature];
          return (
            <div
              key={t.temperature}
              className={`rounded-xl border border-slate-100 bg-gradient-to-br ${s.bg} p-4`}
            >
              <div className="mb-2 flex items-center justify-between">
                <Badge color={s.badge}>{t.temperature}</Badge>
                <span className="text-xs font-semibold text-slate-500 tnum">
                  {pct((t.spend / total) * 100)} do investido
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] uppercase text-slate-400">Investido</p>
                  <p className="text-base font-bold text-slate-800 tnum">{money(t.spend)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400">Leads</p>
                  <p className="text-base font-bold text-slate-800 tnum">{num(t.leads)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400">CPL</p>
                  <p className="text-base font-bold text-emerald-600 tnum">{money2(t.cpl)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ------------------------------ Placement --------------------------------- */

export function PlacementSection({ placements }: { placements: PlacementBreakdown[] }) {
  const maxSpend = Math.max(...placements.map((p) => p.spend), 1);
  const maxLeads = Math.max(...placements.map((p) => p.leads), 1);
  return (
    <Card>
      <SectionTitle hint="Onde o anúncio apareceu (Meta)">Performance por placement</SectionTitle>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarList
          title="Investido por placement"
          rows={placements.map((p) => ({ label: p.placement, value: p.spend, max: maxSpend, fmt: money(p.spend) }))}
          color="#38bdf8"
        />
        <BarList
          title="Leads por placement"
          rows={placements.map((p) => ({ label: p.placement, value: p.leads, max: maxLeads, fmt: num(p.leads) }))}
          color="#10b981"
        />
      </div>
      <div className="scroll-thin mt-5 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-slate-400">
            <tr className="border-b border-slate-100">
              <th className="pb-2 pr-4 font-medium">Placement</th>
              <th className="pb-2 pr-4 text-right font-medium">Investido</th>
              <th className="pb-2 pr-4 text-right font-medium">Leads</th>
              <th className="pb-2 text-right font-medium">CPL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {placements.map((p) => (
              <tr key={p.placement} className="text-slate-700">
                <td className="py-2 pr-4 font-medium text-slate-800">{p.placement}</td>
                <td className="py-2 pr-4 text-right tnum">{money(p.spend)}</td>
                <td className="py-2 pr-4 text-right tnum">{num(p.leads)}</td>
                <td className="py-2 text-right font-semibold text-emerald-600 tnum">{money2(p.cpl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BarList({
  title,
  rows,
  color,
}: {
  title: string;
  rows: { label: string; value: number; max: number; fmt: string }[];
  color: string;
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-medium text-slate-500">{title}</p>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="w-20 shrink-0 truncate text-xs text-slate-600">{r.label}</span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
              <div className="h-full rounded" style={{ width: `${(r.value / r.max) * 100}%`, background: color }} />
            </div>
            <span className="w-16 shrink-0 text-right text-xs font-semibold text-slate-700 tnum">{r.fmt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- Countries ------------------------------- */

export function CountrySection({ countries }: { countries: CountryBreakdown[] }) {
  return (
    <Card>
      <SectionTitle hint="Investimento e leads por país">Investido por país</SectionTitle>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CountryDonut data={countries} />
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-400">
              <tr className="border-b border-slate-100">
                <th className="pb-2 pr-4 font-medium">País</th>
                <th className="pb-2 pr-4 text-right font-medium">Investido</th>
                <th className="pb-2 pr-4 text-right font-medium">% Inv.</th>
                <th className="pb-2 pr-4 text-right font-medium">Leads</th>
                <th className="pb-2 text-right font-medium">CPL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {countries.map((c) => (
                <tr key={c.country} className="text-slate-700">
                  <td className="py-2 pr-4 font-medium text-slate-800">{c.country}</td>
                  <td className="py-2 pr-4 text-right tnum">{money(c.spend)}</td>
                  <td className="py-2 pr-4 text-right text-slate-500 tnum">{pct(c.pctSpend)}</td>
                  <td className="py-2 pr-4 text-right tnum">{num(c.leads)}</td>
                  <td className="py-2 text-right font-semibold text-emerald-600 tnum">{money2(c.cpl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

/* ---------------------- Adsets / Ads generic table ------------------------ */

export function AdEntityTable({
  title,
  hint,
  rows,
  showCampaign = false,
}: {
  title: string;
  hint: string;
  rows: AdEntityRow[];
  showCampaign?: boolean;
}) {
  return (
    <Card>
      <SectionTitle hint={hint}>{title}</SectionTitle>
      <div className="scroll-thin max-h-[420px] overflow-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 bg-white text-[11px] uppercase tracking-wide text-slate-400">
            <tr className="border-b border-slate-100">
              <th className="pb-2 pr-4 font-medium">Nome</th>
              <th className="pb-2 pr-4 font-medium">Temp.</th>
              <th className="pb-2 pr-4 text-right font-medium">Investido</th>
              <th className="pb-2 pr-4 text-right font-medium">Impressões</th>
              <th className="pb-2 pr-4 text-right font-medium">CTR</th>
              <th className="pb-2 pr-4 text-right font-medium">Leads</th>
              <th className="pb-2 text-right font-medium">CPL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((r) => (
              <tr key={r.id} className="text-slate-700 hover:bg-slate-50/60">
                <td className="max-w-[240px] py-2.5 pr-4 font-medium text-slate-800">
                  <div className="truncate">{r.name}</div>
                  {showCampaign && r.campaign && (
                    <div className="truncate text-[11px] text-slate-400">{r.campaign}</div>
                  )}
                </td>
                <td className="py-2.5 pr-4">
                  {r.temperature === "HOT" ? (
                    <Badge color="orange">HOT</Badge>
                  ) : r.temperature === "COLD" ? (
                    <Badge color="blue">COLD</Badge>
                  ) : (
                    <Badge color="slate">—</Badge>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-right tnum">{money(r.spend)}</td>
                <td className="py-2.5 pr-4 text-right tnum">{compact(r.impressions)}</td>
                <td className="py-2.5 pr-4 text-right tnum">{pct(r.ctr)}</td>
                <td className="py-2.5 pr-4 text-right tnum">{num(r.leads)}</td>
                <td className="py-2.5 text-right font-semibold text-emerald-600 tnum">{money2(r.cpl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
