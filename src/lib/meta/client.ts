import type {
  CampaignPerformance,
  DailyMetric,
  DashboardData,
  Lead,
  Platform,
  PlatformBreakdown,
} from "./types";

// --- Meta Marketing (Graph) API integration ---------------------------------
// Reads campaign insights + lead-ads leads for a single ad account.
// Configure via environment variables (see .env.example):
//   META_ACCESS_TOKEN   – long-lived system-user / page token with ads_read + leads_retrieval
//   META_AD_ACCOUNT_ID  – e.g. act_1234567890
//   META_GRAPH_VERSION  – optional, defaults to v21.0
//   META_LEAD_GOAL      – optional numeric goal for the launch
//
// If META_ACCESS_TOKEN / META_AD_ACCOUNT_ID are absent, callers fall back to mock data.

const GRAPH = "https://graph.facebook.com";

function cfg() {
  return {
    token: process.env.META_ACCESS_TOKEN,
    account: process.env.META_AD_ACCOUNT_ID,
    version: process.env.META_GRAPH_VERSION || "v21.0",
    goal: Number(process.env.META_LEAD_GOAL || 3000),
    accountName: process.env.META_ACCOUNT_NAME || "Lançamento",
  };
}

export function isMetaConfigured(): boolean {
  const c = cfg();
  return Boolean(c.token && c.account);
}

async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const { token, version } = cfg();
  const url = new URL(`${GRAPH}/${version}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("access_token", token as string);

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta API ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

function leadCountFromActions(actions?: { action_type: string; value: string }[]): number {
  if (!actions) return 0;
  const leadTypes = new Set([
    "lead",
    "leadgen.other",
    "onsite_conversion.lead_grouped",
    "offsite_conversion.fb_pixel_lead",
  ]);
  return actions
    .filter((a) => leadTypes.has(a.action_type))
    .reduce((sum, a) => sum + Number(a.value || 0), 0);
}

interface InsightRow {
  date_start: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  actions?: { action_type: string; value: string }[];
}

async function fetchDaily(datePreset: string): Promise<DailyMetric[]> {
  const { account } = cfg();
  const data = await graph<{ data: InsightRow[] }>(`${account}/insights`, {
    time_increment: "1",
    date_preset: datePreset,
    fields: "spend,impressions,reach,clicks,actions",
    level: "account",
    limit: "500",
  });
  return data.data.map((r) => {
    const leads = leadCountFromActions(r.actions);
    const spend = Number(r.spend || 0);
    return {
      date: r.date_start,
      leads,
      spend,
      impressions: Number(r.impressions || 0),
      reach: Number(r.reach || 0),
      clicks: Number(r.clicks || 0),
      cpl: leads ? +(spend / leads).toFixed(2) : 0,
    };
  });
}

interface CampaignRow extends InsightRow {
  campaign_id: string;
  campaign_name: string;
}

async function fetchCampaigns(datePreset: string): Promise<CampaignPerformance[]> {
  const { account } = cfg();
  const data = await graph<{ data: CampaignRow[] }>(`${account}/insights`, {
    date_preset: datePreset,
    fields: "campaign_id,campaign_name,spend,impressions,clicks,actions",
    level: "campaign",
    limit: "500",
  });
  return data.data.map((r) => {
    const leads = leadCountFromActions(r.actions);
    const spend = Number(r.spend || 0);
    const impressions = Number(r.impressions || 0);
    const clicks = Number(r.clicks || 0);
    return {
      id: r.campaign_id,
      name: r.campaign_name,
      status: "Ativa",
      leads,
      spend,
      impressions,
      clicks,
      cpl: leads ? +(spend / leads).toFixed(2) : 0,
      ctr: impressions ? +((clicks / impressions) * 100).toFixed(2) : 0,
    };
  });
}

function normalizePlatform(p?: string): Platform {
  switch (p) {
    case "facebook":
    case "instagram":
    case "audience_network":
    case "messenger":
      return p;
    default:
      return "unknown";
  }
}

async function fetchPlatforms(datePreset: string): Promise<PlatformBreakdown[]> {
  const { account } = cfg();
  const data = await graph<{
    data: (InsightRow & { publisher_platform?: string })[];
  }>(`${account}/insights`, {
    date_preset: datePreset,
    fields: "spend,actions",
    breakdowns: "publisher_platform",
    level: "account",
    limit: "500",
  });
  const map = new Map<Platform, PlatformBreakdown>();
  for (const r of data.data) {
    const platform = normalizePlatform(r.publisher_platform);
    const entry = map.get(platform) || { platform, leads: 0, spend: 0 };
    entry.leads += leadCountFromActions(r.actions);
    entry.spend += Number(r.spend || 0);
    map.set(platform, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.leads - a.leads);
}

interface LeadgenFormRow {
  id: string;
  name: string;
}

interface LeadRow {
  id: string;
  created_time: string;
  field_data: { name: string; values: string[] }[];
  campaign_name?: string;
  platform?: string;
}

function fieldValue(fields: LeadRow["field_data"], keys: string[]): string {
  const f = fields.find((x) => keys.includes(x.name.toLowerCase()));
  return f?.values?.[0] || "";
}

async function fetchRecentLeads(limit = 25): Promise<Lead[]> {
  const { account } = cfg();
  // Get lead-gen forms for the account, then pull recent leads from each.
  const forms = await graph<{ data: LeadgenFormRow[] }>(`${account}/leadgen_forms`, {
    fields: "id,name",
    limit: "50",
  }).catch(() => ({ data: [] as LeadgenFormRow[] }));

  const all: Lead[] = [];
  for (const form of forms.data.slice(0, 10)) {
    const leads = await graph<{ data: LeadRow[] }>(`${form.id}/leads`, {
      fields: "id,created_time,field_data,campaign_name,platform",
      limit: String(limit),
    }).catch(() => ({ data: [] as LeadRow[] }));

    for (const l of leads.data) {
      all.push({
        id: l.id,
        name: fieldValue(l.field_data, ["full_name", "name", "nome"]),
        email: fieldValue(l.field_data, ["email", "e-mail"]),
        phone: fieldValue(l.field_data, ["phone_number", "phone", "telefone"]),
        campaign: l.campaign_name || form.name,
        platform: normalizePlatform(l.platform),
        createdTime: l.created_time,
      });
    }
  }

  return all
    .sort((a, b) => +new Date(b.createdTime) - +new Date(a.createdTime))
    .slice(0, limit);
}

export async function fetchMetaDashboard(
  datePreset = "last_30d",
): Promise<DashboardData> {
  const { goal, accountName } = cfg();
  const [daily, campaigns, platforms, recentLeads] = await Promise.all([
    fetchDaily(datePreset),
    fetchCampaigns(datePreset),
    fetchPlatforms(datePreset),
    fetchRecentLeads(25),
  ]);

  const totalsLeads = daily.reduce((a, b) => a + b.leads, 0);
  const totalsSpend = daily.reduce((a, b) => a + b.spend, 0);
  const totalsImpr = daily.reduce((a, b) => a + b.impressions, 0);
  const totalsReach = daily.reduce((a, b) => a + b.reach, 0);
  const totalsClicks = daily.reduce((a, b) => a + b.clicks, 0);

  return {
    source: "meta",
    accountName,
    goal,
    periodStart: daily[0]?.date ?? "",
    periodEnd: daily[daily.length - 1]?.date ?? "",
    totals: {
      leads: totalsLeads,
      spend: totalsSpend,
      impressions: totalsImpr,
      reach: totalsReach,
      clicks: totalsClicks,
      cpl: totalsLeads ? +(totalsSpend / totalsLeads).toFixed(2) : 0,
      ctr: totalsImpr ? +((totalsClicks / totalsImpr) * 100).toFixed(2) : 0,
      leadsToday: daily[daily.length - 1]?.leads ?? 0,
      leadsYesterday: daily[daily.length - 2]?.leads ?? 0,
    },
    daily,
    campaigns,
    platforms,
    recentLeads,
  };
}
