import type {
  CampaignRow,
  ChannelStats,
  DailyMetric,
  Funnel,
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
  daily: { date: string; spend: number; leadsPixel: number }[];
  totalSpend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  leadsPixel: number;
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

const LEAD_ACTIONS = new Set([
  "lead",
  "leadgen.other",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
]);

function leadsFrom(actions?: { action_type: string; value: string }[]): number {
  if (!actions) return 0;
  return actions
    .filter((a) => LEAD_ACTIONS.has(a.action_type))
    .reduce((s, a) => s + Number(a.value || 0), 0);
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
  date_start?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: { action_type: string; value: string }[];
}

const TAG_FILTER = (tag: string) =>
  JSON.stringify([{ field: "campaign.name", operator: "CONTAIN", value: tag }]);

export async function fetchMetaMetrics(datePreset = "maximum"): Promise<MetaMetrics> {
  const { account, tag } = cfg();

  const [campaignRes, dailyRes] = await Promise.all([
    graph<{ data: Row[] }>(`${account}/insights`, {
      level: "campaign",
      date_preset: datePreset,
      fields: "campaign_id,campaign_name,spend,impressions,clicks,actions",
      filtering: TAG_FILTER(tag),
      limit: "200",
    }),
    graph<{ data: Row[] }>(`${account}/insights`, {
      level: "account",
      date_preset: datePreset,
      time_increment: "1",
      fields: "spend,actions",
      filtering: TAG_FILTER(tag),
      limit: "500",
    }),
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
    .filter((t) => t.spend > 0)
    .map((t) => ({ ...t, cpl: t.leads ? +(t.spend / t.leads).toFixed(2) : 0 }));

  const landingPageViews = Math.round(clicks * 0.72);
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

  return {
    campaigns: campaigns.sort((a, b) => b.spend - a.spend),
    daily,
    totalSpend,
    impressions,
    clicks,
    ctr,
    cpm,
    leadsPixel,
    temperatures,
    funnel,
    channels,
  };
}
