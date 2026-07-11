import type {
  CampaignPerformance,
  DailyMetric,
  DashboardData,
  Lead,
  Platform,
  PlatformBreakdown,
} from "./types";

// Deterministic pseudo-random so charts look stable between renders.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const FIRST_NAMES = [
  "Ana", "Bruno", "Carla", "Diego", "Elaine", "Felipe", "Gabriela", "Henrique",
  "Isabela", "João", "Karina", "Lucas", "Mariana", "Nicolas", "Olívia", "Pedro",
  "Rafaela", "Thiago", "Vanessa", "William",
];
const LAST_NAMES = [
  "Silva", "Souza", "Oliveira", "Santos", "Costa", "Pereira", "Almeida",
  "Ferreira", "Rodrigues", "Gomes", "Martins", "Araújo", "Ribeiro", "Carvalho",
];
const CAMPAIGNS = [
  { id: "c1", name: "Captação — Reels Frio" },
  { id: "c2", name: "Captação — Feed Interesses" },
  { id: "c3", name: "Remarketing — Página de Captura" },
  { id: "c4", name: "Lookalike — Compradores" },
];
const PLATFORMS: Platform[] = ["instagram", "facebook", "audience_network"];

function pick<T>(arr: T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

export function buildMockDashboard(days = 21, goal = 3000): DashboardData {
  const rand = seeded(42);
  const today = new Date();
  const daily: DailyMetric[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // ramp up as the launch progresses
    const progress = (days - i) / days;
    const base = 60 + progress * 180;
    const leads = Math.round(base * (0.7 + rand() * 0.6));
    const cplBase = 6 + rand() * 4;
    const spend = Math.round(leads * cplBase);
    const impressions = Math.round(spend * (28 + rand() * 12));
    const reach = Math.round(impressions * (0.55 + rand() * 0.2));
    const clicks = Math.round(impressions * (0.012 + rand() * 0.01));
    daily.push({
      date: d.toISOString().slice(0, 10),
      leads,
      spend,
      impressions,
      reach,
      clicks,
      cpl: leads ? +(spend / leads).toFixed(2) : 0,
    });
  }

  const totalsLeads = daily.reduce((a, b) => a + b.leads, 0);
  const totalsSpend = daily.reduce((a, b) => a + b.spend, 0);
  const totalsImpr = daily.reduce((a, b) => a + b.impressions, 0);
  const totalsReach = daily.reduce((a, b) => a + b.reach, 0);
  const totalsClicks = daily.reduce((a, b) => a + b.clicks, 0);

  const campaigns: CampaignPerformance[] = CAMPAIGNS.map((c, idx) => {
    const share = [0.34, 0.28, 0.22, 0.16][idx];
    const leads = Math.round(totalsLeads * share);
    const spend = Math.round(totalsSpend * (share * (0.85 + rand() * 0.3)));
    const impressions = Math.round(totalsImpr * share);
    const clicks = Math.round(totalsClicks * share);
    return {
      id: c.id,
      name: c.name,
      status: idx === 3 ? "Pausada" : "Ativa",
      leads,
      spend,
      impressions,
      clicks,
      cpl: leads ? +(spend / leads).toFixed(2) : 0,
      ctr: impressions ? +((clicks / impressions) * 100).toFixed(2) : 0,
    };
  });

  const platforms: PlatformBreakdown[] = PLATFORMS.map((p, idx) => {
    const share = [0.58, 0.34, 0.08][idx];
    return {
      platform: p,
      leads: Math.round(totalsLeads * share),
      spend: Math.round(totalsSpend * share),
    };
  });

  const recentLeads: Lead[] = Array.from({ length: 25 }).map((_, i) => {
    const first = pick(FIRST_NAMES, rand());
    const last = pick(LAST_NAMES, rand());
    const created = new Date(today);
    created.setHours(today.getHours() - i * 2 - Math.floor(rand() * 3));
    return {
      id: `lead_${1000 + i}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@email.com`,
      phone: `(11) 9${Math.floor(1000 + rand() * 8999)}-${Math.floor(1000 + rand() * 8999)}`,
      campaign: pick(CAMPAIGNS, rand()).name,
      platform: pick(PLATFORMS, rand()),
      createdTime: created.toISOString(),
    };
  });

  return {
    source: "mock",
    accountName: "Lançamento — Conta Demo",
    goal,
    periodStart: daily[0].date,
    periodEnd: daily[daily.length - 1].date,
    totals: {
      leads: totalsLeads,
      spend: totalsSpend,
      impressions: totalsImpr,
      reach: totalsReach,
      clicks: totalsClicks,
      cpl: totalsLeads ? +(totalsSpend / totalsLeads).toFixed(2) : 0,
      ctr: totalsImpr ? +((totalsClicks / totalsImpr) * 100).toFixed(2) : 0,
      leadsToday: daily[daily.length - 1].leads,
      leadsYesterday: daily[daily.length - 2]?.leads ?? 0,
    },
    daily,
    campaigns,
    platforms,
    recentLeads,
  };
}
