import type { MetaV2CleanRow, MetaV2RawRow } from "@/lib/meta-v2/schema";
import { getColumnValue } from "@/lib/meta-v2/columnMap";
import {
  deriveMetaV2Numbers,
  safeNumber,
  type MetaV2BaseNumbers,
} from "@/lib/meta-v2/calculationCore";
import { getMonthKey, getWeekKey, toIsoDateKey } from "@/lib/meta-v2/dateWindows";

function text(value: unknown, fallback: string): string {
  const output = String(value ?? "").trim();
  return output || fallback;
}

export function normalizeMetaV2Row(row: MetaV2RawRow, sourceIndex: number): MetaV2CleanRow {
  const date = toIsoDateKey(getColumnValue(row, "date"));

  const adName = text(
    getColumnValue(row, "adName"),
    "Unknown Ad"
  );

  const creativeName = text(
    getColumnValue(row, "creativeName"),
    adName
  );

  const base: MetaV2BaseNumbers = {
    spend: safeNumber(getColumnValue(row, "spend")),
    revenue: safeNumber(getColumnValue(row, "revenue")),
    purchases: safeNumber(getColumnValue(row, "purchases")),

    impressions: safeNumber(getColumnValue(row, "impressions")),
    reach: safeNumber(getColumnValue(row, "reach")),
    clicks: safeNumber(getColumnValue(row, "clicks")),
    linkClicks: safeNumber(getColumnValue(row, "linkClicks")),
    lpv: safeNumber(getColumnValue(row, "lpv")),
    contentView: safeNumber(getColumnValue(row, "contentView")),
    atc: safeNumber(getColumnValue(row, "atc")),
    checkout: safeNumber(getColumnValue(row, "checkout")),
    payment: safeNumber(getColumnValue(row, "payment")),
  };

  const derived = deriveMetaV2Numbers(base);

  return {
    sourceIndex,
    date,
    monthKey: getMonthKey(date),
    weekKey: getWeekKey(date),

    campaignName: text(getColumnValue(row, "campaignName"), "Unknown Campaign"),
    adSetName: text(getColumnValue(row, "adSetName"), "Unknown Ad Set"),
    adName,
    creativeName,
    adId: text(getColumnValue(row, "adId"), ""),

    ...base,
    ...derived,
  };
}

export function normalizeMetaV2Rows(rows: Record<string, unknown>[]): MetaV2CleanRow[] {
  return rows.map((row, index) => normalizeMetaV2Row(row as MetaV2RawRow, index));
}
