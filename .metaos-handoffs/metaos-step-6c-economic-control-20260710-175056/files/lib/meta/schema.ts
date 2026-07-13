export type MetaRawValue = string | number | boolean | null | undefined;

export type MetaRawRow = Record<string, MetaRawValue>;

export type MetaLevel = "account" | "campaign" | "adset" | "ad";

export type MetaDecision =
  | "scale"
  | "hold"
  | "watch"
  | "reduce"
  | "kill"
  | "refresh"
  | "test_more";

export type MetaRisk = "low" | "medium" | "high";

export interface MetaCleanRow {
  sourceIndex: number;

  date: string;
  monthKey: string;
  weekKey: string;

  campaignName: string;
  adSetName: string;
  adName: string;
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

  roas: number;
  cpa: number;
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

export interface MetaTotals {
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

export interface MetaWindow {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  rows: MetaCleanRow[];
  totals: MetaTotals;
}

export interface MetaQcIssue {
  severity: "info" | "warning" | "critical";
  code: string;
  message: string;
}

export interface MetaQcResult {
  score: number;
  rowCount: number;
  latestDate: string;
  earliestDate: string;
  issues: MetaQcIssue[];
}

export interface MetaPreparedTableRow {
  id: string;
  label: string;
  level: MetaLevel;
  totals: MetaTotals;
  decision?: MetaDecision;
  risk?: MetaRisk;
  children?: MetaPreparedTableRow[];
}
