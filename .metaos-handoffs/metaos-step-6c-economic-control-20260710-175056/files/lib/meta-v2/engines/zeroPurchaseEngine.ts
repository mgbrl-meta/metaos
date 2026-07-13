import type { MetaV2CleanRow, MetaV2Totals } from "@/lib/meta-v2/schema";
import { calculateMetaV2Totals } from "@/lib/meta-v2/metrics";
import {
  getMetaV2LastNDates,
  getMetaV2LatestDate,
  groupMetaV2RowsByAd,
  groupMetaV2RowsByKey,
} from "@/lib/meta-v2/engineUtils";
import {
  getMetaV2SeverityFromSpend,
} from "@/lib/meta-v2/decisionRules";

export interface MetaV2ZeroPurchaseTrendRow {
  date: string;
  spend: number;
  clicks: number;
  lpv: number;
  atc: number;
  purchases: number;
  roas: number;
}

export interface MetaV2ZeroPurchaseItem {
  id: string;
  adName: string;
  adSetName: string;
  campaignName: string;
  latestDate: string;
  lifetime: MetaV2Totals;
  last7: MetaV2Totals;
  latest: MetaV2Totals;
  severity: "critical" | "high" | "medium";
  action: string;
  reason: string;
  trend: MetaV2ZeroPurchaseTrendRow[];
}

export interface MetaV2ZeroPurchaseOutput {
  latestDate: string;
  totalItems: number;
  totalLifetimeWaste: number;
  totalLast7Waste: number;
  totalLatestWaste: number;
  items: MetaV2ZeroPurchaseItem[];
  verdict: string;
}

function buildTrend(rows: MetaV2CleanRow[]): MetaV2ZeroPurchaseTrendRow[] {
  const groups = groupMetaV2RowsByKey(
    rows.filter((row) => row.date),
    (row) => row.date
  );

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, dateRows]) => {
      const totals = calculateMetaV2Totals(dateRows);

      return {
        date,
        spend: totals.spend,
        clicks: totals.clicks,
        lpv: totals.lpv,
        atc: totals.atc,
        purchases: totals.purchases,
        roas: totals.roas,
      };
    });
}

function getZeroPurchaseAction(item: {
  lifetimeSpend: number;
  last7Spend: number;
  latestSpend: number;
  lpv: number;
  atc: number;
}) {
  if (item.latestSpend > 0 && item.lifetimeSpend >= 5000) {
    return "Pause immediately and recover budget.";
  }

  if (item.last7Spend > 0 && item.atc > 0) {
    return "Do not blindly kill. Check offer/PDP because ATC exists but purchase is zero.";
  }

  if (item.last7Spend > 0 && item.lpv > 0) {
    return "Reduce or pause. Traffic is reaching LPV but not converting.";
  }

  return "Keep paused or exclude from active scaling until new creative/offer is available.";
}

function getZeroPurchaseReason(item: {
  clicks: number;
  lpv: number;
  atc: number;
}) {
  if (item.atc > 0) {
    return "Spend has produced cart intent but zero purchase. Likely offer, trust, price, or checkout issue.";
  }

  if (item.lpv > 0) {
    return "Spend has produced landing page traffic but no purchase. Likely PDP, pricing, or product-message mismatch.";
  }

  if (item.clicks > 0) {
    return "Spend has produced clicks but poor funnel movement. Likely traffic quality or page-load issue.";
  }

  return "Spend has not produced meaningful conversion signal.";
}

export function buildMetaV2ZeroPurchase(
  rows: MetaV2CleanRow[],
  minLifetimeSpend = 3000
): MetaV2ZeroPurchaseOutput {
  const latestDate = getMetaV2LatestDate(rows);
  const last7Dates = new Set(getMetaV2LastNDates(rows, 7));
  const groups = groupMetaV2RowsByAd(rows);

  const items = Array.from(groups.entries())
    .map(([id, adRows]) => {
      const first = adRows[0];
      const lifetime = calculateMetaV2Totals(adRows);
      const last7 = calculateMetaV2Totals(adRows.filter((row) => last7Dates.has(row.date)));
      const latest = calculateMetaV2Totals(adRows.filter((row) => row.date === latestDate));

      const item = {
        lifetimeSpend: lifetime.spend,
        last7Spend: last7.spend,
        latestSpend: latest.spend,
        clicks: lifetime.clicks,
        lpv: lifetime.lpv,
        atc: lifetime.atc,
      };

      return {
        id,
        adName: first?.adName || "Unknown Ad",
        adSetName: first?.adSetName || "Unknown Ad Set",
        campaignName: first?.campaignName || "Unknown Campaign",
        latestDate,
        lifetime,
        last7,
        latest,
        severity: getMetaV2SeverityFromSpend(lifetime.spend),
        action: getZeroPurchaseAction(item),
        reason: getZeroPurchaseReason(item),
        trend: buildTrend(adRows),
      };
    })
    .filter((item) => item.lifetime.spend >= minLifetimeSpend)
    .filter((item) => item.lifetime.purchases <= 0)
    .filter((item) => item.latest.spend > 0 || item.last7.spend > 0)
    .sort((a, b) => b.lifetime.spend - a.lifetime.spend);

  const totalLifetimeWaste = items.reduce((sum, item) => sum + item.lifetime.spend, 0);
  const totalLast7Waste = items.reduce((sum, item) => sum + item.last7.spend, 0);
  const totalLatestWaste = items.reduce((sum, item) => sum + item.latest.spend, 0);

  const verdict =
    totalLatestWaste > 0
      ? "Zero-purchase waste is active on the latest date. Immediate budget recovery is required."
      : totalLast7Waste > 0
        ? "Zero-purchase waste is visible in the last 7 days. Reduce or pause weak ads before scaling."
        : "No active zero-purchase waste found at this threshold.";

  return {
    latestDate,
    totalItems: items.length,
    totalLifetimeWaste,
    totalLast7Waste,
    totalLatestWaste,
    items,
    verdict,
  };
}
