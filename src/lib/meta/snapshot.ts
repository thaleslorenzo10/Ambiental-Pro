import type {
  AdEntityRow,
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
import { isPaidLead } from "../classify";

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
const TARGET_LEADS = 2880; // estimated real leads (sheet is source of truth); ~CPL R$4.30

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

export function buildSnapshot(
  goalLeads = 8000,
  budgetTotal = 32000,
  cplTarget = 4,
  salesGoal = 200,
  ticket = 1500,
  totalInvestment = 40000,
  hotTargetPct = 50,
): DashboardData {
  const rand = seeded(2607);
  // Captação: 29/06 → 20/07 (22 dias). "Hoje" no contexto = 11/07 (13º dia).
  const days = 13;
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
      realLeads: Math.round(leads * 0.97),
      realCpl: +(c.spend / Math.max(Math.round(leads * 0.97), 1)).toFixed(2),
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
    paid: isPaidLead(s.source, s.medium),
  }));
  const paidLeads = sources.filter((s) => s.paid).reduce((a, s) => a + s.leads, 0);
  const organicLeads = sources.filter((s) => !s.paid).reduce((a, s) => a + s.leads, 0);
  const paidOrganic = {
    paidLeads,
    organicLeads,
    paidPct: leadsReal ? +((paidLeads / leadsReal) * 100).toFixed(1) : 0,
    organicPct: leadsReal ? +((organicLeads / leadsReal) * 100).toFixed(1) : 0,
    paidSpend: TOTAL_SPEND,
    paidCpl: paidLeads ? +(TOTAL_SPEND / paidLeads).toFixed(2) : 0,
    blendedCpl: leadsReal ? +(TOTAL_SPEND / leadsReal).toFixed(2) : 0,
  };

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
      term: "",
      content: "",
      platform: s.platform,
      createdTime: created.toISOString(),
    };
  });

  const daysTotal = 22; // 29/06 → 20/07
  const daysElapsed = days;
  const invested = TOTAL_SPEND;

  // Sales / ROAS projection (fase de vendas — carrinho 22–27/07)
  const revenueGoal = salesGoal * ticket;
  const sales = {
    salesGoal,
    ticket,
    revenueGoal,
    totalInvestment,
    roasGoal: totalInvestment ? +(revenueGoal / totalInvestment).toFixed(2) : 0,
    cacGoal: salesGoal ? +(totalInvestment / salesGoal).toFixed(2) : 0,
    leadToSaleRate: goalLeads ? +((salesGoal / goalLeads) * 100).toFixed(2) : 0,
    breakEvenSales: ticket ? Math.ceil(totalInvestment / ticket) : 0,
    salesDone: 0,
    revenueDone: 0,
    roasReal: 0,
  };

  // Secondary metrics
  const frequency = 2.4 + rand() * 0.5;
  const secondary = {
    ctr,
    cpm,
    frequency: +frequency.toFixed(2),
    landingPageViews,
    linkClicks: Math.round(TOTAL_CLICKS * 0.92),
    costPerClick: +(TOTAL_SPEND / TOTAL_CLICKS).toFixed(2),
  };

  // Projection to end of captação, at current pace
  const daysRemaining = Math.max(daysTotal - daysElapsed, 0);
  const leadsPerDay = leadsReal / daysElapsed;
  const leadsProjected = Math.round(leadsReal + leadsPerDay * daysRemaining);
  const spendProjected = +(invested + (invested / daysElapsed) * daysRemaining).toFixed(2);
  const projection = {
    daysRemaining,
    leadsCurrent: leadsReal,
    leadsProjected,
    leadsGoal: goalLeads,
    spendCurrent: invested,
    spendProjected,
    budgetTotal,
    onPace: leadsProjected >= goalLeads,
    spendPerDayCurrent: +(invested / daysElapsed).toFixed(2),
    spendPerDayNeeded: daysRemaining ? +((budgetTotal - invested) / daysRemaining).toFixed(2) : 0,
    leadsPerDayCurrent: Math.round(leadsReal / daysElapsed),
    leadsPerDayNeeded: daysRemaining ? Math.ceil((goalLeads - leadsReal) / daysRemaining) : 0,
  };

  // Accumulated traffic sources (stacked over time)
  const SOURCE_LABEL: Record<string, string> = {
    instagram: "Instagram",
    facebook: "Facebook",
    whatsapp: "WhatsApp",
    email: "E-mail",
    organic: "Orgânico",
  };
  const sourceKeys = SOURCES.map((s) => SOURCE_LABEL[s.platform] || s.source);
  const cum: Record<string, number> = {};
  sourceKeys.forEach((k) => (cum[k] = 0));
  const sourceSeries = daily.map((d) => {
    SOURCES.forEach((s, i) => {
      cum[sourceKeys[i]] += Math.round(d.leads * s.weight);
    });
    return { date: d.date, ...cum } as { date: string } & Record<string, number>;
  });

  // Placement breakdown
  const PLACEMENTS: { placement: string; w: number; cplMul: number }[] = [
    { placement: "Feed", w: 0.34, cplMul: 1.0 },
    { placement: "Stories", w: 0.24, cplMul: 0.9 },
    { placement: "Reels", w: 0.26, cplMul: 0.85 },
    { placement: "Explore", w: 0.1, cplMul: 1.15 },
    { placement: "Outros", w: 0.06, cplMul: 1.3 },
  ];
  const placements = PLACEMENTS.map((p) => {
    const spend = +(TOTAL_SPEND * p.w).toFixed(2);
    const leads = Math.round((leadsReal * p.w) / p.cplMul);
    return { placement: p.placement, spend, leads, cpl: leads ? +(spend / leads).toFixed(2) : 0 };
  });

  // Country breakdown
  const COUNTRIES: { country: string; w: number }[] = [
    { country: "Brasil", w: 0.93 },
    { country: "Portugal", w: 0.035 },
    { country: "Estados Unidos", w: 0.02 },
    { country: "Outros", w: 0.015 },
  ];
  const countries = COUNTRIES.map((c) => {
    const spend = +(TOTAL_SPEND * c.w).toFixed(2);
    const leads = Math.round(leadsReal * c.w);
    return {
      country: c.country,
      spend,
      leads,
      cpl: leads ? +(spend / leads).toFixed(2) : 0,
      pctSpend: +(c.w * 100).toFixed(1),
    };
  });

  // Demographic breakdown (age × gender)
  const AGES = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
  const AGE_W = [0.12, 0.34, 0.28, 0.15, 0.08, 0.03];
  const demographics = AGES.flatMap((age, i) =>
    (["female", "male"] as const).map((gender, g) => {
      const w = AGE_W[i] * (gender === "female" ? 0.56 : 0.44);
      const spend = +(TOTAL_SPEND * w).toFixed(2);
      const cplMul = age === "25-34" || age === "35-44" ? 0.9 : 1.1;
      const leads = Math.max(1, Math.round((leadsReal * w) / cplMul));
      return { age, gender, spend, leads, cpl: +(spend / leads).toFixed(2) };
    }),
  ).sort((a, b) => b.spend - a.spend);

  // Adsets (2 per campaign) and Ads (2 per adset)
  const ADSET_SUFFIX = ["Interesses", "Lookalike 1%", "Amplo", "Retargeting"];
  const AD_SUFFIX = ["Vídeo VSL", "Imagem Depoimento", "Carrossel", "Reels Nativo"];
  const adsets: AdEntityRow[] = [];
  const ads: AdEntityRow[] = [];
  for (const c of campaigns) {
    const parts = [0.6, 0.4];
    parts.forEach((frac, i) => {
      const spend = +(c.spend * frac).toFixed(2);
      const impressions = Math.round(c.impressions * frac);
      const clicks = Math.round(c.clicks * frac);
      const leads = Math.max(1, Math.round(c.leads * frac));
      const asId = `${c.id}_as${i}`;
      adsets.push({
        id: asId,
        name: `[${c.temperature}] ${ADSET_SUFFIX[(i + adsets.length) % ADSET_SUFFIX.length]}`,
        campaign: c.name,
        temperature: c.temperature,
        spend,
        impressions,
        ctr: impressions ? +((clicks / impressions) * 100).toFixed(2) : 0,
        leads,
        cpl: +(spend / leads).toFixed(2),
        realLeads: Math.round(leads * 0.97),
        realCpl: +(spend / Math.max(Math.round(leads * 0.97), 1)).toFixed(2),
      });
      [0.55, 0.45].forEach((f2, j) => {
        const aSpend = +(spend * f2).toFixed(2);
        const aImpr = Math.round(impressions * f2);
        const aClk = Math.round(clicks * f2);
        const aLeads = Math.max(1, Math.round(leads * f2));
        const aReal = Math.max(1, Math.round(aLeads * 0.97));
        ads.push({
          id: `${asId}_ad${j}`,
          name: `${AD_SUFFIX[(j + ads.length) % AD_SUFFIX.length]} — ${c.temperature}`,
          campaign: c.name,
          temperature: c.temperature,
          spend: aSpend,
          impressions: aImpr,
          ctr: aImpr ? +((aClk / aImpr) * 100).toFixed(2) : 0,
          leads: aLeads,
          cpl: +(aSpend / aLeads).toFixed(2),
          realLeads: aReal,
          realCpl: +(aSpend / aReal).toFixed(2),
        });
      });
    });
  }
  adsets.sort((a, b) => b.spend - a.spend);
  ads.sort((a, b) => b.spend - a.spend);

  // Launch phases (Imersão GIS): captação R$32k + remarketing R$8k = total R$40k
  const REMARKETING_BUDGET = 8000;
  const phases = [
    {
      id: "captacao",
      name: "Captação",
      description: "Leads do lançamento",
      status: "RODANDO" as const,
      window: "29/06 → 20/07",
      budget: budgetTotal,
      spent: invested,
      leads: leadsReal,
      cpl: cplReal,
      channels: [
        { channel: "meta" as const, label: "Meta", spent: invested, leads: leadsReal },
        { channel: "tiktok" as const, label: "TikTok", spent: 0, leads: 0 },
        { channel: "google" as const, label: "Google", spent: 0, leads: 0 },
      ],
    },
    {
      id: "remarketing",
      name: "Remarketing",
      description: "Lembrete + replay das aulas",
      status: "AGUARDANDO" as const,
      window: "20/07 → 27/07",
      budget: REMARKETING_BUDGET,
      spent: 0,
      leads: 0,
      cpl: 0,
      channels: [
        { channel: "meta" as const, label: "Meta", spent: 0, leads: 0 },
      ],
    },
    {
      id: "vendas",
      name: "Vendas",
      description: "Carrinho aberto 22/07 → fechamento 27/07",
      status: "AGUARDANDO" as const,
      window: "22/07 → 27/07",
      budget: 0,
      spent: 0,
      leads: 0,
      cpl: 0,
      salesGoal,
      channels: [
        { channel: "meta" as const, label: "Meta", spent: 0, leads: 0 },
      ],
    },
  ];

  return {
    source: "mock",
    period: "max",
    currency: "BRL",
    client: "Ambiental Pro",
    launch: "Imersão GIS 2026",
    phase: "Captação",
    status: "Rodando",
    periodStart: daily[0].date,
    periodEnd: daily[daily.length - 1].date,
    goalLeads,
    cplTarget,
    salesGoal,
    hotTargetPct,
    sales,
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
    secondary,
    projection,
    daily,
    campaigns,
    adsets,
    ads,
    placements,
    countries,
    demographics,
    sources,
    paidOrganic,
    sourceKeys,
    sourceSeries,
    recentLeads,
    phases,
    leadsFromSheet: false,
  };
}
