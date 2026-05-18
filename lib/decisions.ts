import { DecisionTag, RiskLevel, MetaSettings } from "@/types/meta";

type DecisionInput = {
  spend: number;
  purchases: number;
  roas: number;
  cpa: number;
  frequency: number;
  contributionAfterAds: number;
  scaleScore: number;
  wasteScore: number;
  fatigueScore: number;
  funnelHealthScore: number;
  efficiencyScore?: number;
};

export function getDecision(row: DecisionInput, s: MetaSettings): {
  decision: DecisionTag;
  reason: string;
  action: string;
  risk: RiskLevel;
} {
  const killSpend = s.targetCpa * s.killThresholdCpaMultiple;

  if (row.spend >= killSpend && row.purchases === 0) {
    return {
      decision: "Kill",
      reason: "Spend crossed kill threshold with zero purchases.",
      action: "Pause immediately or exclude from active budget.",
      risk: "Low",
    };
  }

  if (row.wasteScore >= 75) {
    return {
      decision: "Reduce",
      reason: "High waste score due to weak ROAS, CPA or negative contribution.",
      action: `Reduce budget by ${s.budgetReductionPct}%.`,
      risk: "Low",
    };
  }

  if (row.fatigueScore >= 70) {
    return {
      decision: "Refresh Creative",
      reason: "Fatigue signal is high based on frequency, CTR, CPA and ROAS.",
      action: "Prepare new creative angle before scaling further.",
      risk: "Medium",
    };
  }

  if (
    row.scaleScore >= 75 &&
    row.roas >= s.targetRoas &&
    row.cpa <= s.targetCpa &&
    row.purchases >= s.minPurchasesForScale &&
    row.contributionAfterAds > 0
  ) {
    return {
      decision: "Scale",
      reason: "ROAS, CPA, purchase volume and contribution are strong.",
      action: `Increase budget by ${s.normalScaleIncreasePct}% and monitor marginal ROAS.`,
      risk: "Medium",
    };
  }

  if (row.spend < s.minSpendForDecision && row.funnelHealthScore >= 60) {
    return {
      decision: "Test More",
      reason: "Early funnel signals are promising but spend is still low.",
      action: "Allow more spend before making a final decision.",
      risk: "Medium",
    };
  }

  if (row.spend < s.minSpendForDecision) {
    return {
      decision: "Watch",
      reason: "Not enough spend for a strong decision.",
      action: "Keep monitoring until minimum decision spend is reached.",
      risk: "High",
    };
  }

  return {
    decision: "Hold",
    reason: "Performance is not clearly strong enough to scale or weak enough to cut.",
    action: "Keep budget stable and review again after more data.",
    risk: "Medium",
  };
}
