import { MetaPerformanceRow, MetaSettings } from "@/types/meta";

const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

export interface BrainInsight {
  title: string;
  severity: "High" | "Medium" | "Low";
  type:
    | "Scale"
    | "Waste"
    | "Creative"
    | "Funnel"
    | "Budget"
    | "Profit"
    | "Testing"
    | "Strategy";
  insight: string;
  action: string;
  expectedImpact: string;
}

export interface MetaBrainOutput {
  accountVerdict: string;
  healthScore: number;
  scaleReadiness: string;
  biggestRisk: string;
  biggestOpportunity: string;
  immediateActions: BrainInsight[];
  budgetInsights: BrainInsight[];
  creativeInsights: BrainInsight[];
  funnelInsights: BrainInsight[];
  testingRoadmap: BrainInsight[];
  sevenDayPlan: string[];
  fourteenDayPlan: string[];
  thirtyDayPlan: string[];
  ninetyDayPlan: {
    phase: string;
    goal: string;
    actions: string[];
  }[];
}

export function runMetaBrain(
  rows: MetaPerformanceRow[],
  settings: MetaSettings
): MetaBrainOutput {
  const spend = rows.reduce((s, r) => s + r.spend, 0);
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const purchases = rows.reduce((s, r) => s + r.purchases, 0);
  const contribution = rows.reduce((s, r) => s + r.contributionAfterAds, 0);

  const roas = safeDiv(revenue, spend);
  const cpa = safeDiv(spend, purchases);
  const contributionMargin = safeDiv(contribution, revenue) * 100;

  const scaleRows = rows.filter((r) => r.decision === "Scale");
  const killRows = rows.filter((r) => r.decision === "Kill");
  const reduceRows = rows.filter((r) => r.decision === "Reduce");
  const refreshRows = rows.filter((r) => r.decision === "Refresh Creative");
  const testRows = rows.filter((r) => r.decision === "Test More");

  const wastedSpend =
    killRows.reduce((s, r) => s + r.spend, 0) +
    reduceRows.reduce((s, r) => s + r.spend * (settings.budgetReductionPct / 100), 0);

  const avgEfficiency = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.efficiencyScore, 0) / rows.length)
    : 0;

  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        avgEfficiency * 0.45 +
          (roas >= settings.targetRoas ? 25 : roas / settings.targetRoas * 25) +
          (contribution > 0 ? 20 : 0) +
          (scaleRows.length > 0 ? 10 : 0)
      )
    )
  );

  const accountVerdict =
    roas >= settings.targetRoas && contribution > 0
      ? "Account is profitable and ready for controlled scale. Focus on reallocating budget from waste to proven winners."
      : roas < settings.targetRoas && wastedSpend > spend * 0.15
      ? "Account has meaningful waste. Do not scale blindly. First recover inefficient spend, then redeploy into winners."
      : "Account is mixed. Keep spend stable, protect winners, and use testing budget to find the next scale pocket.";

  const scaleReadiness =
    scaleRows.length >= 3 && contribution > 0
      ? "High"
      : scaleRows.length > 0
      ? "Medium"
      : "Low";

  const biggestRisk =
    wastedSpend > spend * 0.2
      ? `High wasted budget risk: approx ₹${Math.round(wastedSpend).toLocaleString()} can be recovered.`
      : refreshRows.length > scaleRows.length
      ? "Creative fatigue risk: too many ads need refresh compared to scale-ready winners."
      : "Scale dependency risk: growth may depend on limited winners unless testing pipeline improves.";

  const biggestOpportunity =
    scaleRows.length > 0
      ? `${scaleRows.length} scale-ready pockets found. Shift recovered waste into these gradually.`
      : testRows.length > 0
      ? `${testRows.length} early test candidates found. They need controlled spend to validate.`
      : "Opportunity is in rebuilding creative testing and improving funnel conversion before scaling.";

  const immediateActions: BrainInsight[] = [];

  if (killRows.length) {
    immediateActions.push({
      title: "Pause clear waste",
      severity: "High",
      type: "Waste",
      insight: `${killRows.length} rows crossed kill threshold with poor or zero purchase output.`,
      action: "Pause these rows immediately and recover budget.",
      expectedImpact: "Improves blended ROAS by removing non-converting spend.",
    });
  }

  if (reduceRows.length) {
    immediateActions.push({
      title: "Reduce weak performers",
      severity: "High",
      type: "Budget",
      insight: `${reduceRows.length} rows have weak efficiency but some signal.`,
      action: `Reduce budget by ${settings.budgetReductionPct}% instead of killing immediately.`,
      expectedImpact: "Protects learning while reducing inefficient spend.",
    });
  }

  if (scaleRows.length) {
    immediateActions.push({
      title: "Scale proven winners",
      severity: "Medium",
      type: "Scale",
      insight: `${scaleRows.length} rows meet ROAS, CPA, purchase and contribution conditions.`,
      action: `Increase budget by ${settings.normalScaleIncreasePct}% and monitor marginal ROAS.`,
      expectedImpact: "Controlled revenue growth without breaking efficiency.",
    });
  }

  if (refreshRows.length) {
    immediateActions.push({
      title: "Refresh fatigued creatives",
      severity: "Medium",
      type: "Creative",
      insight: `${refreshRows.length} rows show fatigue signals.`,
      action: "Create fresh hooks, formats, testimonials, UGC and offer-led variants.",
      expectedImpact: "Protects CTR, CPA and delivery quality.",
    });
  }

  const budgetInsights: BrainInsight[] = [
    {
      title: "Recover before scaling",
      severity: wastedSpend > spend * 0.15 ? "High" : "Medium",
      type: "Budget",
      insight: `Estimated recoverable budget is ₹${Math.round(wastedSpend).toLocaleString()}.`,
      action: "Move recovered budget into scale candidates instead of adding fresh spend first.",
      expectedImpact: "Improves incremental efficiency and reduces wasted spend.",
    },
  ];

  const creativeInsights: BrainInsight[] = [
    {
      title: "Build creative diversity",
      severity: refreshRows.length ? "High" : "Medium",
      type: "Creative",
      insight: "The account should not depend on minor creative iterations only.",
      action: "Create separate creative angles: problem-solution, proof, offer, comparison, founder/UGC, testimonial and routine-based ads.",
      expectedImpact: "Higher probability of stable scale across TOF/MOF/BOF.",
    },
  ];

  const funnelWeakRows = rows.filter((r) => r.funnelHealthScore < 50);
  const funnelInsights: BrainInsight[] = [
    {
      title: "Fix funnel leakage",
      severity: funnelWeakRows.length ? "High" : "Low",
      type: "Funnel",
      insight: `${funnelWeakRows.length} rows show weak funnel health.`,
      action: "Check CTR, LPV rate, ATC rate, checkout rate and purchase CVR to locate the biggest drop.",
      expectedImpact: "Improves ROAS without increasing media spend.",
    },
  ];

  const testingRoadmap: BrainInsight[] = [
    {
      title: "Next testing system",
      severity: "Medium",
      type: "Testing",
      insight: "Scaling will break without fresh winner creation.",
      action: "Launch weekly tests across 3 new hooks, 2 new offers, 2 formats and 1 landing page angle.",
      expectedImpact: "Creates a repeatable pipeline of new winners.",
    },
  ];

  return {
    accountVerdict,
    healthScore,
    scaleReadiness,
    biggestRisk,
    biggestOpportunity,
    immediateActions,
    budgetInsights,
    creativeInsights,
    funnelInsights,
    testingRoadmap,
    sevenDayPlan: [
      "Pause kill candidates.",
      "Reduce weak but not fully broken performers.",
      "Protect stable winners.",
      "Refresh fatigued creatives.",
      "Move recovered budget into scale candidates gradually.",
    ],
    fourteenDayPlan: [
      "Validate emerging winners with controlled test budget.",
      "Launch new creative angles based on winning hooks.",
      "Review marginal ROAS after every budget increase.",
      "Fix the weakest funnel stage.",
    ],
    thirtyDayPlan: [
      "Build a weekly creative testing rhythm.",
      "Separate winners, tests and remarketing logic.",
      "Track contribution after ads, not just ROAS.",
      "Create budget rules for scale, reduce and kill decisions.",
    ],
    ninetyDayPlan: [
      {
        phase: "Days 1–30: Fix & Stabilize",
        goal: "Remove waste and identify real winners.",
        actions: [
          "Kill waste.",
          "Reduce inefficient pockets.",
          "Protect winners.",
          "Fix funnel leakage.",
          "Refresh fatigued creatives.",
        ],
      },
      {
        phase: "Days 31–60: Scale Winners",
        goal: "Increase spend while protecting marginal efficiency.",
        actions: [
          "Scale proven winners slowly.",
          "Expand winning creative angles.",
          "Test stronger offers.",
          "Track marginal ROAS and marginal CPA.",
        ],
      },
      {
        phase: "Days 61–90: Build Growth System",
        goal: "Create a repeatable Meta growth machine.",
        actions: [
          "Set weekly creative testing cadence.",
          "Build creative angle library.",
          "Create budget reallocation rhythm.",
          "Reduce dependency on single winners.",
        ],
      },
    ],
  };
}
