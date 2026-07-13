export type MetaV2RawValue = string | number | boolean | null | undefined;
export type MetaV2RawRow = Record<string, MetaV2RawValue>;

export type MetaV2Level = "account" | "campaign" | "adset" | "ad";
export type MetaV2Decision = "scale" | "hold" | "watch" | "reduce" | "kill" | "refresh" | "test_more";
export type MetaV2Risk = "low" | "medium" | "high";
export type MetaV2Tone = "blue" | "green" | "red" | "amber" | "slate";

export interface MetaV2CleanRow {
  sourceIndex: number;

  date: string;
  monthKey: string;
  weekKey: string;

  campaignName: string;
  adSetName: string;
  adName: string;
  creativeName?: string;
  deliveryStatus?: string;
  adId: string;

  spend: number;
  revenue: number;
  purchases: number;

  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  lpv: number;
  contentView: number;
  atc: number;
  checkout: number;
  payment: number;
  video3s?: number;

  roas: number;
  cpa: number;
  aov: number;
  gpt: number;
  cpm: number;
  cpc: number;
  ctr: number;
  frequency: number;
  lpvRate: number;
  atcRate: number;
  checkoutRate: number;
  paymentRate: number;
  purchaseRate: number;
}

export interface MetaV2Totals {
  spend: number;
  revenue: number;
  purchases: number;

  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  lpv: number;
  contentView: number;
  atc: number;
  checkout: number;
  payment: number;

  roas: number;
  cpa: number;
  aov: number;
  gpt: number;
  cpm: number;
  cpc: number;
  ctr: number;
  frequency: number;
  lpvRate: number;
  atcRate: number;
  checkoutRate: number;
  paymentRate: number;
  purchaseRate: number;
}

export interface MetaV2Settings {
  targetRoas: number;
  targetCpa: number;
  targetGpt: number;
  grossMarginPct: number;
  minSpendForDecision: number;
  minPurchasesForScale: number;
  maxHealthyFrequency: number;
  scaleIncreasePct: number;
  reduceBudgetPct: number;
}

export interface MetaV2Status {
  isLive: boolean;
  latestDate: string;
  rowCount: number;
  syncedAt: string;
}

export interface MetaV2CommandCenterOutput {
  status: MetaV2Status;
  totals: MetaV2Totals;
  healthScore: number;
  scaleReadiness: "High" | "Medium" | "Low";
  verdict: string;
  biggestRisk: string;
  biggestOpportunity: string;
  actionCounts: {
    scale: number;
    reduce: number;
    kill: number;
    refresh: number;
    watch: number;
  };
}
