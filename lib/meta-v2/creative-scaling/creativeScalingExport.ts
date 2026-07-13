import type {
  CreativeScalingPoint,
} from "@/lib/meta-v2/creative-scaling/schema";

const HEADERS = [
  "classification",
  "evidence",
  "confidence",
  "ad_id",
  "ad_name",
  "campaign_name",
  "ad_set_name",
  "latest_active_date",
  "yesterday_spend",
  "yesterday_impressions",
  "window_start",
  "window_end",
  "window_days",
  "spend",
  "purchases",
  "revenue",
  "cpa",
  "roas",
  "target_cpa",
  "expected_purchases_at_target",
  "kill_probability",
  "scale_probability",
  "scale_boundary_cpa",
  "kill_boundary_cpa",
  "distance_to_scale_pct",
  "distance_to_kill_pct",
  "recommended_action",
] as const;

function csvValue(
  value:
    | string
    | number
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const text =
    String(value);

  if (
    /[",\n]/.test(text)
  ) {
    return `"${text.replace(
      /"/g,
      '""'
    )}"`;
  }

  return text;
}

export function buildCreativeScalingCsv(
  points: CreativeScalingPoint[]
) {
  const rows =
    points.map((point) => [
      point.decision,
      point.evidence,
      point.confidenceLabel,
      point.adId,
      point.adName,
      point.campaignName,
      point.adSetName,
      point.latestDate,
      point.yesterdaySpend,
      point.yesterdayImpressions,
      point.windowStart,
      point.windowEnd,
      point.windowDays,
      point.spend,
      point.purchases,
      point.revenue,
      point.cpa,
      point.roas,
      point.targetCpa,
      point.expectedPurchases,
      point.killProbability,
      point.scaleProbability,
      point.scaleBoundaryCpa,
      point.killBoundaryCpa,
      point.scaleDistancePct,
      point.killDistancePct,
      point.recommendedAction,
    ]);

  return [
    HEADERS.join(","),
    ...rows.map((row) =>
      row.map(csvValue).join(",")
    ),
  ].join("\n");
}
