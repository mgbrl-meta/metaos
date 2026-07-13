import type {
  MetaV2CleanRow,
  MetaV2CommandCenterOutput,
  MetaV2Settings,
} from "@/lib/meta-v2/schema";
import { getMetaV2LatestDate } from "@/lib/meta-v2/engineUtils";
import { calculateMetaV2Totals } from "@/lib/meta-v2/metrics";
import { getMetaV2Decision } from "@/lib/meta-v2/decisionRules";

export function buildMetaV2CommandCenter(
  rows: MetaV2CleanRow[],
  settings: MetaV2Settings,
  syncedAt = ""
): MetaV2CommandCenterOutput {
  const totals = calculateMetaV2Totals(rows);
  const latestDate = getMetaV2LatestDate(rows);
  const decisions = rows.map((row) => getMetaV2Decision(row, settings));

  const scaleCount = decisions.filter((decision) => decision.action === "scale").length;
  const reduceCount = decisions.filter((decision) => decision.action === "reduce").length;
  const killCount = decisions.filter((decision) => decision.action === "kill").length;
  const refreshCount = decisions.filter((decision) => decision.action === "refresh").length;
  const watchCount = decisions.filter(
    (decision) =>
      decision.action === "watch" ||
      decision.action === "hold" ||
      decision.action === "test_more"
  ).length;

  const totalDecisionRows = Math.max(1, decisions.length);
  const averageWasteScore =
    decisions.reduce((sum, decision) => sum + decision.wasteScore, 0) / totalDecisionRows;
  const averageScaleScore =
    decisions.reduce((sum, decision) => sum + decision.scaleScore, 0) / totalDecisionRows;

  const roasScore = Math.min(35, (totals.roas / settings.targetRoas) * 35);
  const cpaScore =
    totals.cpa > 0 ? Math.min(25, (settings.targetCpa / totals.cpa) * 25) : 0;
  const gptScore = totals.gpt >= settings.targetGpt ? 15 : 5;
  const decisionScore = Math.max(0, Math.min(25, averageScaleScore * 0.25 - averageWasteScore * 0.1));

  const healthScore = Math.round(
    Math.max(0, Math.min(100, roasScore + cpaScore + gptScore + decisionScore))
  );

  const scaleReadiness =
    scaleCount >= 5 && healthScore >= 75
      ? "High"
      : scaleCount >= 2
        ? "Medium"
        : "Low";

  const verdict =
    totals.roas >= settings.targetRoas && scaleCount > 0
      ? "Account has scale-ready pockets. Recover waste first, then increase winner budgets gradually."
      : killCount > 0 || reduceCount > 0
        ? "Account has visible waste. Do not scale blindly; cut or reduce inefficient pockets before adding budget."
        : "Account is stable but needs stronger winners and better creative depth before aggressive scaling.";

  const biggestRisk =
    killCount > 0
      ? `${killCount} active rows have spend with zero purchases.`
      : refreshCount > 0
        ? `${refreshCount} rows show fatigue risk due to high frequency.`
        : "Winner depth is limited; avoid dependency on one ad or campaign.";

  const biggestOpportunity =
    scaleCount > 0
      ? `${scaleCount} rows qualify for controlled scale.`
      : "Opportunity is in creative testing, funnel improvement, and cleaner budget allocation.";

  return {
    status: {
      isLive: rows.length > 0,
      latestDate,
      rowCount: rows.length,
      syncedAt,
    },
    totals,
    healthScore,
    scaleReadiness,
    verdict,
    biggestRisk,
    biggestOpportunity,
    actionCounts: {
      scale: scaleCount,
      reduce: reduceCount,
      kill: killCount,
      refresh: refreshCount,
      watch: watchCount,
    },
  };
}
