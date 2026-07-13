import { fetchMetaMetrics, isMetaConfigured, type MetaMetrics } from "./meta/client";
import { buildSnapshot } from "./meta/snapshot";
import { fetchSheetLeads, isSheetsConfigured } from "./sheets/leads";
import { periodFor, periodRange } from "./period";
import { isPaidLead } from "./classify";
import type {
  AdEntityRow,
  DashboardData,
  LeadRow,
  Platform,
  SourceBreakdown,
} from "./meta/types";

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && v ? n : fallback;
}

/* --- UTM ↔ Meta entity name matching --------------------------------------
   Crosses the sheet leads with Meta campaigns / adsets (públicos) / ads by
   normalized name, so we get REAL leads and CPL per entity (not just pixel).  */

function normName(s?: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function nameMatch(entityNorm: string, valNorm: string): boolean {
  if (valNorm.length < 4 || entityNorm.length < 4) return false;
  return entityNorm === valNorm || entityNorm.includes(valNorm) || valNorm.includes(entityNorm);
}

type LeadGetter = (l: LeadRow) => string;

/** Real leads per entity. Uses `forced` field if given, else picks the UTM
    field (among getters) that produces the most matches. */
function crossMatch(
  entities: { name: string }[],
  leads: LeadRow[],
  getters: LeadGetter[],
): number[] {
  const entityNorms = entities.map((e) => normName(e.name));
  let best = entities.map(() => 0);
  let bestTotal = -1;
  for (const get of getters) {
    const vals = leads.map((l) => normName(get(l))).filter((v) => v.length >= 4);
    if (!vals.length) continue;
    const counts = entityNorms.map((en) => vals.filter((v) => nameMatch(en, v)).length);
    const total = counts.reduce((a, b) => a + b, 0);
    if (total > bestTotal) {
      bestTotal = total;
      best = counts;
    }
  }
  return best;
}

/** Sort for optimization: entities with real leads first (cheapest CPL real
    on top), then entities without matched leads by spend. Degrades to spend
    order when no sheet leads exist. */
function byRealCpl<T extends { spend: number; realLeads?: number; realCpl?: number }>(
  a: T,
  b: T,
): number {
  const aHas = (a.realLeads ?? 0) > 0;
  const bHas = (b.realLeads ?? 0) > 0;
  if (aHas !== bHas) return aHas ? -1 : 1;
  if (aHas && bHas) return (a.realCpl ?? 0) - (b.realCpl ?? 0);
  return b.spend - a.spend;
}

/** Merge ad-entities that share the same name (e.g. "AD08" running in several
    campaigns) into a single accumulated row. */
function aggregateByName(rows: AdEntityRow[]): AdEntityRow[] {
  const map = new Map<
    string,
    AdEntityRow & { _ctrImpr: number; _topSpend: number; _camps: Set<string> }
  >();
  for (const r of rows) {
    const key = (r.name || r.id).trim();
    let e = map.get(key);
    if (!e) {
      e = {
        id: key,
        name: r.name,
        campaign: r.campaign,
        temperature: r.temperature,
        spend: 0,
        impressions: 0,
        ctr: 0,
        leads: 0,
        cpl: 0,
        realLeads: 0,
        realCpl: 0,
        _ctrImpr: 0,
        _topSpend: -1,
        _camps: new Set<string>(),
      };
      map.set(key, e);
    }
    e.spend += r.spend;
    e.impressions += r.impressions;
    e.leads += r.leads;
    e.realLeads = (e.realLeads ?? 0) + (r.realLeads ?? 0);
    e._ctrImpr += r.ctr * r.impressions;
    if (r.campaign) e._camps.add(r.campaign);
    if (!e.thumbnail && r.thumbnail) e.thumbnail = r.thumbnail;
    if (!e.permalink && r.permalink) e.permalink = r.permalink;
    if (r.spend > e._topSpend) {
      e._topSpend = r.spend;
      e.temperature = r.temperature;
    }
  }
  return Array.from(map.values())
    .map((e) => ({
      id: e.id,
      name: e.name,
      campaign: e._camps.size > 1 ? `${e._camps.size} campanhas` : [...e._camps][0],
      temperature: e.temperature,
      spend: +e.spend.toFixed(2),
      impressions: e.impressions,
      ctr: e.impressions ? +(e._ctrImpr / e.impressions).toFixed(2) : 0,
      leads: e.leads,
      cpl: e.leads ? +(e.spend / e.leads).toFixed(2) : 0,
      realLeads: e.realLeads,
      realCpl: e.realLeads ? +(e.spend / e.realLeads).toFixed(2) : 0,
      thumbnail: e.thumbnail,
      permalink: e.permalink,
    }))
    .sort((a, b) => b.spend - a.spend);
}

function withRealCpl<T extends { name: string; spend: number }>(
  entities: T[],
  leads: LeadRow[],
  getters: LeadGetter[],
): (T & { realLeads: number; realCpl: number })[] {
  const counts = crossMatch(entities, leads, getters);
  return entities.map((e, i) => ({
    ...e,
    realLeads: counts[i],
    realCpl: counts[i] ? +(e.spend / counts[i]).toFixed(2) : 0,
  }));
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
    demographics: m.demographics.length ? m.demographics : base.demographics,
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

function sourceBreakdown(
  leads: LeadRow[],
  isPaid: (l: LeadRow) => boolean,
): SourceBreakdown[] {
  const map = new Map<string, SourceBreakdown>();
  for (const l of leads) {
    const key = l.source || "—";
    const e =
      map.get(key) ||
      ({
        source: key,
        platform: l.platform,
        leads: 0,
        paid: isPaid(l),
      } as SourceBreakdown);
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

  // Cross UTMs with Meta entities → real leads and CPL per campaign/adset/ad
  const campaigns = withRealCpl(base.campaigns, leads, [
    (l) => l.campaign,
    (l) => l.term,
    (l) => l.content,
    (l) => l.medium,
  ]);
  const adsets = withRealCpl(base.adsets, leads, [
    (l) => l.term,
    (l) => l.content,
    (l) => l.medium,
    (l) => l.campaign,
  ]);
  const ads = withRealCpl(base.ads, leads, [
    (l) => l.content,
    (l) => l.term,
    (l) => l.campaign,
  ]);

  // Paid vs organic: organic only when utm_source is "email" (regra do
  // lançamento); todo o resto é mídia paga. Ver src/lib/classify.ts.
  const leadPaid = (l: LeadRow): boolean => isPaidLead(l.source, l.medium);

  const paidLeads = leads.filter(leadPaid).length;
  const organicLeads = total - paidLeads;
  const paidOrganic = {
    paidLeads,
    organicLeads,
    paidPct: total ? +((paidLeads / total) * 100).toFixed(1) : 0,
    organicPct: total ? +((organicLeads / total) * 100).toFixed(1) : 0,
    paidSpend: spend,
    paidCpl: paidLeads ? +(spend / paidLeads).toFixed(2) : 0,
    blendedCpl: total ? +(spend / total).toFixed(2) : 0,
  };

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
    campaigns,
    adsets,
    ads,
    sources: sourceBreakdown(leads, leadPaid),
    paidOrganic,
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
export async function getDashboardData(period?: string): Promise<DashboardData> {
  const goal = num(process.env.LAUNCH_LEAD_GOAL, 8000);
  const budgetTotal = num(process.env.LAUNCH_BUDGET_TOTAL, 32000);
  const cplTarget = num(process.env.LAUNCH_CPL_TARGET, 4);
  const salesGoal = num(process.env.LAUNCH_SALES_GOAL, 200);
  const ticket = num(process.env.LAUNCH_TICKET, 1500);
  const totalInvestment = num(process.env.LAUNCH_TOTAL_INVESTMENT, 40000);
  const hotTargetPct = num(process.env.LAUNCH_HOT_TARGET_PCT, 50);
  const opt = periodFor(period);
  let data = buildSnapshot(
    goal,
    budgetTotal,
    cplTarget,
    salesGoal,
    ticket,
    totalInvestment,
    hotTargetPct,
  );
  data.period = opt.key;

  if (isMetaConfigured()) {
    try {
      const m = await fetchMetaMetrics(opt.preset);
      if (m.campaigns.length) data = overlayMeta(data, m);
    } catch (err) {
      console.error("[meta] falling back to snapshot:", err);
    }
  }

  if (isSheetsConfigured()) {
    try {
      let leads = await fetchSheetLeads();
      const { since, until } = periodRange(period);
      if (since || until) {
        leads = leads.filter((l) => {
          const t = new Date(l.createdTime);
          if (since && t < since) return false;
          if (until && t >= until) return false;
          return true;
        });
      }
      data = overlaySheet(data, leads);
    } catch (err) {
      console.error("[sheets] keeping snapshot leads:", err);
    }
  }

  // Accumulate conjuntos (públicos) e anúncios repetidos por nome
  data.adsets = aggregateByName(data.adsets);
  data.ads = aggregateByName(data.ads);

  // Ordena por CPL real (mais eficiente primeiro; sem leads no fim)
  data.campaigns = [...data.campaigns].sort(byRealCpl);
  data.adsets = [...data.adsets].sort(byRealCpl);
  data.ads = [...data.ads].sort(byRealCpl);

  data.period = opt.key;
  return data;
}
