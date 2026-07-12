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
  realLeads?: number; // leads reais da planilha cruzados por UTM
  realCpl?: number; // spend / realLeads
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
  term: string; // utm_term
  content: string; // utm_content
  platform: Platform;
  createdTime: string;
}

export interface SourceBreakdown {
  source: string;
  platform: Platform;
  leads: number;
  paid: boolean;
}

export interface PaidOrganicSplit {
  paidLeads: number;
  organicLeads: number;
  paidPct: number;
  organicPct: number;
  paidSpend: number;
  paidCpl: number; // spend / paidLeads (custo real do lead pago)
  blendedCpl: number; // spend / (paid + organic) — CPL "misturado"
}

export interface SecondaryMetrics {
  ctr: number;
  cpm: number;
  frequency: number;
  landingPageViews: number;
  linkClicks: number;
  costPerClick: number;
}

export interface Projection {
  daysRemaining: number;
  leadsCurrent: number;
  leadsProjected: number;
  leadsGoal: number;
  spendCurrent: number;
  spendProjected: number;
  budgetTotal: number;
  onPace: boolean;
  // daily pacing
  spendPerDayCurrent: number;
  spendPerDayNeeded: number;
  leadsPerDayCurrent: number;
  leadsPerDayNeeded: number;
}

/** One row per day with cumulative leads per traffic source. */
export interface SourceSeriesPoint {
  date: string;
  [source: string]: number | string;
}

export interface SalesProjection {
  salesGoal: number;
  ticket: number;
  revenueGoal: number;
  totalInvestment: number;
  roasGoal: number;
  cacGoal: number;
  leadToSaleRate: number; // %
  breakEvenSales: number;
  salesDone: number;
  revenueDone: number;
  roasReal: number;
}

export interface PlacementBreakdown {
  placement: string;
  spend: number;
  leads: number;
  cpl: number;
}

export interface CountryBreakdown {
  country: string;
  spend: number;
  leads: number;
  cpl: number;
  pctSpend: number;
}

export interface DemographicBreakdown {
  age: string; // ex: "25-34"
  gender: "female" | "male" | "unknown";
  spend: number;
  leads: number;
  cpl: number;
}

export interface AdEntityRow {
  id: string;
  name: string;
  campaign?: string;
  temperature: Temperature;
  spend: number;
  impressions: number;
  ctr: number;
  leads: number;
  cpl: number;
  realLeads?: number;
  realCpl?: number;
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

export type PhaseStatus = "RODANDO" | "AGUARDANDO" | "CONCLUÍDO";

export interface LaunchPhase {
  id: string;
  name: string;
  description: string;
  status: PhaseStatus;
  window: string; // e.g. "29/06 → 20/07"
  budget: number;
  spent: number;
  leads: number;
  cpl: number;
  channels: { channel: Channel; label: string; spent: number; leads: number }[];
  /** optional sales goal for the vendas phase */
  salesGoal?: number;
}

export interface DashboardData {
  source: "meta" | "mock";
  period: string;
  currency: string; // "BRL"
  client: string;
  launch: string;
  phase: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  goalLeads: number;
  cplTarget: number;
  salesGoal: number;
  hotTargetPct: number; // meta de % do investimento em público quente
  sales: SalesProjection;
  totals: DashboardTotals;
  budget: Budget;
  tracking: Tracking;
  channels: ChannelStats[];
  temperatures: TemperatureSplit[];
  funnel: Funnel;
  secondary: SecondaryMetrics;
  projection: Projection;
  daily: DailyMetric[];
  campaigns: CampaignRow[];
  adsets: AdEntityRow[];
  ads: AdEntityRow[];
  placements: PlacementBreakdown[];
  countries: CountryBreakdown[];
  sources: SourceBreakdown[];
  paidOrganic: PaidOrganicSplit;
  sourceKeys: string[];
  sourceSeries: SourceSeriesPoint[];
  recentLeads: LeadRow[];
  phases: LaunchPhase[];
  leadsFromSheet: boolean;
}
