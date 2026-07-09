import type { MetaV2Settings, MetaV2Totals } from "@/lib/meta-v2/schema";
import { safeDiv } from "@/lib/meta-v2/calculationCore";

export type MetaV2EngineAction =
  | "scale"
  | "hold"
  | "watch"
  | "reduce"
  | "kill"
  | "refresh"
  | "test_more";

export type MetaV2EngineSeverity = "critical" | "high" | "medium" | "low";

export interface MetaV2DecisionResult {
  action: MetaV2EngineAction;
  severity: MetaV2EngineSeverity;
  wasteScore: number;
  scaleScore: number;
  reason: string;
  nextStep: string;
}

export function hasDecisionSpend(
  totals: Pick<MetaV2Totals, "spend">,
  settings: MetaV2Settings
): boolean {
  return totals.spend >= settings.minSpendForDecision;
}

export function hasScaleVolume(
  totals: Pick<MetaV2Totals, "purchases">,
  settings: MetaV2Settings
): boolean {
  return totals.purchases >= settings.minPurchasesForScale;
}

export function getMetaV2WasteScore(
  totals: MetaV2Totals,
  settings: MetaV2Settings
): number {
  let score = 0;

  if (hasDecisionSpend(totals, settings) && totals.purchases <= 0) score += 45;
  if (totals.spend > 0 && totals.roas < settings.targetRoas * 0.5) score += 20;
  if (totals.purchases > 0 && totals.cpa > settings.targetCpa) score += 18;
  if (totals.gpt < settings.targetGpt) score += 10;
  if (totals.frequency > settings.maxHealthyFrequency) score += 7;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getMetaV2ScaleScore(
  totals: MetaV2Totals,
  settings: MetaV2Settings
): number {
  let score = 0;

  if (hasDecisionSpend(totals, settings)) score += 15;
  if (hasScaleVolume(totals, settings)) score += 20;
  if (totals.roas >= settings.targetRoas) score += 25;
  if (totals.purchases > 0 && totals.cpa <= settings.targetCpa) score += 20;
  if (totals.gpt >= settings.targetGpt) score += 10;
  if (totals.frequency > 0 && totals.frequency <= settings.maxHealthyFrequency) score += 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getMetaV2SeverityFromWasteScore(
  wasteScore: number
): MetaV2EngineSeverity {
  if (wasteScore >= 80) return "critical";
  if (wasteScore >= 60) return "high";
  if (wasteScore >= 35) return "medium";
  return "low";
}

export function getMetaV2SeverityFromSpend(
  spend: number
): Exclude<MetaV2EngineSeverity, "low"> {
  if (spend >= 10000) return "critical";
  if (spend >= 5000) return "high";
  return "medium";
}

export function getMetaV2Action(
  totals: MetaV2Totals,
  settings: MetaV2Settings
): MetaV2EngineAction {
  if (hasDecisionSpend(totals, settings) && totals.purchases <= 0) {
    return "kill";
  }

  if (
    hasDecisionSpend(totals, settings) &&
    totals.frequency > settings.maxHealthyFrequency
  ) {
    return "refresh";
  }

  if (
    hasDecisionSpend(totals, settings) &&
    totals.purchases > 0 &&
    (totals.cpa > settings.targetCpa || totals.roas < settings.targetRoas * 0.75)
  ) {
    return "reduce";
  }

  if (
    hasDecisionSpend(totals, settings) &&
    hasScaleVolume(totals, settings) &&
    totals.roas >= settings.targetRoas &&
    totals.cpa > 0 &&
    totals.cpa <= settings.targetCpa &&
    totals.gpt >= settings.targetGpt
  ) {
    return "scale";
  }

  if (!hasDecisionSpend(totals, settings) && totals.spend > 0) {
    return "test_more";
  }

  if (totals.spend > 0) {
    return "watch";
  }

  return "hold";
}

export function getMetaV2DecisionReason(
  totals: MetaV2Totals,
  settings: MetaV2Settings,
  action: MetaV2EngineAction
): string {
  if (action === "kill") {
    return "Spend crossed decision threshold with zero purchases.";
  }

  if (action === "refresh") {
    return "Frequency is above the healthy limit, creating creative fatigue risk.";
  }

  if (action === "reduce") {
    if (totals.cpa > settings.targetCpa) {
      return "CPA is above target and is reducing account efficiency.";
    }

    return "ROAS is below the required efficiency threshold.";
  }

  if (action === "scale") {
    return "Spend, purchase volume, ROAS, CPA, GPT, and frequency are inside scale conditions.";
  }

  if (action === "test_more") {
    return "Spend exists but has not crossed the minimum decision threshold.";
  }

  if (action === "watch") {
    return "Performance is not bad enough to cut and not strong enough to scale.";
  }

  return "No active spend signal requires action.";
}

export function getMetaV2NextStep(
  action: MetaV2EngineAction,
  settings: MetaV2Settings
): string {
  if (action === "kill") {
    return "Pause or exclude from active budget until a new creative, offer, or landing-page fix exists.";
  }

  if (action === "refresh") {
    return "Refresh creative or rotate the ad before increasing budget.";
  }

  if (action === "reduce") {
    return `Reduce budget by ${settings.reduceBudgetPct}% and recheck marginal CPA after 72 hours.`;
  }

  if (action === "scale") {
    return `Increase budget by ${settings.scaleIncreasePct}% while monitoring CPA and frequency.`;
  }

  if (action === "test_more") {
    return "Collect more spend and conversion data before making a hard decision.";
  }

  if (action === "watch") {
    return "Hold budget stable and monitor next 2–3 days.";
  }

  return "No action required.";
}

export function getMetaV2Decision(
  totals: MetaV2Totals,
  settings: MetaV2Settings
): MetaV2DecisionResult {
  const action = getMetaV2Action(totals, settings);
  const wasteScore = getMetaV2WasteScore(totals, settings);
  const scaleScore = getMetaV2ScaleScore(totals, settings);

  return {
    action,
    severity: getMetaV2SeverityFromWasteScore(wasteScore),
    wasteScore,
    scaleScore,
    reason: getMetaV2DecisionReason(totals, settings, action),
    nextStep: getMetaV2NextStep(action, settings),
  };
}

export function getMetaV2SpendShare(spend: number, totalSpend: number): number {
  return safeDiv(spend, totalSpend) * 100;
}

export function getMetaV2RevenueShare(revenue: number, totalRevenue: number): number {
  return safeDiv(revenue, totalRevenue) * 100;
}
