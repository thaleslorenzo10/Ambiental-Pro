import type {
  ChannelStats,
  DashboardData,
  Funnel,
  LeadRow,
  SourceBreakdown,
  Tracking,
} from "@/lib/meta/types";
import {
  compact,
  dateTime,
  money,
  money2,
  num,
  pct,
  platformLabel,
  titleCase,
} from "@/lib/format";
import { Card, SectionTitle, Badge } from "./Card";

/* ------------------------------- KPI strip -------------------------------- */

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
  tint,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  accent: string;
  tint: string;
}) {
  return (
    <div className="card-hover relative overflow-hidden rounded-2xl border border-[#e8eaf0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.12)]">
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: accent }}
      />
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
          style={{ background: tint }}
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 text-[26px] font-bold leading-none tracking-tight tnum" style={{ color: accent }}>
        {value}
      </p>
      {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export function KpiStrip({ data }: { data: DashboardData }) {
  const t = data.totals;
  const goalPct = data.goalLeads ? (t.leadsReal / data.goalLeads) * 100 : 0;
  const cplGood = t.cplReal > 0 && t.cplReal <= data.cplTarget;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard
        label="Investido"
        value={money(t.spend)}
        sub="multi-canal"
        icon="💰"
        accent="#0f172a"
        tint="#f1f5f9"
      />
      <KpiCard
        label="Leads Reais"
        value={num(t.leadsReal)}
        sub={data.leadsFromSheet ? "planilha (real)" : "estimado"}
        icon="👥"
        accent="#1e3a8a"
        tint="#e0e7ff"
      />
      <KpiCard
        label="CPL Real"
        value={money2(t.cplReal)}
        sub={`alvo ${money2(data.cplTarget)}`}
        icon="🎯"
        accent={cplGood ? "#059669" : "#dc2626"}
        tint={cplGood ? "#d1fae5" : "#fee2e2"}
      />
      <KpiCard
        label={`Meta ${num(data.goalLeads)}`}
        value={pct(goalPct)}
        sub={`faltam ${num(Math.max(data.goalLeads - t.leadsReal, 0))}`}
        icon="📈"
        accent="#7c3aed"
        tint="#ede9fe"
      />
    </div>
  );
}

/* ----------------------------- Tracking radar ----------------------------- */

export function TrackingRadar({ tracking }: { tracking: Tracking }) {
  const broken = !tracking.ok;
  return (
    <Card
      className={
        broken ? "border-rose-200 bg-rose-50/40" : "border-emerald-200 bg-emerald-50/30"
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            broken ? "bg-rose-500" : "bg-emerald-500"
          }`}
        />
        <h3 className="text-[15px] font-semibold text-slate-800">
          Radar de tracking —{" "}
          <span className={broken ? "text-rose-600" : "text-emerald-600"}>
            {broken ? "Divergência" : "OK"}
          </span>
        </h3>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Compara os leads do pixel do Meta com os leads reais da planilha.
      </p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Meta / Pixel</p>
          <p className="mt-1 text-xl font-bold text-slate-800 tnum">
            {num(tracking.metaPixelLeads)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Planilha</p>
          <p className="mt-1 text-xl font-bold text-slate-800 tnum">
            {num(tracking.sheetLeads)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Aferência</p>
          <p
            className={`mt-1 text-xl font-bold tnum ${
              broken ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            {tracking.diff >= 0 ? "+" : ""}
            {num(tracking.diff)}
          </p>
          <p className="text-[11px] text-slate-400">{pct(Math.abs(tracking.diffPct))}</p>
        </div>
      </div>

      {/* comparison bars */}
      <div className="mt-5 space-y-3">
        {[
          { label: "Meta / Pixel", value: tracking.metaPixelLeads, color: "#3b82f6" },
          { label: "Planilha", value: tracking.sheetLeads, color: "#10b981" },
        ].map((r) => {
          const max = Math.max(tracking.metaPixelLeads, tracking.sheetLeads, 1);
          return (
            <div key={r.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs text-slate-500">{r.label}</span>
              <div className="h-5 flex-1 overflow-hidden rounded-md bg-white/70">
                <div
                  className="flex h-full items-center justify-end rounded-md pr-2 text-[11px] font-semibold text-white"
                  style={{ width: `${(r.value / max) * 100}%`, background: r.color }}
                >
                  {num(r.value)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-slate-400">
        {broken
          ? "⚠️ Divergência entre pixel e planilha acima de 20% — revisar tracking."
          : "✅ Pixel e planilha consistentes."}
      </p>
    </Card>
  );
}

/* ------------------------------ Budget / pace ----------------------------- */

function Meter({ label, value, pctVal, color }: { label: string; value: string; pctVal: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-700 tnum">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(pctVal, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function BudgetPace({ data }: { data: DashboardData }) {
  const b = data.budget;
  const timePct = b.daysTotal ? (b.daysElapsed / b.daysTotal) * 100 : 0;
  return (
    <Card>
      <SectionTitle hint={`Budget total ${money(b.total)}`}>
        Meta {data.launch} — {data.phase}
      </SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Investido</p>
          <p className="text-xl font-bold text-slate-900 tnum">{money(b.invested)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Falta investir</p>
          <p className="text-xl font-bold text-slate-500 tnum">{money(b.remaining)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Real / dia</p>
          <p className="text-base font-semibold text-slate-800 tnum">{money2(b.paceReal)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Ideal / dia</p>
          <p className="text-base font-semibold text-slate-800 tnum">{money2(b.paceGoal)}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <Meter
          label={`Tempo decorrido · ${b.daysElapsed}/${b.daysTotal} dias`}
          value={pct(timePct)}
          pctVal={timePct}
          color="#1e3a8a"
        />
        <Meter
          label="Budget queimado"
          value={pct(b.burnedPct)}
          pctVal={b.burnedPct}
          color="#f59e0b"
        />
      </div>
    </Card>
  );
}

/* --------------------------- Channel comparison --------------------------- */

const CHANNEL_COLOR: Record<string, string> = {
  meta: "#1877f2",
  tiktok: "#ef4444",
  google: "#22c55e",
};

export function ChannelComparison({ channels }: { channels: ChannelStats[] }) {
  const maxCpl = Math.max(...channels.filter((c) => c.active).map((c) => c.cpl), 0.01);
  return (
    <Card>
      <SectionTitle hint="Investimento, leads e CPL por canal">
        Comparativo de canais
      </SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {channels.map((c) => (
          <div
            key={c.channel}
            className={`rounded-xl border p-3 ${
              c.active ? "border-slate-200 bg-white" : "border-dashed border-slate-200 bg-slate-50"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">{c.label}</span>
              {c.active ? (
                <Badge color="green">ativo</Badge>
              ) : (
                <Badge color="slate">n/a</Badge>
              )}
            </div>
            {c.active ? (
              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <p className="text-[10px] uppercase text-slate-400">Invest.</p>
                  <p className="text-sm font-bold text-slate-800 tnum">{money(c.spend)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400">Leads</p>
                  <p className="text-sm font-bold text-slate-800 tnum">{num(c.leads)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400">CPL</p>
                  <p className="text-sm font-bold text-emerald-600 tnum">{money2(c.cpl)}</p>
                </div>
              </div>
            ) : (
              <p className="py-2 text-center text-xs text-slate-400">sem dados</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-xs font-medium text-slate-500">CPL Real por canal</p>
        {channels
          .filter((c) => c.active)
          .map((c) => (
            <div key={c.channel} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-xs text-slate-500">{c.label}</span>
              <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${(c.cpl / maxCpl) * 100}%`,
                    background: CHANNEL_COLOR[c.channel],
                  }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs font-semibold text-slate-700 tnum">
                {money2(c.cpl)}
              </span>
            </div>
          ))}
      </div>
    </Card>
  );
}

/* -------------------------------- Funnel ---------------------------------- */

const FUNNEL_STEPS = [
  { key: "impressions", label: "Impressões", color: "#1e3a8a", width: 100 },
  { key: "clicks", label: "Cliques", color: "#2563eb", width: 74 },
  { key: "landingPageViews", label: "Landing Page Views", color: "#0891b2", width: 56 },
  { key: "leadsPixel", label: "Leads (Meta — Pixel)", color: "#059669", width: 40 },
] as const;

export function FunnelCard({ funnel }: { funnel: Funnel }) {
  return (
    <Card>
      <SectionTitle hint="Do impacto ao lead — dados do Meta">
        Funil de captação (Meta)
      </SectionTitle>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          {FUNNEL_STEPS.map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <div
                className="flex h-11 items-center rounded-lg px-3 text-white"
                style={{ width: `${s.width}%`, background: s.color }}
              >
                <span className="truncate text-xs font-semibold">{s.label}</span>
              </div>
              <span className="text-sm font-bold text-slate-800 tnum">
                {num(funnel[s.key])}
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <MiniStat label="CTR" value={pct(funnel.ctr)} />
          <MiniStat label="CPM" value={money2(funnel.cpm)} />
          <MiniStat label="LPV / clique" value={pct(funnel.lpvPerClick)} />
          <MiniStat label="Lead / LPV" value={pct(funnel.leadPerLpv)} />
        </div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-base font-bold text-slate-800 tnum">{value}</p>
    </div>
  );
}

/* ---------------------------- Campaigns table ----------------------------- */

export function CampaignsTable({ data }: { data: DashboardData }) {
  return (
    <Card>
      <SectionTitle hint={`Campanhas ${data.launch} — Meta`}>Campanhas — Meta</SectionTitle>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-slate-400">
            <tr className="border-b border-slate-100">
              <th className="pb-2 pr-4 font-medium">Campanha</th>
              <th className="pb-2 pr-4 font-medium">Temp.</th>
              <th className="pb-2 pr-4 text-right font-medium">Investido</th>
              <th className="pb-2 pr-4 text-right font-medium">CTR</th>
              <th className="pb-2 pr-4 text-right font-medium">Leads pixel</th>
              <th className="pb-2 pr-4 text-right font-medium">CPL pixel</th>
              <th className="pb-2 pr-4 text-right font-medium text-[#1e3a8a]">Leads reais</th>
              <th className="pb-2 text-right font-medium text-[#1e3a8a]">CPL real</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.campaigns.map((c) => (
              <tr key={c.id} className="text-slate-700 hover:bg-slate-50/60">
                <td className="max-w-[260px] truncate py-2.5 pr-4 font-medium text-slate-800">
                  {c.name}
                </td>
                <td className="py-2.5 pr-4">
                  {c.temperature === "HOT" ? (
                    <Badge color="orange">HOT</Badge>
                  ) : c.temperature === "COLD" ? (
                    <Badge color="blue">COLD</Badge>
                  ) : (
                    <Badge color="slate">—</Badge>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-right tnum">{money(c.spend)}</td>
                <td className="py-2.5 pr-4 text-right tnum">{pct(c.ctr)}</td>
                <td className="py-2.5 pr-4 text-right text-slate-400 tnum">{num(c.leads)}</td>
                <td className="py-2.5 pr-4 text-right text-slate-400 tnum">{money2(c.cpl)}</td>
                <td className="py-2.5 pr-4 text-right font-semibold tnum">
                  {c.realLeads != null ? num(c.realLeads) : "—"}
                </td>
                <td className="py-2.5 text-right font-bold text-[#1e3a8a] tnum">
                  {c.realLeads ? money2(c.realCpl ?? 0) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Leads reais = leads da planilha cruzados por UTM · CPL real = investido ÷ leads reais
      </p>
    </Card>
  );
}

/* ------------------------------ Sources list ------------------------------ */

export function SourcesList({ sources }: { sources: SourceBreakdown[] }) {
  const max = Math.max(...sources.map((s) => s.leads), 1);
  const colors: Record<string, string> = {
    instagram: "#d6336c",
    facebook: "#1877f2",
    whatsapp: "#22c55e",
    email: "#f59e0b",
    google: "#4285f4",
    organic: "#64748b",
    unknown: "#94a3b8",
  };
  return (
    <Card>
      <SectionTitle hint="Leads reais por utm_source">Leads por origem</SectionTitle>
      <div className="space-y-3">
        {sources.map((s) => (
          <div key={s.source} className="flex items-center gap-3">
            <span className="flex w-28 shrink-0 items-center gap-1.5 truncate text-xs text-slate-600">
              {platformLabel[s.platform] || titleCase(s.source)}
              <span
                className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase ${
                  s.paid ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {s.paid ? "pago" : "grátis"}
              </span>
            </span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
              <div
                className="h-full rounded"
                style={{ width: `${(s.leads / max) * 100}%`, background: colors[s.platform] || "#94a3b8" }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs font-semibold text-slate-700 tnum">
              {num(s.leads)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------ Leads table ------------------------------- */

const PLATFORM_BADGE: Record<string, "slate" | "green" | "amber" | "red" | "blue" | "orange"> = {
  instagram: "red",
  facebook: "blue",
  whatsapp: "green",
  email: "amber",
  google: "blue",
  organic: "slate",
  unknown: "slate",
};

export function LeadsTable({ leads, real }: { leads: LeadRow[]; real: boolean }) {
  return (
    <Card>
      <SectionTitle hint={real ? "Últimos leads da planilha" : "Exemplo — conecte a planilha"}>
        Últimos leads captados
      </SectionTitle>
      <div className="scroll-thin max-h-[420px] overflow-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="sticky top-0 bg-white text-[11px] uppercase tracking-wide text-slate-400">
            <tr className="border-b border-slate-100">
              <th className="pb-2 pr-4 font-medium">Nome</th>
              <th className="pb-2 pr-4 font-medium">Contato</th>
              <th className="pb-2 pr-4 font-medium">Origem</th>
              <th className="pb-2 pr-4 font-medium">Campanha</th>
              <th className="pb-2 font-medium">Quando</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {leads.map((l) => (
              <tr key={l.id} className="text-slate-700 hover:bg-slate-50/60">
                <td className="py-2.5 pr-4 font-medium text-slate-800">{l.name}</td>
                <td className="py-2.5 pr-4">
                  <div className="text-slate-600">{l.email}</div>
                  <div className="text-xs text-slate-400">{l.phone}</div>
                </td>
                <td className="py-2.5 pr-4">
                  <Badge color={PLATFORM_BADGE[l.platform] || "slate"}>
                    {platformLabel[l.platform] || titleCase(l.source)}
                  </Badge>
                </td>
                <td className="py-2.5 pr-4 text-slate-500">{l.campaign}</td>
                <td className="py-2.5 text-xs text-slate-500">{dateTime(l.createdTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
