import type { MetaV2CleanRow, MetaV2Totals } from "@/lib/meta-v2/schema";
import { getLatestDate } from "@/lib/meta-v2/dateWindows";
import { safeDiv } from "@/lib/meta-v2/calculationCore";
import { calculateMetaV2Totals } from "@/lib/meta-v2/metrics";

export type MetaV2QcSeverity = "critical" | "warning" | "info" | "pass";

export interface MetaV2QcIssue {
  severity: MetaV2QcSeverity;
  code: string;
  title: string;
  detail: string;
  action: string;
}

export interface MetaV2DataQcOutput {
  score: number;
  grade: "Excellent" | "Good" | "Needs Review" | "Weak";
  confidence: "High" | "Medium" | "Low";
  latestDate: string;
  earliestDate: string;
  rowCount: number;
  activeRowCount: number;
  totalColumnsConfidence: number;
  totals: MetaV2Totals;
  zeroPurchaseSpend: number;
  zeroPurchaseSpendShare: number;
  issueCounts: {
    critical: number;
    warning: number;
    info: number;
    pass: number;
  };
  issues: MetaV2QcIssue[];
  verdict: string;
}

function hasUsefulText(value: string) {
  const clean = String(value || "").trim().toLowerCase();
  return clean && !clean.startsWith("unknown");
}

function getEarliestDate(rows: MetaV2CleanRow[]) {
  return rows
    .map((row) => row.date)
    .filter(Boolean)
    .sort()
    .at(0) || "";
}

function addIssue(
  issues: MetaV2QcIssue[],
  severity: MetaV2QcSeverity,
  code: string,
  title: string,
  detail: string,
  action: string
) {
  issues.push({
    severity,
    code,
    title,
    detail,
    action,
  });
}

function getGrade(score: number): MetaV2DataQcOutput["grade"] {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 55) return "Needs Review";
  return "Weak";
}

function getConfidence(score: number): MetaV2DataQcOutput["confidence"] {
  if (score >= 80) return "High";
  if (score >= 60) return "Medium";
  return "Low";
}

export function buildMetaV2DataQc(rows: MetaV2CleanRow[]): MetaV2DataQcOutput {
  const issues: MetaV2QcIssue[] = [];
  const totals = calculateMetaV2Totals(rows);
  const latestDate = getLatestDate(rows);
  const earliestDate = getEarliestDate(rows);
  const activeRows = rows.filter((row) => row.spend > 0 || row.impressions > 0 || row.clicks > 0);

  const rowsWithDate = rows.filter((row) => row.date).length;
  const rowsWithSpend = rows.filter((row) => row.spend > 0).length;
  const rowsWithRevenue = rows.filter((row) => row.revenue > 0).length;
  const rowsWithPurchases = rows.filter((row) => row.purchases > 0).length;
  const rowsWithCampaign = rows.filter((row) => hasUsefulText(row.campaignName)).length;
  const rowsWithAdSet = rows.filter((row) => hasUsefulText(row.adSetName)).length;
  const rowsWithAd = rows.filter((row) => hasUsefulText(row.adName)).length;
  const rowsWithFunnel = rows.filter(
    (row) => row.clicks > 0 || row.lpv > 0 || row.atc > 0 || row.checkout > 0 || row.payment > 0
  ).length;

  const zeroPurchaseSpend = rows
    .filter((row) => row.spend > 0 && row.purchases <= 0)
    .reduce((sum, row) => sum + row.spend, 0);

  const zeroPurchaseSpendShare = safeDiv(zeroPurchaseSpend, totals.spend) * 100;

  if (!rows.length) {
    addIssue(
      issues,
      "critical",
      "NO_ROWS",
      "No rows detected",
      "The V2 engine did not receive any Meta rows.",
      "Refresh Meta data or check the data adapter."
    );
  } else {
    addIssue(
      issues,
      "pass",
      "ROWS_PRESENT",
      "Rows detected",
      `${rows.length.toLocaleString("en-IN")} rows are available for analysis.`,
      "Continue."
    );
  }

  if (!latestDate || !earliestDate) {
    addIssue(
      issues,
      "critical",
      "DATES_MISSING",
      "Date fields are missing",
      "Date windows cannot be trusted because valid dates were not detected.",
      "Check the date column mapping."
    );
  } else {
    addIssue(
      issues,
      "pass",
      "DATES_OK",
      "Date fields detected",
      `Data range is ${earliestDate} to ${latestDate}.`,
      "Continue."
    );
  }

  if (totals.spend <= 0) {
    addIssue(
      issues,
      "critical",
      "SPEND_MISSING",
      "Spend not detected",
      "Spend is zero or missing, so CPA, ROAS, waste, and scale decisions cannot be trusted.",
      "Check Amount Spent / Spend column mapping."
    );
  } else {
    addIssue(
      issues,
      "pass",
      "SPEND_OK",
      "Spend detected",
      "Spend is available for performance analysis.",
      "Continue."
    );
  }

  if (totals.revenue <= 0) {
    addIssue(
      issues,
      "warning",
      "REVENUE_MISSING",
      "Revenue missing",
      "Purchase value / revenue is not detected. ROAS will be zero or unreliable.",
      "Check purchase conversion value column."
    );
  }

  if (totals.purchases <= 0) {
    addIssue(
      issues,
      "warning",
      "PURCHASES_MISSING",
      "Purchases missing",
      "Purchase count is not detected. CPA and purchase CVR will be unreliable.",
      "Check purchases / website purchases column."
    );
  }

  if (rowsWithFunnel <= 0) {
    addIssue(
      issues,
      "warning",
      "FUNNEL_MISSING",
      "Funnel events missing",
      "Clicks, LPV, ATC, checkout, or payment fields are not detected.",
      "Check funnel event column mapping."
    );
  }

  if (zeroPurchaseSpendShare >= 25) {
    addIssue(
      issues,
      "warning",
      "ZERO_PURCHASE_SHARE_HIGH",
      "High zero-purchase spend share",
      `${zeroPurchaseSpendShare.toFixed(1)}% of spend is on rows with zero purchases.`,
      "Review Zero Purchase and De-scale modules immediately."
    );
  } else if (zeroPurchaseSpendShare > 0) {
    addIssue(
      issues,
      "info",
      "ZERO_PURCHASE_SHARE_PRESENT",
      "Zero-purchase spend present",
      `${zeroPurchaseSpendShare.toFixed(1)}% of spend has zero purchases.`,
      "Monitor waste before scaling."
    );
  }

  const missingNamingShare =
    rows.length > 0
      ? 100 -
        ((rowsWithCampaign / rows.length) * 35 +
          (rowsWithAdSet / rows.length) * 30 +
          (rowsWithAd / rows.length) * 35)
      : 100;

  if (missingNamingShare > 20) {
    addIssue(
      issues,
      "warning",
      "NAMING_WEAK",
      "Naming quality is weak",
      "Campaign, ad set, or ad names are missing or detected as unknown in a material share of rows.",
      "Clean naming taxonomy for better creative and structure diagnosis."
    );
  }

  const dateCoverage = rows.length ? rowsWithDate / rows.length : 0;
  const spendCoverage = rows.length ? rowsWithSpend / rows.length : 0;
  const revenueCoverage = rows.length ? rowsWithRevenue / rows.length : 0;
  const purchaseCoverage = rows.length ? rowsWithPurchases / rows.length : 0;
  const funnelCoverage = rows.length ? rowsWithFunnel / rows.length : 0;

  const totalColumnsConfidence = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        dateCoverage * 20 +
          Math.min(1, spendCoverage * 3) * 20 +
          Math.min(1, revenueCoverage * 5) * 18 +
          Math.min(1, purchaseCoverage * 5) * 18 +
          Math.min(1, funnelCoverage * 3) * 14 +
          Math.max(0, 1 - missingNamingShare / 100) * 10
      )
    )
  );

  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const infoCount = issues.filter((issue) => issue.severity === "info").length;
  const passCount = issues.filter((issue) => issue.severity === "pass").length;

  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        totalColumnsConfidence -
          criticalCount * 25 -
          warningCount * 8 -
          Math.max(0, zeroPurchaseSpendShare - 20) * 0.5
      )
    )
  );

  const grade = getGrade(score);
  const confidence = getConfidence(score);

  const verdict =
    score >= 80
      ? "Data is strong enough for operator-grade decisions."
      : score >= 60
        ? "Data is usable, but some recommendations should be treated with medium confidence."
        : "Data quality is weak. Fix column mapping or source data before trusting budget decisions.";

  return {
    score,
    grade,
    confidence,
    latestDate,
    earliestDate,
    rowCount: rows.length,
    activeRowCount: activeRows.length,
    totalColumnsConfidence,
    totals,
    zeroPurchaseSpend,
    zeroPurchaseSpendShare,
    issueCounts: {
      critical: criticalCount,
      warning: warningCount,
      info: infoCount,
      pass: passCount,
    },
    issues,
    verdict,
  };
}
