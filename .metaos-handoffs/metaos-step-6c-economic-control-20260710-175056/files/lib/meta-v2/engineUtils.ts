import type { MetaV2CleanRow } from "@/lib/meta-v2/schema";
import { groupByKey } from "@/lib/meta-v2/calculationCore";

export interface MetaV2DateRange {
  startDate: string;
  endDate: string;
}

export function getMetaV2DateRange(
  rows: Pick<MetaV2CleanRow, "date">[]
): MetaV2DateRange {
  const dates = rows
    .map((row) => row.date)
    .filter(Boolean)
    .sort();

  return {
    startDate: dates.at(0) || "",
    endDate: dates.at(-1) || "",
  };
}

export function getMetaV2LatestDate(
  rows: Pick<MetaV2CleanRow, "date" | "spend">[]
): string {
  return (
    rows
      .filter((row) => row.spend > 0)
      .map((row) => row.date)
      .filter(Boolean)
      .sort()
      .at(-1) || ""
  );
}

export function getMetaV2DateList(
  rows: Pick<MetaV2CleanRow, "date" | "spend">[]
): string[] {
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

export function formatMetaV2MonthLabel(monthKey: string): string {
  if (!monthKey || monthKey === "Unknown") return "Unknown Month";

  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;

  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatMetaV2WeekLabel(weekKey: string): string {
  if (!weekKey || weekKey === "Unknown") return "Unknown Week";

  const start = new Date(`${weekKey}T00:00:00`);
  if (Number.isNaN(start.getTime())) return weekKey;

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startText = start.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  const endText = end.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return `${startText}–${endText}`;
}

export function groupMetaV2RowsByKey<T>(
  rows: T[],
  getKey: (row: T) => string
): Map<string, T[]> {
  return groupByKey(rows, getKey);
}

export function groupMetaV2RowsByAd<T extends Pick<
  MetaV2CleanRow,
  "adId" | "campaignName" | "adSetName" | "adName"
>>(rows: T[]): Map<string, T[]> {
  return groupByKey(rows, (row) => {
    return row.adId || `${row.campaignName} > ${row.adSetName} > ${row.adName}`;
  });
}


export function addMetaV2Days(
  dateKey: string,
  days: number
): string {
  if (!dateKey) return "";

  const date = new Date(
    `${dateKey}T00:00:00Z`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  date.setUTCDate(
    date.getUTCDate() + days
  );

  return date
    .toISOString()
    .slice(0, 10);
}

export function getMetaV2InclusiveDateRange(
  endDate: string,
  days: number
): MetaV2DateRange {
  const safeDays = Math.max(
    1,
    Math.floor(days)
  );

  return {
    startDate:
      addMetaV2Days(
        endDate,
        1 - safeDays
      ),

    endDate,
  };
}

export function filterMetaV2RowsByDateRange<
  T extends Pick<
    MetaV2CleanRow,
    "date"
  >,
>(
  rows: T[],
  range: MetaV2DateRange
): T[] {
  if (
    !range.startDate ||
    !range.endDate
  ) {
    return [];
  }

  return rows.filter(
    (row) =>
      Boolean(row.date) &&
      row.date >=
        range.startDate &&
      row.date <=
        range.endDate
  );
}

export function getMetaV2RelativeChange(
  current: number,
  baseline: number
): number {
  return baseline !== 0
    ? (current - baseline) /
        baseline
    : 0;
}

export function clampMetaV2Number(
  value: number,
  minimum = 0,
  maximum = 100
): number {
  return Math.max(
    minimum,
    Math.min(
      maximum,
      Number.isFinite(value)
        ? value
        : minimum
    )
  );
}
