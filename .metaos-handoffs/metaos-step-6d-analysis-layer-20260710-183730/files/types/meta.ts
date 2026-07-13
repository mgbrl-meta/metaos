export type AnalysisMode =
  | "conservative"
  | "balanced"
  | "aggressive_scale"
  | "incremental_efficiency_scale";

export type DecisionTag =
  | "Scale"
  | "Hold"
  | "Watch"
  | "Reduce"
  | "Kill"
  | "Refresh Creative"
  | "Test More";

export type RiskLevel = "Low" | "Medium" | "High";

export interface MetaSettings {
  targetRoas: number;
  targetCpa: number;
  grossMarginPct: number;
  targetContributionMarginPct: number;
  targetAov: number;

  minSpendForDecision: number;
  minPurchasesForScale: number;
  minClicksForAnalysis: number;
  minImpressionsForCtrConfidence: number;

  killThresholdCpaMultiple: number;
  strongScaleRoasBufferPct: number;

  normalScaleIncreasePct: number;
  strongScaleIncreasePct: number;
  budgetReductionPct: number;
  maxDailyBudgetIncreasePct: number;
  testingBudgetAllocationPct: number;
  maxSpendPerTestAd: number;

  maxHealthyFrequency: number;
  ctrDropThresholdPct: number;
  cpmIncreaseThresholdPct: number;
  cpaIncreaseThresholdPct: number;
  fatigueLookbackDays: number;

  targetCtrPct: number;
  targetClickToLpvRatePct: number;
  targetLpvToAtcRatePct: number;
  targetAtcToCheckoutRatePct: number;
  targetCheckoutToPurchaseRatePct: number;

  analysisMode: AnalysisMode;
}

export interface MetaRawRow {
  [key: string]: string | number | null | undefined;
}

export interface MetaNormalizedRow {
  date?: string;
  campaignName: string;
  campaignId?: string;
  adSetName: string;
  adSetId?: string;
  adName: string;
  adId?: string;
  deliveryStatus?: string;

  spend: number;
  revenue: number;
  purchases: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  linkClicks: number;
  landingPageViews: number;
  contentViews: number;
  addToCart: number;
  checkoutInitiated: number;
  paymentInfo: number;
}

export interface MetaPerformanceRow extends MetaNormalizedRow {
  roas: number;
  cpa: number;
  aov: number;
  ctr: number;
  cpc: number;
  cpm: number;
  lpvRate: number;
  atcRate: number;
  checkoutRate: number;
  purchaseCvr: number;
  contributionAfterAds: number;

  scaleScore: number;
  wasteScore: number;
  fatigueScore: number;
  funnelHealthScore: number;
  efficiencyScore: number;

  decision: DecisionTag;
  reason: string;
  action: string;
  risk: RiskLevel;
}

export interface DataHealth {
  score: number;
  rowsImported: number;
  columnsDetected: number;
  dateRange: string;
  totalSpend: number;
  totalRevenue: number;
  totalPurchases: number;
  warnings: string[];
}