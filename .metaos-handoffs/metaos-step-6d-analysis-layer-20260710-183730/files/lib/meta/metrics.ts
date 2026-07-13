import type {
  MetaCleanRow,
  MetaLevel,
  MetaPreparedTableRow,
  MetaTotals,
  MetaWindow,
} from "@/lib/meta/schema";
import { safeDiv } from "@/lib/meta/formatters";
import {
  aggregateTotals,
  buildMonthlyWindows,
  buildWeeklyWindows,
  groupRowsByKey,
} from "@/lib/meta/windows";

export function calculateMetaTotals(rows: MetaCleanRow[]): MetaTotals {
  return aggregateTotals(rows);
}

export function recalculateMetaRowMetrics(row: MetaCleanRow): MetaCleanRow {
  return {
    ...row,
    roas: safeDiv(row.revenue, row.spend),
    cpa: safeDiv(row.spend, row.purchases),
    cpm: safeDiv(row.spend * 1000, row.impressions),
    cpc: safeDiv(row.spend, row.clicks),
    ctr: safeDiv(row.clicks, row.impressions) * 100,
    frequency: safeDiv(row.impressions, row.reach),
    lpvRate: safeDiv(row.lpv, row.linkClicks || row.clicks) * 100,
    atcRate: safeDiv(row.atc, row.lpv) * 100,
    checkoutRate: safeDiv(row.checkout, row.atc) * 100,
    paymentRate: safeDiv(row.payment, row.checkout) * 100,
    purchaseRate: safeDiv(row.purchases, row.lpv) * 100,
  };
}

export function getMonthlyMetaWindows(rows: MetaCleanRow[]): MetaWindow[] {
  return buildMonthlyWindows(rows);
}

export function getWeeklyMetaWindows(rows: MetaCleanRow[]): MetaWindow[] {
  return buildWeeklyWindows(rows);
}

export function getLatestDateRows(rows: MetaCleanRow[]): MetaCleanRow[] {
  const latestDate =
    rows
      .filter((row) => row.spend > 0)
      .map((row) => row.date)
      .filter(Boolean)
      .sort()
      .at(-1) || "";

  return rows.filter((row) => row.date === latestDate);
}

export function getPreviousDateRows(rows: MetaCleanRow[]): MetaCleanRow[] {
  const dates = Array.from(
    new Set(
      rows
        .filter((row) => row.spend > 0)
        .map((row) => row.date)
        .filter(Boolean)
    )
  ).sort();

  const previousDate = dates.at(-2) || "";
  return rows.filter((row) => row.date === previousDate);
}

export function buildGroupedMetaTable(
  rows: MetaCleanRow[],
  level: Exclude<MetaLevel, "account">
): MetaPreparedTableRow[] {
  const grouped = groupRowsByKey(rows, (row) => {
    if (level === "campaign") return row.campaignName;
    if (level === "adset") return `${row.campaignName} > ${row.adSetName}`;
    return `${row.campaignName} > ${row.adSetName} > ${row.adName}`;
  });

  return Array.from(grouped.entries())
    .map(([label, groupRows]) => ({
      id: `${level}:${label}`,
      label,
      level,
      totals: calculateMetaTotals(groupRows),
    }))
    .sort((a, b) => b.totals.spend - a.totals.spend);
}

export function buildCampaignTable(rows: MetaCleanRow[]): MetaPreparedTableRow[] {
  return buildGroupedMetaTable(rows, "campaign");
}

export function buildAdSetTable(rows: MetaCleanRow[]): MetaPreparedTableRow[] {
  return buildGroupedMetaTable(rows, "adset");
}

export function buildAdTable(rows: MetaCleanRow[]): MetaPreparedTableRow[] {
  return buildGroupedMetaTable(rows, "ad");
}

export function getSpendShare(rowSpend: number, totalSpend: number): number {
  return safeDiv(rowSpend, totalSpend) * 100;
}

export function getRevenueShare(rowRevenue: number, totalRevenue: number): number {
  return safeDiv(rowRevenue, totalRevenue) * 100;
}

export function getWasteSpend(rows: MetaCleanRow[], targetCpa: number): number {
  return rows
    .filter((row) => row.spend > 0 && (row.purchases <= 0 || row.cpa > targetCpa))
    .reduce((sum, row) => sum + row.spend, 0);
}

export function getZeroPurchaseSpend(rows: MetaCleanRow[]): number {
  return rows
    .filter((row) => row.spend > 0 && row.purchases <= 0)
    .reduce((sum, row) => sum + row.spend, 0);
}

export function getTopRowsBySpend(rows: MetaCleanRow[], limit = 10): MetaCleanRow[] {
  return [...rows].sort((a, b) => b.spend - a.spend).slice(0, limit);
}

export function getTopRowsByRevenue(rows: MetaCleanRow[], limit = 10): MetaCleanRow[] {
  return [...rows].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function getTopRowsByRoas(rows: MetaCleanRow[], limit = 10): MetaCleanRow[] {
  return [...rows]
    .filter((row) => row.spend > 0)
    .sort((a, b) => b.roas - a.roas)
    .slice(0, limit);
}

export function getTopRowsByCpa(rows: MetaCleanRow[], limit = 10): MetaCleanRow[] {
  return [...rows]
    .filter((row) => row.purchases > 0)
    .sort((a, b) => b.cpa - a.cpa)
    .slice(0, limit);
}
