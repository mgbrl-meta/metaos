import { MetaPerformanceRow, MetaSettings } from "@/types/meta";

const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);
const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);

export interface ReportSection {
  title: string;
  body: string[];
}

export interface StrategyMemo {
  title: string;
  subtitle: string;
  sections: ReportSection[];
}

export function generateStrategyMemo(
  rows: MetaPerformanceRow[],
  settings: MetaSettings
): StrategyMemo {
  const spend = rows.reduce((s, r) => s + r.spend, 0);
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const purchases = rows.reduce((s, r) => s + r.purchases, 0);
  const contribution = rows.reduce((s, r) => s + r.contributionAfterAds, 0);

  const roas = safeDiv(revenue, spend);
  const cpa = safeDiv(spend, purchases);
  const aov = safeDiv(revenue, purchases);
  const contributionMargin = safeDiv(contribution, revenue) * 100;

  const scaleRows = rows.filter((r) => r.decision === "Scale");
  const killRows = rows.filter((r) => r.decision === "Kill");
  const reduceRows = rows.filter((r) => r.decision === "Reduce");
  const refreshRows = rows.filter((r) => r.decision === "Refresh Creative");
  const testRows = rows.filter((r) => r.decision === "Test More");

  const wastedSpend =
    killRows.reduce((s, r) => s + r.spend, 0) +
    reduceRows.reduce((s, r) => s + r.spend * (settings.budgetReductionPct / 100), 0);

  const topSpendRows = [...rows].sort((a, b) => b.spend - a.spend).slice(0, 5);
  const topRevenueRows = [...rows].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const topScaleRows = [...scaleRows].sort((a, b) => b.scaleScore - a.scaleScore).slice(0, 5);
  const topWasteRows = [...rows].sort((a, b) => b.wasteScore - a.wasteScore).slice(0, 5);
  const topFatigueRows = [...rows].sort((a, b) => b.fatigueScore - a.fatigueScore).slice(0, 5);

  const spendConcentration = safeDiv(
    topSpendRows.reduce((s, r) => s + r.spend, 0),
    spend
  ) * 100;

  const revenueConcentration = safeDiv(
    topRevenueRows.reduce((s, r) => s + r.revenue, 0),
    revenue
  ) * 100;

  const avgScaleScore = avg(rows.map((r) => r.scaleScore));
  const avgWasteScore = avg(rows.map((r) => r.wasteScore));
  const avgFatigueScore = avg(rows.map((r) => r.fatigueScore));
  const avgFunnelHealth = avg(rows.map((r) => r.funnelHealthScore));
  const avgEfficiency = avg(rows.map((r) => r.efficiencyScore));

  const accountVerdict =
    roas >= settings.targetRoas && contribution > 0
      ? "The account is currently efficient and can be scaled carefully. The next move should be controlled budget expansion into proven winners while monitoring marginal ROAS and CPA."
      : wastedSpend > spend * 0.15
      ? "The account has material waste. Scaling directly from here will likely dilute efficiency. The priority should be waste recovery, creative refresh, and then controlled reallocation into winners."
      : "The account is in a mixed state. It has some workable pockets, but the scale system needs stronger winner depth, better creative pipeline, and tighter budget movement.";

  const scaleReadiness =
    scaleRows.length >= 5 && avgEfficiency >= 70
      ? "High"
      : scaleRows.length >= 2
      ? "Medium"
      : "Low";

  const confidence =
    spend > 0 && purchases >= settings.minPurchasesForScale * 3
      ? "High"
      : spend > 0 && purchases > 0
      ? "Medium"
      : "Low";

  return {
    title: "Meta Paid Media Strategy Memo",
    subtitle: "AI-generated growth diagnosis and action plan",
    sections: [
      {
        title: "1. Executive Summary",
        body: [
          accountVerdict,
          `Total spend was ${money(spend)}, generating ${money(revenue)} revenue at ${num(roas)} ROAS.`,
          `CPA was ${money(cpa)}, AOV was ${money(aov)}, and contribution after ads was ${money(contribution)}.`,
          `Scale readiness is ${scaleReadiness}. Analysis confidence is ${confidence}.`,
        ],
      },
      {
        title: "2. Data Scope & Quality",
        body: [
          `The analysis is based on ${rows.length.toLocaleString()} Meta rows.`,
          `Detected ${scaleRows.length} scale candidates, ${reduceRows.length} reduce candidates, ${killRows.length} kill candidates, ${refreshRows.length} creative refresh candidates, and ${testRows.length} test-more candidates.`,
          `Current average efficiency score is ${Math.round(avgEfficiency)}/100, funnel health is ${Math.round(avgFunnelHealth)}/100, waste score is ${Math.round(avgWasteScore)}/100, and fatigue score is ${Math.round(avgFatigueScore)}/100.`,
        ],
      },
      {
        title: "3. Business Baseline",
        body: [
          `ROAS: ${num(roas)} vs target ${settings.targetRoas}.`,
          `CPA: ${money(cpa)} vs target ${money(settings.targetCpa)}.`,
          `Contribution margin after ads: ${pct(contributionMargin)}.`,
          roas >= settings.targetRoas
            ? "ROAS is above target, but scaling should still be controlled through marginal efficiency checks."
            : "ROAS is below target, so the account should not be scaled aggressively until waste is reduced.",
        ],
      },
      {
        title: "4. Scale Readiness Diagnosis",
        body: [
          `Scale readiness is ${scaleReadiness}.`,
          `Average scale score is ${Math.round(avgScaleScore)}/100.`,
          scaleRows.length > 0
            ? `There are ${scaleRows.length} rows that qualify for controlled scale. These should receive incremental budget increases, not sudden large jumps.`
            : "There are no strong scale-ready rows yet. The account needs better creative and funnel signals before meaningful scaling.",
          "Scaling rule: add budget only where ROAS, CPA, contribution, purchase volume, and fatigue are all acceptable.",
        ],
      },
      {
        title: "5. Waste Recovery Plan",
        body: [
          `Estimated recoverable budget is ${money(wastedSpend)}.`,
          wastedSpend > spend * 0.15
            ? "Waste recovery is a major lever. The first growth move should be to cut inefficient spend before adding new budget."
            : "Waste is present but not the primary bottleneck. Focus should be on controlled scaling and creative testing.",
          "Recovered budget should be redeployed into scale candidates and test candidates in a controlled manner.",
        ],
      },
      {
        title: "6. Budget Concentration Risk",
        body: [
          `Top 5 spend rows consume ${pct(spendConcentration)} of total spend.`,
          `Top 5 revenue rows contribute ${pct(revenueConcentration)} of total revenue.`,
          spendConcentration > 60
            ? "Spend concentration is high. The account may be too dependent on a small number of ads/ad sets."
            : "Spend concentration is acceptable, but winner depth should still be improved.",
          "A healthy account should have multiple winners, not one hero ad carrying performance.",
        ],
      },
      {
        title: "7. Winner Analysis",
        body: topScaleRows.length
          ? topScaleRows.map(
              (r, i) =>
                `${i + 1}. ${r.adName} — ROAS ${num(r.roas)}, CPA ${money(r.cpa)}, purchases ${num(r.purchases, 0)}, scale score ${r.scaleScore}/100. Recommended action: ${r.action}`
            )
          : ["No strong winners identified yet. Focus on testing new creative concepts and improving funnel quality."],
      },
      {
        title: "8. Waste Analysis",
        body: topWasteRows.length
          ? topWasteRows.map(
              (r, i) =>
                `${i + 1}. ${r.adName} — spend ${money(r.spend)}, ROAS ${num(r.roas)}, CPA ${money(r.cpa)}, waste score ${r.wasteScore}/100. Recommended action: ${r.action}`
            )
          : ["No major waste rows detected."],
      },
      {
        title: "9. Creative Fatigue & Refresh Plan",
        body: [
          `Average fatigue score is ${Math.round(avgFatigueScore)}/100.`,
          refreshRows.length
            ? `${refreshRows.length} rows show fatigue or refresh signals. These should not be scaled further without fresh creative.`
            : "No major fatigue signal found yet, but new creative pipeline is still needed to protect future scale.",
          ...topFatigueRows.slice(0, 3).map(
            (r, i) =>
              `${i + 1}. ${r.adName} — frequency ${num(r.frequency)}, CTR ${num(r.ctr)}%, fatigue score ${r.fatigueScore}/100.`
          ),
          "Recommended creative pipeline: testimonial ads, UGC-style proof ads, problem-solution ads, comparison ads, founder/expert ads, offer-led static ads, and routine-based ads.",
        ],
      },
      {
        title: "10. Funnel Diagnosis",
        body: [
          `Average funnel health score is ${Math.round(avgFunnelHealth)}/100.`,
          avgFunnelHealth >= 70
            ? "Funnel is broadly healthy. The next growth lever is creative and budget allocation."
            : avgFunnelHealth >= 50
            ? "Funnel is usable but has leakage. Find whether the drop is at CTR, LPV, ATC, checkout, or purchase."
            : "Funnel health is weak. Scaling media without fixing the funnel can increase spend without proportional revenue.",
          "Funnel diagnosis should be read stage-wise: low CTR = creative issue, low LPV = traffic/site speed issue, low ATC = PDP/offer issue, low checkout = trust/pricing/shipping issue, low purchase = payment/final price friction.",
        ],
      },
      {
        title: "11. Better Parameters To Track Going Forward",
        body: [
          "Marginal ROAS: ROAS on the next layer of spend, not total account ROAS.",
          "Marginal CPA: CPA after budget increases, not historical CPA.",
          "Waste recovery rate: how much inefficient spend was removed and redeployed.",
          "Winner depth: number of ads/ad sets that can scale, not just one best ad.",
          "Creative freshness ratio: percentage of spend going to non-fatigued creatives.",
          "Spend concentration: dependency on top 5 ads/ad sets.",
          "Contribution after ads: revenue × gross margin minus ad spend.",
          "Funnel leakage score: biggest conversion drop from impression to purchase.",
          "Scale safety score: scale score minus fatigue and waste risk.",
          "Testing velocity: number of meaningful new creative concepts tested weekly.",
        ],
      },
      {
        title: "12. Immediate Action Plan",
        body: [
          killRows.length ? `Pause ${killRows.length} kill candidates.` : "No immediate kill candidates found.",
          reduceRows.length ? `Reduce budget on ${reduceRows.length} weak performers.` : "No major reduce candidates found.",
          scaleRows.length ? `Scale ${scaleRows.length} proven candidates by ${settings.normalScaleIncreasePct}% initially.` : "Do not scale yet; first create stronger winners.",
          refreshRows.length ? `Refresh ${refreshRows.length} fatigued creatives.` : "Keep creative refresh pipeline active even if fatigue is not yet severe.",
          "Review results after 3 days and check marginal ROAS before further scaling.",
        ],
      },
      {
        title: "13. 7-Day Plan",
        body: [
          "Day 1: Kill clear waste and reduce inefficient spend.",
          "Day 2: Reallocate recovered budget into strongest scale candidates.",
          "Day 3: Launch new creative concepts based on winning signals.",
          "Day 4: Review funnel leakage and landing page/PDP issues.",
          "Day 5: Check marginal CPA and ROAS after budget movements.",
          "Day 6: Refresh ads showing fatigue.",
          "Day 7: Freeze winners, kill failed tests, and plan next test batch.",
        ],
      },
      {
        title: "14. 30-Day Roadmap",
        body: [
          "Week 1: Clean waste and stabilize account efficiency.",
          "Week 2: Scale proven winners with controlled budget increases.",
          "Week 3: Launch structured creative tests across hooks, formats, offers, and proof.",
          "Week 4: Build repeatable budget rules and creative testing cadence.",
        ],
      },
      {
        title: "15. 90-Day Growth Plan",
        body: [
          "Days 1–30: Fix and stabilize. Remove waste, protect winners, improve funnel, and build first creative testing system.",
          "Days 31–60: Scale winners. Expand winning angles, improve offer tests, increase budget gradually, and track marginal ROAS.",
          "Days 61–90: Build growth system. Create a weekly testing cadence, reduce dependency on one winner, build creative angle library, and run budget reallocation rhythm.",
        ],
      },
      {
        title: "16. Risks & Confidence",
        body: [
          `Analysis confidence: ${confidence}.`,
          scaleReadiness === "Low"
            ? "Primary risk: account does not yet have enough scalable winners."
            : "Primary risk: scaling too quickly may reduce marginal efficiency.",
          wastedSpend > spend * 0.15
            ? "Secondary risk: waste can hide true account potential if not removed."
            : "Secondary risk: creative fatigue may emerge as spend increases.",
          "Recommendation: scale with incremental efficiency discipline, not emotional budget jumps.",
        ],
      },
    ],
  };
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0) / values.length;
}
