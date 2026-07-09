import type { MetaCleanRow, MetaQcIssue, MetaQcResult } from "@/lib/meta/schema";
import { getEarliestDate, getLatestDate } from "@/lib/meta/windows";

export function runMetaQc(rows: MetaCleanRow[]): MetaQcResult {
  const issues: MetaQcIssue[] = [];

  if (!rows.length) {
    issues.push({
      severity: "critical",
      code: "NO_ROWS",
      message: "No Meta rows were detected.",
    });
  }

  const spendRows = rows.filter((row) => row.spend > 0);
  const revenueRows = rows.filter((row) => row.revenue > 0);
  const purchaseRows = rows.filter((row) => row.purchases > 0);
  const dateRows = rows.filter((row) => row.date);

  if (!spendRows.length) {
    issues.push({
      severity: "critical",
      code: "NO_SPEND",
      message: "No spend values were detected.",
    });
  }

  if (!revenueRows.length) {
    issues.push({
      severity: "warning",
      code: "NO_REVENUE",
      message: "No revenue / purchase value was detected.",
    });
  }

  if (!purchaseRows.length) {
    issues.push({
      severity: "warning",
      code: "NO_PURCHASES",
      message: "No purchase values were detected.",
    });
  }

  if (!dateRows.length) {
    issues.push({
      severity: "critical",
      code: "NO_DATES",
      message: "No valid date values were detected.",
    });
  }

  const zeroPurchaseSpend = rows
    .filter((row) => row.spend > 0 && row.purchases <= 0)
    .reduce((sum, row) => sum + row.spend, 0);

  const totalSpend = rows.reduce((sum, row) => sum + row.spend, 0);
  const zeroPurchaseShare = totalSpend > 0 ? zeroPurchaseSpend / totalSpend : 0;

  if (zeroPurchaseShare > 0.25) {
    issues.push({
      severity: "warning",
      code: "HIGH_ZERO_PURCHASE_SPEND",
      message: `High spend share has zero purchases: ${(zeroPurchaseShare * 100).toFixed(1)}%.`,
    });
  }

  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  const score = Math.max(0, Math.min(100, 100 - criticalCount * 30 - warningCount * 10));

  return {
    score,
    rowCount: rows.length,
    latestDate: getLatestDate(rows),
    earliestDate: getEarliestDate(rows),
    issues,
  };
}
