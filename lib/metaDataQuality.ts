export type MetaQcSeverity = "critical" | "warning" | "info";

export type MetaQcFlag = {
  code: string;
  severity: MetaQcSeverity;
  message: string;
  field?: string;
};

export type MetaQcRow = Record<string, any> & {
  __qc?: {
    flags: MetaQcFlag[];
    shiftedPurchaseRow: boolean;
    normalized: boolean;
  };
};

export type MetaQcSummary = {
  rowsChecked: number;
  cleanRows: number;
  rowsWithWarnings: number;
  rowsWithCritical: number;
  shiftedRowsFixed: number;
  roasMismatchRows: number;
  revenueWithZeroPurchaseRows: number;
  purchaseWithZeroRevenueRows: number;
  suspiciousRows: MetaQcRow[];
};

const NUMERIC_FIELDS = [
  "impressions",
  "reach",
  "frequency",
  "spend",
  "cpm",
  "cpc",
  "costPerResult",
  "clicks",
  "linkClicks",
  "outboundClicks",
  "ctrAll",
  "ctr",
  "landingPageViews",
  "addsToCart",
  "checkoutsInitiated",
  "addsPaymentInfo",
  "purchases",
  "revenue",
  "reportedRoas",
];

function firstValue(row: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return "";
}

export function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .replace(/%/g, "")
    .trim();

  if (!cleaned) return 0;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function isNonNumeric(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .replace(/%/g, "")
    .trim();

  if (!cleaned) return false;
  return !Number.isFinite(Number(cleaned));
}

function pctMaybe(value: unknown) {
  const n = toNumber(value);
  return n > 1 ? n / 100 : n;
}

function safeDiv(a: number, b: number) {
  return b > 0 ? a / b : 0;
}

function dateValue(row: Record<string, any>) {
  return String(
    firstValue(row, [
      "date",
      "day",
      "Day",
      "Date",
      "Reporting_starts",
      "Reporting starts",
      "Reporting Starts",
    ]) || ""
  ).trim();
}

function getRawFields(row: Record<string, any>) {
  return {
    date: dateValue(row),

    campaignId: String(firstValue(row, ["campaignId", "campaign_id", "Campaign_ID", "Campaign ID"]) || ""),
    campaignName: String(firstValue(row, ["campaignName", "campaign_name", "Campaign_name", "Campaign name"]) || "Unknown Campaign"),

    adSetId: String(firstValue(row, ["adSetId", "adsetId", "adset_id", "Ad_set_ID", "Ad set ID"]) || ""),
    adSetName: String(firstValue(row, ["adSetName", "adsetName", "adset_name", "Ad_set_name", "Ad set name"]) || "Unknown Ad Set"),

    adId: String(firstValue(row, ["adId", "ad_id", "Ad_ID", "Ad ID"]) || ""),
    adName: String(firstValue(row, ["adName", "ad_name", "Ad_name", "Ad name"]) || "Unknown Ad"),

    creativeName: String(firstValue(row, ["creativeName", "creative_name", "Creative_Name_", "Creative name"]) || ""),

    objective: String(firstValue(row, ["objective", "Objective"]) || ""),

    impressionsRaw: firstValue(row, ["impressions", "Impressions"]),
    reachRaw: firstValue(row, ["reach", "Reach"]),
    frequencyRaw: firstValue(row, ["frequency", "Frequency"]),
    spendRaw: firstValue(row, ["spend", "amountSpent", "amount_spent", "Amount_spent__INR_", "Amount spent (INR)"]),
    cpmRaw: firstValue(row, ["cpm", "CPM__cost_per_1_000_impressions_", "CPM (cost per 1,000 impressions)"]),
    cpcRaw: firstValue(row, ["cpc", "CPC__cost_per_link_click_", "CPC (cost per link click)"]),
    costPerResultRaw: firstValue(row, ["costPerResult", "Cost_per_result", "Cost per result"]),

    clicksRaw: firstValue(row, ["clicks", "Clicks__all_", "Clicks (all)"]),
    linkClicksRaw: firstValue(row, ["linkClicks", "link_clicks", "Link_clicks", "Link clicks"]),
    outboundClicksRaw: firstValue(row, ["outboundClicks", "outbound_clicks", "Outbound_clicks", "Outbound clicks"]),
    ctrAllRaw: firstValue(row, ["ctrAll", "CTR__all_", "CTR (all)"]),
    ctrRaw: firstValue(row, ["ctr", "ctrLink", "CTR__link_click_through_rate_", "CTR (link click-through rate)"]),

    landingPageViewsRaw: firstValue(row, ["landingPageViews", "Landing_page_views", "Landing page views"]),
    addsToCartRaw: firstValue(row, ["addsToCart", "addToCart", "Adds_to_cart", "Adds to cart"]),
    checkoutsInitiatedRaw: firstValue(row, ["checkoutsInitiated", "Checkouts_initiated", "Checkouts initiated"]),
    addsPaymentInfoRaw: firstValue(row, ["addsPaymentInfo", "Adds_of_payment_info", "Adds of payment info"]),

    purchasesRaw: firstValue(row, ["purchases", "Purchases"]),
    revenueRaw: firstValue(row, ["revenue", "purchaseValue", "purchase_value", "Purchases_conversion_value", "Purchases conversion value"]),
    reportedRoasRaw: firstValue(row, ["reportedRoas", "Purchase_ROAS__return_on_ad_spend_", "Purchase ROAS (return on ad spend)"]),

    videoPlaysRaw: firstValue(row, ["videoPlays", "Video_plays", "Video plays"]),
    threeSecondVideoPlaysRaw: firstValue(row, ["threeSecondVideoPlays", "_3_second_video_plays", "3-second video plays"]),
    videoAveragePlayTimeRaw: firstValue(row, ["videoAveragePlayTime", "Video_average_play_time__in_seconds_", "Video average play time"]),
    thruPlaysRaw: firstValue(row, ["thruPlays", "ThruPlays"]),
  };
}

function isShiftedPurchaseRow(raw: ReturnType<typeof getRawFields>) {
  const value = String(raw.costPerResultRaw || "").toLowerCase();
  return isNonNumeric(raw.costPerResultRaw) && value.includes("purchase");
}

export function normalizeMetaRow(row: Record<string, any>): MetaQcRow {
  const raw = getRawFields(row);
  const flags: MetaQcFlag[] = [];
  const shifted = isShiftedPurchaseRow(raw);

  let normalized: MetaQcRow;

  if (shifted) {
    flags.push({
      code: "SHIFTED_PURCHASE_ROW",
      severity: "critical",
      field: "Cost per result",
      message:
        "Copy/paste column shift detected. Text like Website purchases appeared inside numeric Cost per result. Row was corrected before calculations.",
    });

    normalized = {
      ...row,

      date: raw.date,
      day: raw.date,

      campaignId: raw.campaignId,
      campaignName: raw.campaignName,
      campaign_id: raw.campaignId,
      campaign_name: raw.campaignName,

      adSetId: raw.adSetId,
      adSetName: raw.adSetName,
      adset_id: raw.adSetId,
      adsetName: raw.adSetName,
      adset_name: raw.adSetName,
      ad_set_name: raw.adSetName,

      adId: raw.adId,
      adName: raw.adName,
      ad_id: raw.adId,
      ad_name: raw.adName,

      creativeName: raw.creativeName || raw.adName,
      creative_name: raw.creativeName || raw.adName,
      objective: raw.objective,

      impressions: toNumber(raw.impressionsRaw),
      reach: toNumber(raw.reachRaw),
      frequency: toNumber(raw.frequencyRaw),
      spend: toNumber(raw.spendRaw),
      amountSpent: toNumber(raw.spendRaw),
      cpm: toNumber(raw.cpmRaw),
      cpc: toNumber(raw.cpcRaw),

      costPerResult: toNumber(raw.clicksRaw),
      clicks: toNumber(raw.linkClicksRaw),
      linkClicks: toNumber(raw.outboundClicksRaw),
      outboundClicks: toNumber(raw.ctrAllRaw),
      ctrAll: pctMaybe(raw.ctrRaw),
      ctr: pctMaybe(raw.landingPageViewsRaw),
      landingPageViews: toNumber(raw.addsToCartRaw),
      addToCart: toNumber(raw.checkoutsInitiatedRaw),
      addsToCart: toNumber(raw.checkoutsInitiatedRaw),
      checkoutsInitiated: toNumber(raw.addsPaymentInfoRaw),
      addsPaymentInfo: toNumber(raw.purchasesRaw),

      purchases: toNumber(raw.revenueRaw),
      revenue: toNumber(raw.reportedRoasRaw),
      purchaseValue: toNumber(raw.reportedRoasRaw),
      purchase_value: toNumber(raw.reportedRoasRaw),
      reportedRoas: toNumber(raw.videoPlaysRaw),

      videoPlays: toNumber(raw.threeSecondVideoPlaysRaw),
      threeSecondVideoPlays: toNumber(raw.videoAveragePlayTimeRaw),
      thruPlays: toNumber(raw.thruPlaysRaw),
    };
  } else {
    normalized = {
      ...row,

      date: raw.date,
      day: raw.date,

      campaignId: raw.campaignId,
      campaignName: raw.campaignName,
      campaign_id: raw.campaignId,
      campaign_name: raw.campaignName,

      adSetId: raw.adSetId,
      adSetName: raw.adSetName,
      adset_id: raw.adSetId,
      adsetName: raw.adSetName,
      adset_name: raw.adSetName,
      ad_set_name: raw.adSetName,

      adId: raw.adId,
      adName: raw.adName,
      ad_id: raw.adId,
      ad_name: raw.adName,

      creativeName: raw.creativeName || raw.adName,
      creative_name: raw.creativeName || raw.adName,
      objective: raw.objective,

      impressions: toNumber(raw.impressionsRaw),
      reach: toNumber(raw.reachRaw),
      frequency: toNumber(raw.frequencyRaw),
      spend: toNumber(raw.spendRaw),
      amountSpent: toNumber(raw.spendRaw),
      cpm: toNumber(raw.cpmRaw),
      cpc: toNumber(raw.cpcRaw),
      costPerResult: toNumber(raw.costPerResultRaw),

      clicks: toNumber(raw.clicksRaw),
      linkClicks: toNumber(raw.linkClicksRaw),
      outboundClicks: toNumber(raw.outboundClicksRaw),
      ctrAll: pctMaybe(raw.ctrAllRaw),
      ctr: pctMaybe(raw.ctrRaw),

      landingPageViews: toNumber(raw.landingPageViewsRaw),
      addToCart: toNumber(raw.addsToCartRaw),
      addsToCart: toNumber(raw.addsToCartRaw),
      checkoutsInitiated: toNumber(raw.checkoutsInitiatedRaw),
      addsPaymentInfo: toNumber(raw.addsPaymentInfoRaw),

      purchases: toNumber(raw.purchasesRaw),
      revenue: toNumber(raw.revenueRaw),
      purchaseValue: toNumber(raw.revenueRaw),
      purchase_value: toNumber(raw.revenueRaw),
      reportedRoas: toNumber(raw.reportedRoasRaw),

      videoPlays: toNumber(raw.videoPlaysRaw),
      threeSecondVideoPlays: toNumber(raw.threeSecondVideoPlaysRaw),
      thruPlays: toNumber(raw.thruPlaysRaw),
    };
  }

  if (!normalized.date || Number.isNaN(new Date(normalized.date).getTime())) {
    flags.push({
      code: "BAD_DATE",
      severity: "critical",
      field: "date",
      message: "Date is missing or invalid.",
    });
  }

  for (const field of NUMERIC_FIELDS) {
    const value = normalized[field];
    if (typeof value === "number" && !Number.isFinite(value)) {
      flags.push({
        code: "NON_FINITE_METRIC",
        severity: "critical",
        field,
        message: `${field} became non-finite after normalization.`,
      });
    }
  }

  if (normalized.spend > 0 && normalized.impressions <= 0) {
    flags.push({
      code: "SPEND_WITH_NO_IMPRESSIONS",
      severity: "warning",
      field: "impressions",
      message: "Spend exists but impressions are zero.",
    });
  }

  if (normalized.purchases > 0 && normalized.revenue <= 0) {
    flags.push({
      code: "PURCHASE_WITH_ZERO_REVENUE",
      severity: "warning",
      field: "revenue",
      message: "Purchases exist but purchase value is zero.",
    });
  }

  if (normalized.revenue > 0 && normalized.purchases <= 0) {
    flags.push({
      code: "REVENUE_WITH_ZERO_PURCHASE",
      severity: "warning",
      field: "purchases",
      message: "Purchase value exists but purchase count is zero.",
    });
  }

  const computedRoas = safeDiv(normalized.revenue, normalized.spend);

  if (
    normalized.spend > 0 &&
    normalized.reportedRoas > 0 &&
    Math.abs(computedRoas - normalized.reportedRoas) > 0.08
  ) {
    flags.push({
      code: "ROAS_MISMATCH",
      severity: "warning",
      field: "reportedRoas",
      message: `Reported ROAS ${normalized.reportedRoas.toFixed(2)} does not match recomputed ROAS ${computedRoas.toFixed(2)}.`,
    });
  }

  normalized.cpa = safeDiv(normalized.spend, normalized.purchases);
  normalized.roas = computedRoas;
  normalized.aov = safeDiv(normalized.revenue, normalized.purchases);

  normalized.__qc = {
    flags,
    shiftedPurchaseRow: shifted,
    normalized: true,
  };

  return normalized;
}

export function normalizeMetaRows(rows: Record<string, any>[]) {
  return rows.map(normalizeMetaRow);
}

export function buildMetaDataQualitySummary(rows: MetaQcRow[]): MetaQcSummary {
  const suspiciousRows = rows.filter((row) => row.__qc?.flags?.length);

  return {
    rowsChecked: rows.length,
    cleanRows: rows.length - suspiciousRows.length,
    rowsWithWarnings: suspiciousRows.filter((row) =>
      row.__qc?.flags?.some((flag) => flag.severity === "warning")
    ).length,
    rowsWithCritical: suspiciousRows.filter((row) =>
      row.__qc?.flags?.some((flag) => flag.severity === "critical")
    ).length,
    shiftedRowsFixed: rows.filter((row) => row.__qc?.shiftedPurchaseRow).length,
    roasMismatchRows: suspiciousRows.filter((row) =>
      row.__qc?.flags?.some((flag) => flag.code === "ROAS_MISMATCH")
    ).length,
    revenueWithZeroPurchaseRows: suspiciousRows.filter((row) =>
      row.__qc?.flags?.some((flag) => flag.code === "REVENUE_WITH_ZERO_PURCHASE")
    ).length,
    purchaseWithZeroRevenueRows: suspiciousRows.filter((row) =>
      row.__qc?.flags?.some((flag) => flag.code === "PURCHASE_WITH_ZERO_REVENUE")
    ).length,
    suspiciousRows,
  };
}

export function summarizeMetaWindow(rows: MetaQcRow[]) {
  const cleanRows = normalizeMetaRows(rows);

  const spend = cleanRows.reduce((sum, row) => sum + toNumber(row.spend), 0);
  const purchases = cleanRows.reduce((sum, row) => sum + toNumber(row.purchases), 0);
  const revenue = cleanRows.reduce((sum, row) => sum + toNumber(row.revenue), 0);

  return {
    spend,
    purchases,
    revenue,
    cpa: safeDiv(spend, purchases),
    roas: safeDiv(revenue, spend),
  };
}
