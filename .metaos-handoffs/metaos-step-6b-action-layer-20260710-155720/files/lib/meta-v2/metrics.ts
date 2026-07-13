import type { MetaV2CleanRow, MetaV2Totals } from "@/lib/meta-v2/schema";
import {
  deriveMetaV2Numbers,
  groupByKey,
  sumMetaV2BaseNumbers,
} from "@/lib/meta-v2/calculationCore";

export function calculateMetaV2Totals(rows: MetaV2CleanRow[]): MetaV2Totals {
  const base = sumMetaV2BaseNumbers(rows);
  const derived = deriveMetaV2Numbers(base);

  return {
    ...base,
    ...derived,
  };
}

export function groupMetaV2Rows<T extends MetaV2CleanRow>(
  rows: T[],
  getKey: (row: T) => string
): Map<string, T[]> {
  return groupByKey(rows, getKey);
}

export function getMetaV2LatestDate(rows: Pick<MetaV2CleanRow, "date" | "spend">[]): string {
  return (
    rows
      .filter((row) => row.spend > 0)
      .map((row) => row.date)
      .filter(Boolean)
      .sort()
      .at(-1) || ""
  );
}

export function getMetaV2DateList(rows: Pick<MetaV2CleanRow, "date" | "spend">[]): string[] {
  return Array.from(
    new Set(
      rows
        .filter((row) => row.spend > 0)
        .map((row) => row.date)
        .filter(Boolean)
    )
  ).sort();
}

export function getMetaV2LastNDates(
  rows: Pick<MetaV2CleanRow, "date" | "spend">[],
  count: number
): string[] {
  return getMetaV2DateList(rows).slice(-count);
}
