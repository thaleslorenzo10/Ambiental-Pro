// Domain model for the launch tracking dashboard (Imersão GIS / Ambiental Pro).
// The UI only ever touches these normalized shapes, never a raw API payload.

export type Channel = "meta" | "tiktok" | "google";
export type Temperature = "HOT" | "COLD" | "—";
export type Platform =
  | "instagram"
  | "facebook"
  | "whatsapp"
  | "email"
  | "google"
  | "organic"
  | "unknown";

export interface DailyMetric {
  date: string; // ISO date
  spend: number;
  leads: number;
  cpl: number;
  cumulativeSpend: number;
  cumulativeLeads: number;
}

export interface CampaignRow {
  id: string;
  name: string;
  temperature: Temperature;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  leads: number; // pixel leads
  cpl: number;
}

export interface ChannelStats {
  channel: Channel;
  label: string;
  active: boolean;
  spend: number;
  leads: number;
  cpl: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface TemperatureSplit {
  temperature: Temperature;
  spend: number;
  leads: number;
  cpl: number;
}

export interface Funnel {
  impressions: number;
  clicks: number;
  landingPageViews: number;
  leadsPixel: number;
  ctr: number; // %
  cpm: number;
  lpvPerClick: number; // %
  leadPerLpv: number; // %
}

export interface Budget {
  total: number;
  invested: number;
  remaining: number;
  burnedPct: number;
  daysElapsed: number;
  daysTotal: number;
  paceReal: number; // R$/day so far
  paceGoal: number; // R$/day needed to spend the whole budget
}

export interface Tracking {
  metaPixelLeads: number;
  sheetLeads: number;
  diff: number; // sheet - pixel
  diffPct: number;
  ok: boolean;
}

export interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string; // utm_source
  medium: string; // utm_medium
  campaign: string; // utm_campaign
  platform: Platform;
  createdTime: string;
}

export interface SourceBreakdown {
  source: string;
  platform: Platform;
  leads: number;
}

export interface DashboardTotals {
  spend: number;
  leadsReal: number;
  cplReal: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  leadsToday: number;
  leadsYesterday: number;
}

export interface DashboardData {
  source: "meta" | "mock";
  currency: string; // "BRL"
  client: string;
  launch: string;
  phase: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  goalLeads: number;
  totals: DashboardTotals;
  budget: Budget;
  tracking: Tracking;
  channels: ChannelStats[];
  temperatures: TemperatureSplit[];
  funnel: Funnel;
  daily: DailyMetric[];
  campaigns: CampaignRow[];
  sources: SourceBreakdown[];
  recentLeads: LeadRow[];
  leadsFromSheet: boolean;
}
