import { MetaSettings } from "@/types/meta";

type Row = {
  spend: number;
  revenue: number;
  purchases: number;
  roas: number;
  cpa: number;
  ctr: number;
  frequency: number;
  lpvRate: number;
  atcRate: number;
  checkoutRate: number;
  purchaseCvr: number;
  contributionAfterAds: number;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function getScaleScore(row: Row, s: MetaSettings) {
  let score = 0;
  if (row.roas >= s.targetRoas) score += 25;
  if (row.cpa > 0 && row.cpa <= s.targetCpa) score += 20;
  if (row.purchases >= s.minPurchasesForScale) score += 20;
  if (row.spend >= s.minSpendForDecision) score += 10;
  if (row.frequency <= s.maxHealthyFrequency) score += 10;
  if (row.contributionAfterAds > 0) score += 15;
  return clamp(score);
}

export function getWasteScore(row: Row, s: MetaSettings) {
  let score = 0;
  if (row.spend >= s.minSpendForDecision && row.purchases === 0) score += 40;
  if (row.roas < s.targetRoas * 0.6) score += 25;
  if (row.cpa > s.targetCpa && row.cpa > 0) score += 20;
  if (row.contributionAfterAds < 0) score += 15;
  return clamp(score);
}

export function getFatigueScore(row: Row, s: MetaSettings) {
  let score = 0;
  if (row.frequency > s.maxHealthyFrequency) score += 40;
  if (row.ctr < s.targetCtrPct) score += 25;
  if (row.cpa > s.targetCpa && row.cpa > 0) score += 20;
  if (row.roas < s.targetRoas) score += 15;
  return clamp(score);
}

export function getFunnelHealthScore(row: Row, s: MetaSettings) {
  let score = 0;
  if (row.ctr >= s.targetCtrPct) score += 20;
  if (row.lpvRate >= s.targetClickToLpvRatePct) score += 20;
  if (row.atcRate >= s.targetLpvToAtcRatePct) score += 20;
  if (row.checkoutRate >= s.targetAtcToCheckoutRatePct) score += 20;
  if (row.purchaseCvr > 0) score += 20;
  return clamp(score);
}

export function getEfficiencyScore(row: Row, s: MetaSettings) {
  let score = 0;
  if (row.roas >= s.targetRoas) score += 30;
  if (row.cpa > 0 && row.cpa <= s.targetCpa) score += 25;
  if (row.contributionAfterAds > 0) score += 25;
  if (row.purchases >= s.minPurchasesForScale) score += 20;
  return clamp(score);
}
