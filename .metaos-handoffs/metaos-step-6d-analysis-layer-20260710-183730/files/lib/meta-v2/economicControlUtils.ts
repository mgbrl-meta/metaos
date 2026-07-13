import {
  deriveMetaV2Numbers,
  sumMetaV2BaseNumbers,
} from "@/lib/meta-v2/calculationCore";

import {
  filterMetaV2RowsByDateRange,
  getMetaV2EconomicAdKey,
  getMetaV2InclusiveDateRange,
  getMetaV2LatestDate,
  groupMetaV2RowsByKey,
} from "@/lib/meta-v2/engineUtils";

import { calculateMetaV2Totals } from "@/lib/meta-v2/metrics";

import type {
  MetaV2CleanRow,
  MetaV2Totals,
} from "@/lib/meta-v2/schema";

export interface MetaV2EconomicTrendRow {
  date: string;
  spend: number;
  cpm: number;
  ctr: number;
  cpa: number | null;
  aov: number | null;
  roas: number;
  purchases: number;
}

export interface MetaV2EconomicBaseItem {
  id: string;
  adName: string;
  campaignName: string;
  adSetName: string;
  lifetime: MetaV2Totals;
  last7: MetaV2Totals;
  yesterday: MetaV2Totals;
  trend: MetaV2EconomicTrendRow[];
}

export interface MetaV2EconomicCampaignRow {
  id: string;
  campaignName: string;
  adCount: number;
  totals: MetaV2Totals;
  yesterdaySpend: number;
}

export function combineMetaV2Totals(
  totals: readonly MetaV2Totals[]
): MetaV2Totals {
  const base = sumMetaV2BaseNumbers([...totals]);

  return {
    ...base,
    ...deriveMetaV2Numbers(base),
  };
}

export function getMetaV2ActiveSpendAdGroups(
  rows: MetaV2CleanRow[]
): {
  latestDate: string;
  groups: Map<string, MetaV2CleanRow[]>;
} {
  const latestDate = getMetaV2LatestDate(rows);

  const activeKeys = new Set(
    rows
      .filter(
        (row) =>
          row.date === latestDate &&
          row.spend > 0
      )
      .map((row) => getMetaV2EconomicAdKey(row))
      .filter(Boolean)
  );

  const groups = new Map<string, MetaV2CleanRow[]>();

  for (const row of rows) {
    const key = getMetaV2EconomicAdKey(row);

    if (!key || !activeKeys.has(key)) continue;

    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }

  return { latestDate, groups };
}

export function buildMetaV2EconomicTrend(
  rows: MetaV2CleanRow[],
  limit = 30
): MetaV2EconomicTrendRow[] {
  const groups = groupMetaV2RowsByKey(
    rows,
    (row) => row.date
  );

  return Array.from(groups.entries())
    .filter(([date]) => Boolean(date))
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-Math.max(1, limit))
    .map(([date, dateRows]) => {
      const totals = calculateMetaV2Totals(dateRows);

      return {
        date,
        spend: totals.spend,
        cpm: totals.cpm,
        ctr: totals.ctr,
        cpa: totals.purchases > 0 ? totals.cpa : null,
        aov: totals.purchases > 0 ? totals.aov : null,
        roas: totals.roas,
        purchases: totals.purchases,
      };
    });
}

export function buildMetaV2EconomicBaseItem(
  id: string,
  rows: MetaV2CleanRow[],
  latestDate: string
): MetaV2EconomicBaseItem {
  const sample = rows[0];
  const last7Range = getMetaV2InclusiveDateRange(
    latestDate,
    7
  );

  return {
    id,
    adName: sample?.adName ?? "Unknown Ad",
    campaignName:
      sample?.campaignName ?? "Unknown Campaign",
    adSetName:
      sample?.adSetName ?? "Unknown Ad Set",
    lifetime: calculateMetaV2Totals(rows),
    last7: calculateMetaV2Totals(
      filterMetaV2RowsByDateRange(rows, last7Range)
    ),
    yesterday: calculateMetaV2Totals(
      rows.filter((row) => row.date === latestDate)
    ),
    trend: buildMetaV2EconomicTrend(rows, 30),
  };
}

export function buildMetaV2EconomicCampaignRows(
  items: readonly MetaV2EconomicBaseItem[],
  sortBy: "cpa" | "roas"
): MetaV2EconomicCampaignRow[] {
  const groups = new Map<
    string,
    MetaV2EconomicBaseItem[]
  >();

  for (const item of items) {
    const current = groups.get(item.campaignName) ?? [];
    current.push(item);
    groups.set(item.campaignName, current);
  }

  return Array.from(groups.entries())
    .map(([campaignName, campaignItems]) => ({
      id: campaignName,
      campaignName,
      adCount: campaignItems.length,
      totals: combineMetaV2Totals(
        campaignItems.map((item) => item.lifetime)
      ),
      yesterdaySpend: campaignItems.reduce(
        (sum, item) => sum + item.yesterday.spend,
        0
      ),
    }))
    .sort((left, right) =>
      sortBy === "cpa"
        ? right.totals.cpa - left.totals.cpa
        : right.totals.roas - left.totals.roas
    );
}
