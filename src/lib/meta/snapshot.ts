import type {
  CampaignRow,
  ChannelStats,
  DailyMetric,
  DashboardData,
  Funnel,
  LeadRow,
  Platform,
  SourceBreakdown,
  TemperatureSplit,
} from "./types";

// Snapshot of REAL Meta data for the [IMERSÃOGIS] [JUL26] campaigns, pulled from
// the ad account (673524229757641). Used as the fallback when the app has no live
// credentials configured, so the dashboard always renders with realistic numbers.
//
// NOTE: lead counts here are estimated (real leads come from the Google Sheet, wired
// separately). Spend / impressions / clicks are the real account totals.

const REAL_CAMPAIGNS: {
  id: string;
  name: string;
  temperature: "HOT" | "COLD";
  spend: number;
}[] = [
  { id: "c2", name: "[IMERSÃOGIS] [JUL26] [CAPTAÇÃO] [COLD] - Remessa 2", temperature: "COLD", spend: 5257.17 },
  { id: "cf", name: "[IMERSÃOGIS] [JUL26] [CAPTAÇÃO] [COLD] - Fábrica de Criativos", temperature: "COLD", spend: 2281.21 },
  { id: "ha", name: "[IMERSÃOGIS] [JUL26] [CAPTAÇÃO] [HOT] - Melhores Ads", temperature: "HOT", spend: 1600.83 },
  { id: "c3", name: "[IMERSÃOGIS] [JUL26] [CAPTAÇÃO] [COLD] - Remessa 3", temperature: "COLD", spend: 1347.24 },
  { id: "c4", name: "[IMERSÃOGIS] [JUL26] [CAPTAÇÃO] [COLD] - Remessa 4", temperature: "COLD", spend: 955.75 },
  { id: "c5", name: "[IMERSÃOGIS] [JUL26] [CAPTAÇÃO] [COLD] - Remessa 5", temperature: "COLD", spend: 928.03 },
];

const TOTAL_SPEND = 12370.23;
const TOTAL_IMPRESSIONS = 1326101;
const TOTAL_CLICKS = 15399;
const TARGET_LEADS = 2585; // estimated real leads (sheet is source of truth)

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280), s / 233280);
}

const FIRST = ["Ana", "Bruno", "Carla", "Diego", "Elaine", "Felipe", "Gabriela", "Henrique", "Isabela", "João", "Karina", "Lucas", "Mariana", "Nicolas", "Olívia", "Pedro", "Rafaela", "Thiago", "Vanessa", "William"];
const LAST = ["Silva", "Souza", "Oliveira", "Santos", "Costa", "Pereira", "Almeida", "Ferreira", "Rodrigues", "Gomes", "Martins", "Araújo"];

const SOURCES: { source: string; medium: string; platform: Platform; weight: number }[] = [
  { source: "instagram", medium: "cpc", platform: "instagram", weight: 0.46 },
  { source: "facebook", medium: "cpc", platform: "facebook", weight: 0.24 },
  { source: "whatsapp", medium: "captacao", platform: "whatsapp", weight: 0.14 },
  { source: "email", medium: "captacao", platform: "email", weight: 0.09 },
  { source: "organico", medium: "organic", platform: "organic", weight: 0.07 },
];

export function buildSnapshot(goalLeads = 5000, budgetTotal = 25000): DashboardData {
  const rand = seeded(2607);
  const days = 21;
  const today = new Date("2026-07-11T12:00:00");

  // Distribute the real totals across a ramping daily curve.
  const weights: number[] = [];
  for (let i = 0; i < days; i++) weights.push(0.6 + (i / days) * 1.1 + rand() * 0.35);
  const wSum = weights.reduce((a, b) => a + b, 0);

  const daily: DailyMetric[] = [];
  let cumSpend = 0;
  let cumLeads = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const frac = weights[i] / wSum;
    const spend = +(TOTAL_SPEND * frac).toFixed(2);
    const leads = Math.round(TARGET_LEADS * frac);
    cumSpend += spend;
    cumLeads += leads;
    daily.push({
      date: d.toISOString().slice(0, 10),
      spend,
      leads,
      cpl: leads ? +(spend / leads).toFixed(2) : 0,
      cumulativeSpend: +cumSpend.toFixed(2),
      cumulativeLeads: cumLeads,
    });
  }

  const campaigns: CampaignRow[] = REAL_CAMPAIGNS.map((c) => {
    const share = c.spend / TOTAL_SPEND;
    const impressions = Math.round(TOTAL_IMPRESSIONS * share);
    const clicks = Math.round(TOTAL_CLICKS * share);
    // HOT audiences convert cheaper.
    const cplTarget = c.temperature === "HOT" ? 3.4 : 5.3;
    const leads = Math.max(1, Math.round(c.spend / cplTarget));
    return {
      id: c.id,
      name: c.name,
      temperature: c.temperature,
      spend: c.spend,
      impressions,
      clicks,
      ctr: impressions ? +((clicks / impressions) * 100).toFixed(2) : 0,
      leads,
      cpl: +(c.spend / leads).toFixed(2),
    };
  });

  const leadsReal = campaigns.reduce((a, c) => a + c.leads, 0);
  const ctr = +((TOTAL_CLICKS / TOTAL_IMPRESSIONS) * 100).toFixed(2);
  const cpm = +((TOTAL_SPEND / TOTAL_IMPRESSIONS) * 1000).toFixed(2);
  const cplReal = +(TOTAL_SPEND / leadsReal).toFixed(2);

  const temps: Record<"HOT" | "COLD", TemperatureSplit> = {
    HOT: { temperature: "HOT", spend: 0, leads: 0, cpl: 0 },
    COLD: { temperature: "COLD", spend: 0, leads: 0, cpl: 0 },
  };
  for (const c of campaigns) {
    const t = temps[c.temperature as "HOT" | "COLD"];
    t.spend += c.spend;
    t.leads += c.leads;
  }
  (["HOT", "COLD"] as const).forEach((k) => {
    temps[k].cpl = temps[k].leads ? +(temps[k].spend / temps[k].leads).toFixed(2) : 0;
  });

  const landingPageViews = Math.round(TOTAL_CLICKS * 0.72);
  const leadsPixel = Math.round(leadsReal * 0.94);
  const funnel: Funnel = {
    impressions: TOTAL_IMPRESSIONS,
    clicks: TOTAL_CLICKS,
    landingPageViews,
    leadsPixel,
    ctr,
    cpm,
    lpvPerClick: +((landingPageViews / TOTAL_CLICKS) * 100).toFixed(1),
    leadPerLpv: +((leadsPixel / landingPageViews) * 100).toFixed(1),
  };

  const channels: ChannelStats[] = [
    {
      channel: "meta",
      label: "Meta Ads",
      active: true,
      spend: TOTAL_SPEND,
      leads: leadsReal,
      cpl: cplReal,
      impressions: TOTAL_IMPRESSIONS,
      clicks: TOTAL_CLICKS,
      ctr,
    },
    { channel: "tiktok", label: "TikTok Ads", active: false, spend: 0, leads: 0, cpl: 0, impressions: 0, clicks: 0, ctr: 0 },
    { channel: "google", label: "Google Ads", active: false, spend: 0, leads: 0, cpl: 0, impressions: 0, clicks: 0, ctr: 0 },
  ];

  const sources: SourceBreakdown[] = SOURCES.map((s) => ({
    source: s.source,
    platform: s.platform,
    leads: Math.round(leadsReal * s.weight),
  }));

  const recentLeads: LeadRow[] = Array.from({ length: 20 }).map((_, i) => {
    const s = SOURCES[Math.floor(rand() * SOURCES.length) % SOURCES.length];
    const first = FIRST[Math.floor(rand() * FIRST.length) % FIRST.length];
    const last = LAST[Math.floor(rand() * LAST.length) % LAST.length];
    const created = new Date(today);
    created.setHours(today.getHours() - i * 2 - Math.floor(rand() * 3));
    return {
      id: `lead_${i}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@email.com`,
      phone: `(11) 9${Math.floor(1000 + rand() * 8999)}-${Math.floor(1000 + rand() * 8999)}`,
      source: s.source,
      medium: s.medium,
      campaign: "semana123",
      platform: s.platform,
      createdTime: created.toISOString(),
    };
  });

  const daysTotal = 28;
  const daysElapsed = days;
  const invested = TOTAL_SPEND;
  return {
    source: "mock",
    currency: "BRL",
    client: "Ambiental Pro",
    launch: "Imersão GIS 2026",
    phase: "Captação",
    status: "Rodando",
    periodStart: daily[0].date,
    periodEnd: daily[daily.length - 1].date,
    goalLeads,
    totals: {
      spend: TOTAL_SPEND,
      leadsReal,
      cplReal,
      impressions: TOTAL_IMPRESSIONS,
      clicks: TOTAL_CLICKS,
      ctr,
      cpm,
      leadsToday: daily[daily.length - 1].leads,
      leadsYesterday: daily[daily.length - 2]?.leads ?? 0,
    },
    budget: {
      total: budgetTotal,
      invested,
      remaining: Math.max(budgetTotal - invested, 0),
      burnedPct: +((invested / budgetTotal) * 100).toFixed(1),
      daysElapsed,
      daysTotal,
      paceReal: +(invested / daysElapsed).toFixed(2),
      paceGoal: +(budgetTotal / daysTotal).toFixed(2),
    },
    tracking: {
      metaPixelLeads: leadsPixel,
      sheetLeads: leadsReal,
      diff: leadsReal - leadsPixel,
      diffPct: +(((leadsReal - leadsPixel) / leadsReal) * 100).toFixed(1),
      ok: true,
    },
    channels,
    temperatures: [temps.HOT, temps.COLD],
    funnel,
    daily,
    campaigns,
    sources,
    recentLeads,
    leadsFromSheet: false,
  };
}
