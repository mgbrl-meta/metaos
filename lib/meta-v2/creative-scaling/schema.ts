export type CreativeScalingWindow =
  | 7
  | 14
  | 30
  | 90
  | 0;

export type CreativeScalingDecision =
  | "scale"
  | "watch"
  | "kill";

export type CreativeScalingEvidence =
  | "insufficient"
  | "developing"
  | "strong";

export interface CreativeScalingSettings {
  targetCpa: number;
  confidence: number;
  windowDays: CreativeScalingWindow;
  minPurchasesToScale: number;
  minEvidenceMultiple: number;
}

export interface CreativeScalingPoint {
  adId: string;
  adName: string;
  campaignName: string;
  adSetName: string;

  decision: CreativeScalingDecision;
  evidence: CreativeScalingEvidence;
  confidenceLabel: string;

  latestDate: string;
  windowStart: string;
  windowEnd: string;
  windowDays: number;

  yesterdaySpend: number;
  yesterdayImpressions: number;

  spend: number;
  revenue: number;
  purchases: number;
  modelledPurchases: number;
  impressions: number;

  cpa: number | null;
  roas: number;

  targetCpa: number;
  expectedPurchases: number;

  killProbability: number;
  scaleProbability: number;

  scaleBoundaryCpa: number | null;
  killBoundaryCpa: number | null;

  scaleDistancePct: number | null;
  killDistancePct: number | null;

  recommendedAction: string;
}

export interface CreativeScalingCurvePoint {
  spend: number;
  scaleCpa: number;
  killCpa: number;
}

export interface CreativeScalingThreshold {
  spend: number;
  scaleCpa: number;
  killCpa: number;
}

export interface CreativeScalingSummary {
  eligibleAds: number;

  scaleAds: number;
  watchAds: number;
  killAds: number;

  scaleSpend: number;
  watchSpend: number;
  killSpend: number;

  zeroPurchaseAds: number;
  classifiedSpend: number;
}

export interface CreativeScalingOutput {
  latestDate: string;
  windowStart: string;
  windowEnd: string;

  settings: CreativeScalingSettings;

  points: CreativeScalingPoint[];
  curves: CreativeScalingCurvePoint[];
  thresholds: CreativeScalingThreshold[];
  summary: CreativeScalingSummary;
}
