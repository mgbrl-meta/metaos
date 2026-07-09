import type { MetaCleanRow, MetaTotals } from "@/lib/meta/schema";
import { calculateMetaTotals } from "@/lib/meta/metrics";

export interface ZeroPurchaseTrendRow {
  date: string;
  spend: number;
  clicks: number;
  lpv: number;
  purchases: number;
  cpa: number;
  roas: number;
}

export interface ZeroPurchaseItem {
  id: string;
  adName: string;
  adSetName: string;
  campaignName: string;
  lifetime: MetaTotals;
  last7: MetaTotals;
  latest: MetaTotals;
  latestDate: string;
  trend: ZeroPurchaseTrendRow[];
}

export interface ZeroPurchaseEngineOutput {
  latestDate: string;
  totalItems: number;
  totalLifetimeSpend: number;
  totalLast7Spend: number;
  totalLatestSpend: number;
  items: ZeroPurchaseItem[];
}

function getLatestDate(rows: MetaCleanRow[]) {
  return (
    rows
      .filter((row) => row.spend > 0)
      .map((row) => row.date)
      .filter(Boolean)
      .sort()
      .at(-1) || ""
  );
}

function getLastNDates(rows: MetaCleanRow[], n: number) {
  return Array.from(
    new Set(
      rows
        .filter((row) => row.spend > 0)
        .map((row) => row.date)
        .filter(Boolean)
    )
  )
    .sort()
    .slice(-n);
}

function groupByAd(rows: MetaCleanRow[]) {
  const map = new Map<string, MetaCleanRow[]>();

  for (const row of rows) {
    const key = row.adId || `${row.campaignName} > ${row.adSetName} > ${row.adName}`;
    const group = map.get(key) || [];
    group.push(row);
    map.set(key, group);
  }

  return map;
}

function buildTrend(rows: MetaCleanRow[]): ZeroPurchaseTrendRow[] {
  const map = new Map<string, MetaCleanRow[]>();

  for (const row of rows) {
    const group = map.get(row.date) || [];
    group.push(row);
    map.set(row.date, group);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, dateRows]) => {
      const totals = calculateMetaTotals(dateRows);

      return {
        date,
        spend: totals.spend,
        clicks: totals.clicks,
        lpv: totals.lpv,
        purchases: totals.purchases,
        cpa: totals.cpa,
        roas: totals.roas,
      };
    });
}

export function buildZeroPurchaseOutput(
  rows: MetaCleanRow[],
  minLifetimeSpend = 3000
): ZeroPurchaseEngineOutput {
  const latestDate = getLatestDate(rows);
  const last7Dates = new Set(getLastNDates(rows, 7));
  const grouped = groupByAd(rows);

  const items: ZeroPurchaseItem[] = Array.from(grouped.entries())
    .map(([id, adRows]) => {
      const first = adRows[0];
      const lifetime = calculateMetaTotals(adRows);
      const last7 = calculateMetaTotals(adRows.filter((row) => last7Dates.has(row.date)));
      const latest = calculateMetaTotals(adRows.filter((row) => row.date === latestDate));

      return {
        id,
        adName: first?.adName || "Unknown Ad",
        adSetName: first?.adSetName || "Unknown Ad Set",
        campaignName: first?.campaignName || "Unknown Campaign",
        lifetime,
        last7,
        latest,
        latestDate,
        trend: buildTrend(adRows),
      };
    })
    .filter((item) => item.lifetime.spend >= minLifetimeSpend)
    .filter((item) => item.lifetime.purchases <= 0)
    .filter((item) => item.latest.spend > 0 || item.last7.spend > 0)
    .sort((a, b) => b.lifetime.spend - a.lifetime.spend);

  return {
    latestDate,
    totalItems: items.length,
    totalLifetimeSpend: items.reduce((sum, item) => sum + item.lifetime.spend, 0),
    totalLast7Spend: items.reduce((sum, item) => sum + item.last7.spend, 0),
    totalLatestSpend: items.reduce((sum, item) => sum + item.latest.spend, 0),
    items,
  };
}
