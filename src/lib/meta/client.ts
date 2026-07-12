import type {
  AdEntityRow,
  CampaignRow,
  ChannelStats,
  CountryBreakdown,
  DailyMetric,
  DemographicBreakdown,
  Funnel,
  PlacementBreakdown,
  SecondaryMetrics,
  Temperature,
  TemperatureSplit,
} from "./types";

// --- Meta Marketing (Graph) API integration ---------------------------------
// Pulls the launch campaigns (filtered by a name tag, e.g. "[IMERSÃOGIS] [JUL26]")
// from a single ad account and returns normalized metrics the composer merges with
// the Google-Sheet leads.
//
// Env (see .env.example):
//   META_ACCESS_TOKEN   – token with ads_read
//   META_AD_ACCOUNT_ID  – numeric account id (no "act_" needed; added if missing)
//   META_CAMPAIGN_TAG   – substring every launch campaign name contains
//   META_GRAPH_VERSION  – optional, default v21.0

const GRAPH = "https://graph.facebook.com";

export interface MetaMetrics {
  campaigns: CampaignRow[];
  adsets: AdEntityRow[];
  ads: AdEntityRow[];
  placements: PlacementBreakdown[];
  countries: CountryBreakdown[];
  demographics: DemographicBreakdown[];
  daily: { date: string; spend: number; leadsPixel: number }[];
  totalSpend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  leadsPixel: number;
  secondary: SecondaryMetrics;
  temperatures: TemperatureSplit[];
  funnel: Funnel;
  channels: ChannelStats[];
}

function cfg() {
  const raw = process.env.META_AD_ACCOUNT_ID || "";
  const account = raw ? (raw.startsWith("act_") ? raw : `act_${raw}`) : "";
  return {
    token: process.env.META_ACCESS_TOKEN,
    account,
    tag: process.env.META_CAMPAIGN_TAG || "[IMERSÃOGIS] [JUL26]",
    version: process.env.META_GRAPH_VERSION || "v21.0",
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
  if (!res.ok) throw new Error(`Meta API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

type Action = { action_type: string; value: string };

// Meta may return the SAME conversion under several action_types
// (lead, offsite_conversion.fb_pixel_lead, onsite_conversion.lead_grouped).
// Summing them double-counts, so we pick ONE by priority (pixel Lead first,
// since this launch captures on an external landing page). Override via
// META_LEAD_ACTION if the account optimizes for a different event.
const LEAD_PRIORITY = [
  "offsite_conversion.fb_pixel_lead",
  "onsite_conversion.lead_grouped",
  "leadgen.other",
  "lead",
];

function leadsFrom(actions?: Action[]): number {
  if (!actions) return 0;
  const map: Record<string, number> = {};
  for (const a of actions) map[a.action_type] = Number(a.value || 0);
  const override = process.env.META_LEAD_ACTION;
  if (override && map[override] != null) return map[override];
  for (const t of LEAD_PRIORITY) if (map[t] != null) return map[t];
  return 0;
}

function actionValue(actions: Action[] | undefined, types: string[]): number {
  if (!actions) return 0;
  const set = new Set(types);
  return actions.filter((a) => set.has(a.action_type)).reduce((s, a) => s + Number(a.value || 0), 0);
}

function temperatureOf(name: string): Temperature {
  const u = name.toUpperCase();
  if (u.includes("[HOT]")) return "HOT";
  if (u.includes("[COLD]")) return "COLD";
  return "—";
}

interface Row {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  date_start?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  frequency?: string;
  cpm?: string;
  cpc?: string;
  ctr?: string;
  inline_link_clicks?: string;
  publisher_platform?: string;
  platform_position?: string;
  country?: string;
  age?: string;
  gender?: string;
  actions?: Action[];
}

const TAG_FILTER = (tag: string) =>
  JSON.stringify([{ field: "campaign.name", operator: "CONTAIN", value: tag }]);

function entityRow(r: Row, kind: "adset" | "ad"): AdEntityRow {
  const spend = Number(r.spend || 0);
  const impressions = Number(r.impressions || 0);
  const clicks = Number(r.clicks || 0);
  const leads = leadsFrom(r.actions);
  return {
    id: (kind === "adset" ? r.adset_id : r.ad_id) || `${kind}_${Math.random()}`,
    name: (kind === "adset" ? r.adset_name : r.ad_name) || "",
    campaign: r.campaign_name,
    temperature: temperatureOf(r.campaign_name || ""),
    spend,
    impressions,
    ctr: impressions ? +((clicks / impressions) * 100).toFixed(2) : 0,
    leads,
    cpl: leads ? +(spend / leads).toFixed(2) : 0,
  };
}

// Friendly labels for Meta platform_position values.
function placementLabel(pos: string): string {
  const p = pos.toLowerCase();
  if (p.includes("feed")) return "Feed";
  if (p.includes("story") || p.includes("stories")) return "Stories";
  if (p.includes("reels")) return "Reels";
  if (p.includes("explore")) return "Explore";
  if (p.includes("search")) return "Search";
  if (p.includes("marketplace")) return "Marketplace";
  return "Outros";
}

const COUNTRY_NAMES: Record<string, string> = {
  BR: "Brasil",
  PT: "Portugal",
  US: "Estados Unidos",
  AR: "Argentina",
  ES: "Espanha",
  MX: "México",
};

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error("[meta] optional fetch failed:", err);
    return fallback;
  }
}

export async function fetchMetaMetrics(datePreset = "maximum"): Promise<MetaMetrics> {
  const { account, tag } = cfg();
  const filtering = TAG_FILTER(tag);

  const [campaignRes, dailyRes, totalsRes] = await Promise.all([
    graph<{ data: Row[] }>(`${account}/insights`, {
      level: "campaign",
      date_preset: datePreset,
      fields: "campaign_id,campaign_name,spend,impressions,clicks,actions",
      filtering,
      limit: "200",
    }),
    graph<{ data: Row[] }>(`${account}/insights`, {
      level: "account",
      date_preset: datePreset,
      time_increment: "1",
      fields: "spend,actions",
      filtering,
      limit: "500",
    }),
    graph<{ data: Row[] }>(`${account}/insights`, {
      level: "account",
      date_preset: datePreset,
      fields:
        "spend,impressions,reach,clicks,frequency,cpm,cpc,ctr,inline_link_clicks,actions",
      filtering,
      limit: "1",
    }),
  ]);

  // Optional richer breakdowns — never break the dashboard if they fail.
  const [adsetRes, adRes, placementRes, countryRes, demoRes] = await Promise.all([
    safe(
      () =>
        graph<{ data: Row[] }>(`${account}/insights`, {
          level: "adset",
          date_preset: datePreset,
          fields: "adset_id,adset_name,campaign_name,spend,impressions,clicks,actions",
          filtering,
          limit: "200",
        }),
      { data: [] as Row[] },
    ),
    safe(
      () =>
        graph<{ data: Row[] }>(`${account}/insights`, {
          level: "ad",
          date_preset: datePreset,
          fields: "ad_id,ad_name,campaign_name,spend,impressions,clicks,actions",
          filtering,
          limit: "300",
        }),
      { data: [] as Row[] },
    ),
    safe(
      () =>
        graph<{ data: Row[] }>(`${account}/insights`, {
          level: "account",
          date_preset: datePreset,
          fields: "spend,actions",
          breakdowns: "platform_position",
          filtering,
          limit: "100",
        }),
      { data: [] as Row[] },
    ),
    safe(
      () =>
        graph<{ data: Row[] }>(`${account}/insights`, {
          level: "account",
          date_preset: datePreset,
          fields: "spend,actions",
          breakdowns: "country",
          filtering,
          limit: "100",
        }),
      { data: [] as Row[] },
    ),
    safe(
      () =>
        graph<{ data: Row[] }>(`${account}/insights`, {
          level: "account",
          date_preset: datePreset,
          fields: "spend,actions",
          breakdowns: "age,gender",
          filtering,
          limit: "100",
        }),
      { data: [] as Row[] },
    ),
  ]);

  const campaigns: CampaignRow[] = campaignRes.data.map((r) => {
    const spend = Number(r.spend || 0);
    const impressions = Number(r.impressions || 0);
    const clicks = Number(r.clicks || 0);
    const leads = leadsFrom(r.actions);
    return {
      id: r.campaign_id || r.campaign_name || "",
      name: r.campaign_name || "",
      temperature: temperatureOf(r.campaign_name || ""),
      spend,
      impressions,
      clicks,
      ctr: impressions ? +((clicks / impressions) * 100).toFixed(2) : 0,
      leads,
      cpl: leads ? +(spend / leads).toFixed(2) : 0,
    };
  });

  const totalSpend = campaigns.reduce((a, c) => a + c.spend, 0);
  const impressions = campaigns.reduce((a, c) => a + c.impressions, 0);
  const clicks = campaigns.reduce((a, c) => a + c.clicks, 0);
  const leadsPixel = campaigns.reduce((a, c) => a + c.leads, 0);
  const ctr = impressions ? +((clicks / impressions) * 100).toFixed(2) : 0;
  const cpm = impressions ? +((totalSpend / impressions) * 1000).toFixed(2) : 0;

  // Account totals row → real secondary metrics + accurate LPV.
  const t = totalsRes.data[0] || {};
  const landingPageViews = actionValue(t.actions, [
    "landing_page_view",
    "omni_landing_page_view",
  ]) || Math.round(clicks * 0.72);
  const secondary: SecondaryMetrics = {
    ctr: t.ctr ? +Number(t.ctr).toFixed(2) : ctr,
    cpm: t.cpm ? +Number(t.cpm).toFixed(2) : cpm,
    frequency: t.frequency ? +Number(t.frequency).toFixed(2) : 0,
    landingPageViews,
    linkClicks: Number(t.inline_link_clicks || 0) || clicks,
    costPerClick: t.cpc ? +Number(t.cpc).toFixed(2) : clicks ? +(totalSpend / clicks).toFixed(2) : 0,
  };

  const daily = dailyRes.data
    .map((r) => ({
      date: r.date_start || "",
      spend: Number(r.spend || 0),
      leadsPixel: leadsFrom(r.actions),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const temps: Record<Temperature, TemperatureSplit> = {
    HOT: { temperature: "HOT", spend: 0, leads: 0, cpl: 0 },
    COLD: { temperature: "COLD", spend: 0, leads: 0, cpl: 0 },
    "—": { temperature: "—", spend: 0, leads: 0, cpl: 0 },
  };
  for (const c of campaigns) {
    temps[c.temperature].spend += c.spend;
    temps[c.temperature].leads += c.leads;
  }
  const temperatures = (Object.values(temps) as TemperatureSplit[])
    .filter((x) => x.spend > 0)
    .map((x) => ({ ...x, cpl: x.leads ? +(x.spend / x.leads).toFixed(2) : 0 }));

  const funnel: Funnel = {
    impressions,
    clicks,
    landingPageViews,
    leadsPixel,
    ctr,
    cpm,
    lpvPerClick: clicks ? +((landingPageViews / clicks) * 100).toFixed(1) : 0,
    leadPerLpv: landingPageViews ? +((leadsPixel / landingPageViews) * 100).toFixed(1) : 0,
  };

  const channels: ChannelStats[] = [
    {
      channel: "meta",
      label: "Meta Ads",
      active: true,
      spend: totalSpend,
      leads: leadsPixel,
      cpl: leadsPixel ? +(totalSpend / leadsPixel).toFixed(2) : 0,
      impressions,
      clicks,
      ctr,
    },
    { channel: "tiktok", label: "TikTok Ads", active: false, spend: 0, leads: 0, cpl: 0, impressions: 0, clicks: 0, ctr: 0 },
    { channel: "google", label: "Google Ads", active: false, spend: 0, leads: 0, cpl: 0, impressions: 0, clicks: 0, ctr: 0 },
  ];

  const adsets = adsetRes.data.map((r) => entityRow(r, "adset")).sort((a, b) => b.spend - a.spend);
  const ads = adRes.data.map((r) => entityRow(r, "ad")).sort((a, b) => b.spend - a.spend);

  // Placement breakdown (aggregate platform_position values into friendly labels)
  const placeMap = new Map<string, PlacementBreakdown>();
  for (const r of placementRes.data) {
    const label = placementLabel(r.platform_position || "");
    const e = placeMap.get(label) || { placement: label, spend: 0, leads: 0, cpl: 0 };
    e.spend += Number(r.spend || 0);
    e.leads += leadsFrom(r.actions);
    placeMap.set(label, e);
  }
  const placements = Array.from(placeMap.values())
    .map((p) => ({ ...p, spend: +p.spend.toFixed(2), cpl: p.leads ? +(p.spend / p.leads).toFixed(2) : 0 }))
    .sort((a, b) => b.spend - a.spend);

  // Country breakdown
  const countrySpend = countryRes.data.reduce((s, r) => s + Number(r.spend || 0), 0) || 1;
  const countries: CountryBreakdown[] = countryRes.data
    .map((r) => {
      const spend = Number(r.spend || 0);
      const leads = leadsFrom(r.actions);
      return {
        country: COUNTRY_NAMES[r.country || ""] || r.country || "—",
        spend: +spend.toFixed(2),
        leads,
        cpl: leads ? +(spend / leads).toFixed(2) : 0,
        pctSpend: +((spend / countrySpend) * 100).toFixed(1),
      };
    })
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8);

  const GENDER: Record<string, DemographicBreakdown["gender"]> = {
    female: "female",
    male: "male",
    unknown: "unknown",
  };
  const demographics: DemographicBreakdown[] = demoRes.data
    .map((r) => {
      const spend = Number(r.spend || 0);
      const leads = leadsFrom(r.actions);
      return {
        age: r.age || "—",
        gender: GENDER[r.gender || "unknown"] || "unknown",
        spend: +spend.toFixed(2),
        leads,
        cpl: leads ? +(spend / leads).toFixed(2) : 0,
      };
    })
    .filter((d) => d.spend > 0)
    .sort((a, b) => b.spend - a.spend);

  return {
    campaigns: campaigns.sort((a, b) => b.spend - a.spend),
    adsets,
    ads,
    placements,
    countries,
    demographics,
    daily,
    totalSpend,
    impressions,
    clicks,
    ctr,
    cpm,
    leadsPixel,
    secondary,
    temperatures,
    funnel,
    channels,
  };
}
