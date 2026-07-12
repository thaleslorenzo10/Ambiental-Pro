import { fetchMetaMetrics, isMetaConfigured, type MetaMetrics } from "./meta/client";
import { buildSnapshot } from "./meta/snapshot";
import { fetchSheetLeads, isSheetsConfigured } from "./sheets/leads";
import type {
  DashboardData,
  LeadRow,
  Platform,
  SourceBreakdown,
} from "./meta/types";

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && v ? n : fallback;
}

function overlayMeta(base: DashboardData, m: MetaMetrics): DashboardData {
  const leadsPixel = m.leadsPixel;
  // Rebuild the daily curve from Meta's real spend; leads are back-filled from
  // sheet later (overlaySheet), so keep pixel leads as a provisional value here.
  let cumSpend = 0;
  let cumLeads = 0;
  const daily = m.daily.map((d) => {
    cumSpend += d.spend;
    cumLeads += d.leadsPixel;
    return {
      date: d.date,
      spend: +d.spend.toFixed(2),
      leads: d.leadsPixel,
      cpl: d.leadsPixel ? +(d.spend / d.leadsPixel).toFixed(2) : 0,
      cumulativeSpend: +cumSpend.toFixed(2),
      cumulativeLeads: cumLeads,
    };
  });

  const budget = { ...base.budget };
  budget.invested = m.totalSpend;
  budget.remaining = Math.max(budget.total - m.totalSpend, 0);
  budget.burnedPct = budget.total ? +((m.totalSpend / budget.total) * 100).toFixed(1) : 0;
  budget.daysElapsed = daily.length || base.budget.daysElapsed;
  budget.paceReal = budget.daysElapsed ? +(m.totalSpend / budget.daysElapsed).toFixed(2) : 0;

  // Projection recomputed from real pace (leads refined again in overlaySheet).
  const daysRemaining = Math.max(budget.daysTotal - budget.daysElapsed, 0);
  const leadsPerDay = budget.daysElapsed ? leadsPixel / budget.daysElapsed : 0;
  const leadsProjected = Math.round(leadsPixel + leadsPerDay * daysRemaining);
  const spendProjected = +(m.totalSpend + budget.paceReal * daysRemaining).toFixed(2);
  const projection = {
    ...base.projection,
    daysRemaining,
    leadsCurrent: leadsPixel,
    leadsProjected,
    spendCurrent: m.totalSpend,
    spendProjected,
    onPace: leadsProjected >= base.projection.leadsGoal,
    spendPerDayCurrent: budget.daysElapsed ? +(m.totalSpend / budget.daysElapsed).toFixed(2) : 0,
    spendPerDayNeeded: daysRemaining ? +((budget.total - m.totalSpend) / daysRemaining).toFixed(2) : 0,
    leadsPerDayCurrent: budget.daysElapsed ? Math.round(leadsPixel / budget.daysElapsed) : 0,
    leadsPerDayNeeded: daysRemaining
      ? Math.max(Math.ceil((base.projection.leadsGoal - leadsPixel) / daysRemaining), 0)
      : 0,
  };

  return {
    ...base,
    source: "meta",
    totals: {
      ...base.totals,
      spend: m.totalSpend,
      leadsReal: leadsPixel,
      cplReal: leadsPixel ? +(m.totalSpend / leadsPixel).toFixed(2) : 0,
      impressions: m.impressions,
      clicks: m.clicks,
      ctr: m.ctr,
      cpm: m.cpm,
    },
    budget,
    projection,
    secondary: m.secondary,
    channels: m.channels,
    temperatures: m.temperatures,
    funnel: m.funnel,
    campaigns: m.campaigns,
    adsets: m.adsets.length ? m.adsets : base.adsets,
    ads: m.ads.length ? m.ads : base.ads,
    placements: m.placements.length ? m.placements : base.placements,
    countries: m.countries.length ? m.countries : base.countries,
    daily: daily.length ? daily : base.daily,
    // captação phase reflects live spend/leads
    phases: base.phases.map((p) =>
      p.id === "captacao"
        ? {
            ...p,
            spent: m.totalSpend,
            leads: leadsPixel,
            cpl: leadsPixel ? +(m.totalSpend / leadsPixel).toFixed(2) : 0,
            channels: p.channels.map((ch) =>
              ch.channel === "meta"
                ? { ...ch, spent: m.totalSpend, leads: leadsPixel }
                : ch,
            ),
          }
        : p,
    ),
    tracking: {
      metaPixelLeads: leadsPixel,
      sheetLeads: base.tracking.sheetLeads,
      diff: 0,
      diffPct: 0,
      ok: true,
    },
  };
}

function sourceBreakdown(leads: LeadRow[]): SourceBreakdown[] {
  const map = new Map<string, SourceBreakdown>();
  for (const l of leads) {
    const key = l.source || "—";
    const e = map.get(key) || { source: key, platform: l.platform, leads: 0 };
    e.leads += 1;
    map.set(key, e);
  }
  return Array.from(map.values()).sort((a, b) => b.leads - a.leads);
}

function overlaySheet(base: DashboardData, leads: LeadRow[]): DashboardData {
  if (!leads.length) return base;
  const total = leads.length;
  const spend = base.totals.spend;

  // group leads per day
  const perDay = new Map<string, number>();
  for (const l of leads) {
    const day = l.createdTime.slice(0, 10);
    perDay.set(day, (perDay.get(day) || 0) + 1);
  }
  const dates = base.daily.length
    ? base.daily.map((d) => d.date)
    : Array.from(perDay.keys()).sort();

  let cumSpend = 0;
  let cumLeads = 0;
  const daily = dates.map((date) => {
    const existing = base.daily.find((d) => d.date === date);
    const daySpend = existing?.spend ?? 0;
    const dayLeads = perDay.get(date) || 0;
    cumSpend += daySpend;
    cumLeads += dayLeads;
    return {
      date,
      spend: daySpend,
      leads: dayLeads,
      cpl: dayLeads ? +(daySpend / dayLeads).toFixed(2) : 0,
      cumulativeSpend: +cumSpend.toFixed(2),
      cumulativeLeads: cumLeads,
    };
  });

  const today = daily[daily.length - 1]?.leads ?? 0;
  const yesterday = daily[daily.length - 2]?.leads ?? 0;
  const pixel = base.tracking.metaPixelLeads;

  const sorted = [...leads].sort(
    (a, b) => +new Date(b.createdTime) - +new Date(a.createdTime),
  );

  // refine projection with real sheet leads
  const daysElapsed = base.budget.daysElapsed || daily.length;
  const daysRemaining = base.projection.daysRemaining;
  const leadsPerDay = daysElapsed ? total / daysElapsed : 0;
  const leadsProjected = Math.round(total + leadsPerDay * daysRemaining);

  // Accumulated traffic sources from real sheet leads
  const LABELS: Record<string, string> = {
    instagram: "Instagram",
    facebook: "Facebook",
    whatsapp: "WhatsApp",
    email: "E-mail",
    google: "Google",
    organic: "Orgânico",
    unknown: "Outros",
  };
  const labelOf = (l: LeadRow) => LABELS[l.platform] || l.source || "Outros";
  const totalsByLabel = new Map<string, number>();
  for (const l of leads) totalsByLabel.set(labelOf(l), (totalsByLabel.get(labelOf(l)) || 0) + 1);
  const sourceKeys = Array.from(totalsByLabel.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map((e) => e[0]);
  const keySet = new Set(sourceKeys);
  const perDayByLabel = new Map<string, Record<string, number>>();
  for (const l of leads) {
    const d = l.createdTime.slice(0, 10);
    const k = labelOf(l);
    if (!keySet.has(k)) continue;
    const row = perDayByLabel.get(d) || {};
    row[k] = (row[k] || 0) + 1;
    perDayByLabel.set(d, row);
  }
  const cumBySource: Record<string, number> = {};
  sourceKeys.forEach((k) => (cumBySource[k] = 0));
  const sourceSeries = dates.map((date) => {
    const row = perDayByLabel.get(date) || {};
    sourceKeys.forEach((k) => (cumBySource[k] += row[k] || 0));
    return { date, ...cumBySource };
  });

  return {
    ...base,
    leadsFromSheet: true,
    totals: {
      ...base.totals,
      leadsReal: total,
      cplReal: total ? +(spend / total).toFixed(2) : 0,
      leadsToday: today,
      leadsYesterday: yesterday,
    },
    projection: {
      ...base.projection,
      leadsCurrent: total,
      leadsProjected,
      onPace: leadsProjected >= base.projection.leadsGoal,
      leadsPerDayCurrent: daysElapsed ? Math.round(total / daysElapsed) : 0,
      leadsPerDayNeeded: daysRemaining
        ? Math.max(Math.ceil((base.projection.leadsGoal - total) / daysRemaining), 0)
        : 0,
    },
    sourceKeys,
    sourceSeries,
    phases: base.phases.map((p) =>
      p.id === "captacao"
        ? { ...p, leads: total, cpl: total ? +(spend / total).toFixed(2) : 0 }
        : p,
    ),
    daily,
    sources: sourceBreakdown(leads),
    recentLeads: sorted.slice(0, 25),
    tracking: {
      metaPixelLeads: pixel,
      sheetLeads: total,
      diff: total - pixel,
      diffPct: total ? +(((total - pixel) / total) * 100).toFixed(1) : 0,
      ok: pixel > 0 && Math.abs(total - pixel) / Math.max(total, 1) < 0.2,
    },
  };
}

/** Single entry point the UI uses. Real Meta + Sheet data when configured; snapshot otherwise. */
export async function getDashboardData(): Promise<DashboardData> {
  const goal = num(process.env.LAUNCH_LEAD_GOAL, 8000);
  const budgetTotal = num(process.env.LAUNCH_BUDGET_TOTAL, 32000);
  const cplTarget = num(process.env.LAUNCH_CPL_TARGET, 4);
  const salesGoal = num(process.env.LAUNCH_SALES_GOAL, 200);
  let data = buildSnapshot(goal, budgetTotal, cplTarget, salesGoal);

  if (isMetaConfigured()) {
    try {
      const m = await fetchMetaMetrics();
      if (m.campaigns.length) data = overlayMeta(data, m);
    } catch (err) {
      console.error("[meta] falling back to snapshot:", err);
    }
  }

  if (isSheetsConfigured()) {
    try {
      const leads = await fetchSheetLeads();
      data = overlaySheet(data, leads);
    } catch (err) {
      console.error("[sheets] keeping snapshot leads:", err);
    }
  }

  return data;
}
