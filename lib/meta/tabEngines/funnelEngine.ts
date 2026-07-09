import type { MetaCleanRow, MetaTotals } from "@/lib/meta/schema";
import { calculateMetaTotals } from "@/lib/meta/metrics";
import { groupRowsByKey } from "@/lib/meta/windows";

export interface FunnelTableRow {
  id: string;
  label: string;
  level: "month" | "week";
  parentId?: string;
  startDate: string;
  endDate: string;
  totals: MetaTotals;
  gpt: number;
  children?: FunnelTableRow[];
}

function getDateRange(rows: MetaCleanRow[]) {
  const dates = rows.map((row) => row.date).filter(Boolean).sort();

  return {
    startDate: dates.at(0) || "",
    endDate: dates.at(-1) || "",
  };
}

function calculateGpt(totals: MetaTotals): number {
  const aov = totals.purchases > 0 ? totals.revenue / totals.purchases : 0;
  const cpa = totals.purchases > 0 ? totals.spend / totals.purchases : 0;

  return totals.purchases > 0 ? aov - cpa : 0;
}

function formatMonthLabel(monthKey: string): string {
  if (!monthKey || monthKey === "Unknown Month") return "Unknown Month";

  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;

  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatWeekLabel(weekKey: string): string {
  if (!weekKey) return "Unknown Week";

  const date = new Date(`${weekKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return weekKey;

  const endDate = new Date(date);
  endDate.setDate(date.getDate() + 6);

  const startLabel = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  const endLabel = endDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return `${startLabel}–${endLabel}`;
}

function buildWeekRows(monthId: string, rows: MetaCleanRow[]): FunnelTableRow[] {
  const weeklyGroups = groupRowsByKey(rows, (row) => row.weekKey || "Unknown Week");

  return Array.from(weeklyGroups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekKey, weekRows]) => {
      const totals = calculateMetaTotals(weekRows);
      const range = getDateRange(weekRows);

      return {
        id: `${monthId}:week:${weekKey}`,
        label: formatWeekLabel(weekKey),
        level: "week",
        parentId: monthId,
        startDate: range.startDate,
        endDate: range.endDate,
        totals,
        gpt: calculateGpt(totals),
      };
    });
}

export function buildFunnelTableRows(rows: MetaCleanRow[]): FunnelTableRow[] {
  const validRows = rows.filter((row) => row.date);
  const monthlyGroups = groupRowsByKey(validRows, (row) => row.monthKey || "Unknown Month");

  return Array.from(monthlyGroups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, monthRows]) => {
      const id = `month:${monthKey}`;
      const totals = calculateMetaTotals(monthRows);
      const range = getDateRange(monthRows);

      return {
        id,
        label: formatMonthLabel(monthKey),
        level: "month",
        startDate: range.startDate,
        endDate: range.endDate,
        totals,
        gpt: calculateGpt(totals),
        children: buildWeekRows(id, monthRows),
      };
    });
}

export function buildFunnelSummary(rows: MetaCleanRow[]) {
  const totals = calculateMetaTotals(rows);

  return {
    totals,
    gpt: calculateGpt(totals),
    monthCount: new Set(rows.map((row) => row.monthKey).filter(Boolean)).size,
    weekCount: new Set(rows.map((row) => row.weekKey).filter(Boolean)).size,
  };
}
