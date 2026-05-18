import { MetaNormalizedRow, MetaPerformanceRow } from "@/types/meta";
import { getLatestDayActiveAdKeys } from "@/lib/liveFilter";

export function getLatestDataDate(rows: MetaNormalizedRow[] | MetaPerformanceRow[]) {
  const dates = rows
    .map((row) => {
      if (!row.date) return null;
      const d = new Date(row.date);
      return Number.isNaN(d.getTime()) ? null : d;
    })
    .filter(Boolean) as Date[];

  if (!dates.length) return null;

  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

export function getCurrentlyDeliveringAdKeys(rows: MetaNormalizedRow[] | MetaPerformanceRow[]) {
  return getLatestDayActiveAdKeys(rows);
}

export function onlyCurrentlyDeliveringAds<T extends MetaPerformanceRow>(
  aggregatedAds: T[],
  sourceRows: MetaNormalizedRow[] | MetaPerformanceRow[]
) {
  const activeAdKeys = getLatestDayActiveAdKeys(sourceRows);

  if (!activeAdKeys.size) return [];

  return aggregatedAds.filter((row) => {
    const key = String(row.adId || row.adName || "").trim();
    return activeAdKeys.has(key);
  });
}
