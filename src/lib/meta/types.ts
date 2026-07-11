// Domain model for the launch lead-tracking dashboard.
// Shapes are normalized so the UI never touches the raw Meta Graph API payload.

export type Platform = "facebook" | "instagram" | "audience_network" | "messenger" | "unknown";

export interface DailyMetric {
  /** ISO date, e.g. "2026-07-11" */
  date: string;
  leads: number;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  /** cost per lead for the day (spend / leads) */
  cpl: number;
}

export interface CampaignPerformance {
  id: string;
  name: string;
  status: string;
  leads: number;
  spend: number;
  impressions: number;
  clicks: number;
  cpl: number;
  ctr: number;
}

export interface PlatformBreakdown {
  platform: Platform;
  leads: number;
  spend: number;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  campaign: string;
  platform: Platform;
  createdTime: string; // ISO datetime
}

export interface DashboardTotals {
  leads: number;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  cpl: number;
  ctr: number;
  leadsToday: number;
  leadsYesterday: number;
}

export interface DashboardData {
  /** whether the numbers came from the live Meta API or the mock generator */
  source: "meta" | "mock";
  accountName: string;
  goal: number;
  periodStart: string;
  periodEnd: string;
  totals: DashboardTotals;
  daily: DailyMetric[];
  campaigns: CampaignPerformance[];
  platforms: PlatformBreakdown[];
  recentLeads: Lead[];
}
