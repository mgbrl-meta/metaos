import type { MetaCleanRow } from "@/lib/meta/schema";
import { getLatestDate } from "@/lib/meta/windows";

export function selectRowsWithSpend(rows: MetaCleanRow[]) {
  return rows.filter((row) => row.spend > 0);
}

export function selectLatestRows(rows: MetaCleanRow[]) {
  const latestDate = getLatestDate(rows);
  return rows.filter((row) => row.date === latestDate);
}

export function selectZeroPurchaseRows(rows: MetaCleanRow[]) {
  return rows.filter((row) => row.spend > 0 && row.purchases <= 0);
}

export function selectHighCpaRows(rows: MetaCleanRow[], targetCpa: number) {
  return rows.filter((row) => row.purchases > 0 && row.cpa > targetCpa);
}

export function selectHighRoasRows(rows: MetaCleanRow[], targetRoas: number) {
  return rows.filter((row) => row.spend > 0 && row.roas >= targetRoas);
}

export function selectActiveCampaignRows(rows: MetaCleanRow[]) {
  return rows.filter((row) => row.spend > 0 || row.impressions > 0 || row.clicks > 0);
}

export function selectRowsByDateRange(
  rows: MetaCleanRow[],
  startDate: string,
  endDate: string
) {
  return rows.filter((row) => {
    if (!row.date) return false;
    if (startDate && row.date < startDate) return false;
    if (endDate && row.date > endDate) return false;
    return true;
  });
}
