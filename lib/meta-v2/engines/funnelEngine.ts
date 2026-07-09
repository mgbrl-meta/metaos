import type { MetaV2CleanRow, MetaV2Totals } from "@/lib/meta-v2/schema";
import { calculateMetaV2Totals } from "@/lib/meta-v2/metrics";
import {
  formatMetaV2MonthLabel,
  formatMetaV2WeekLabel,
  getMetaV2DateRange,
  groupMetaV2RowsByKey,
} from "@/lib/meta-v2/engineUtils";

export interface MetaV2FunnelRow {
  id: string;
  label: string;
  level: "month" | "week";
  startDate: string;
  endDate: string;
  totals: MetaV2Totals;
  children?: MetaV2FunnelRow[];
}

export interface MetaV2FunnelOutput {
  summary: MetaV2Totals;
  rows: MetaV2FunnelRow[];
  monthCount: number;
  weekCount: number;
  strongestMonth: string;
  weakestMonth: string;
  verdict: string;
}

function buildWeekRows(parentId: string, rows: MetaV2CleanRow[]): MetaV2FunnelRow[] {
  const groups = groupMetaV2RowsByKey(rows, (row) => row.weekKey || "Unknown");

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekKey, weekRows]) => {
      const range = getMetaV2DateRange(weekRows);

      return {
        id: `${parentId}:week:${weekKey}`,
        label: formatMetaV2WeekLabel(weekKey),
        level: "week",
        startDate: range.startDate,
        endDate: range.endDate,
        totals: calculateMetaV2Totals(weekRows),
      };
    });
}

export function buildMetaV2Funnel(rows: MetaV2CleanRow[]): MetaV2FunnelOutput {
  const validRows = rows.filter((row) => row.date);
  const summary = calculateMetaV2Totals(validRows);
  const monthGroups = groupMetaV2RowsByKey(validRows, (row) => row.monthKey || "Unknown");

  const monthRows = Array.from(monthGroups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, monthGroup]) => {
      const range = getMetaV2DateRange(monthGroup);
      const id = `month:${monthKey}`;

      return {
        id,
        label: formatMetaV2MonthLabel(monthKey),
        level: "month" as const,
        startDate: range.startDate,
        endDate: range.endDate,
        totals: calculateMetaV2Totals(monthGroup),
        children: buildWeekRows(id, monthGroup),
      };
    });

  const strongest = [...monthRows]
    .sort((a, b) => b.totals.roas - a.totals.roas)
    .at(0);

  const weakest = [...monthRows]
    .filter((row) => row.totals.spend > 0)
    .sort((a, b) => a.totals.roas - b.totals.roas)
    .at(0);

  const verdict =
    summary.roas >= 2
      ? "Funnel is producing acceptable revenue efficiency. Next focus: protect GPT and identify weak monthly leakage."
      : "Funnel efficiency is below scale quality. Diagnose whether leakage is happening before ATC, checkout, or payment.";

  return {
    summary,
    rows: monthRows,
    monthCount: monthRows.length,
    weekCount: new Set(validRows.map((row) => row.weekKey).filter(Boolean)).size,
    strongestMonth: strongest?.label || "NA",
    weakestMonth: weakest?.label || "NA",
    verdict,
  };
}
