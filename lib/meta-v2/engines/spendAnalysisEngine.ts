import {
  buildMetaV2DailyAnalysis,
  buildMetaV2PeriodComparison,
  calculateMetaV2AnalysisTotals,
  getMetaV2AvailableRange,
  getMetaV2PresetRange,
  normalizeMetaV2SelectedRange,
  type MetaV2AnalysisTotals,
  type MetaV2DailyAnalysisRow,
  type MetaV2PeriodComparison,
  type MetaV2SpendPreset,
} from "@/lib/meta-v2/analysisLayerUtils";

import {
  filterMetaV2LiveRows,
  filterMetaV2RowsByDateRange,
  groupMetaV2RowsByKey,
  type MetaV2DateRange,
} from "@/lib/meta-v2/engineUtils";

import type {
  MetaV2CleanRow,
} from "@/lib/meta-v2/schema";

export type MetaV2SpendDimension =
  | "campaign"
  | "adset"
  | "ad";

export interface MetaV2SpendDimensionRow {
  id: string;
  name: string;
  dimension:
    MetaV2SpendDimension;

  totals:
    MetaV2AnalysisTotals;

  spendShare: number;
  revenueShare: number;
}

export interface MetaV2SpendAnalysisOptions {
  preset?:
    MetaV2SpendPreset;

  customRange?:
    Partial<MetaV2DateRange>;
}

export interface MetaV2SpendAnalysisOutput {
  isLive: boolean;

  availableRange:
    MetaV2DateRange;

  selectedRange:
    MetaV2DateRange;

  preset:
    MetaV2SpendPreset;

  totals:
    MetaV2AnalysisTotals;

  daily:
    MetaV2DailyAnalysisRow[];

  dailyDetail:
    MetaV2DailyAnalysisRow[];

  campaigns:
    MetaV2SpendDimensionRow[];

  adSets:
    MetaV2SpendDimensionRow[];

  ads:
    MetaV2SpendDimensionRow[];

  campaignChartRows:
    MetaV2SpendDimensionRow[];

  adSetChartRows:
    MetaV2SpendDimensionRow[];

  periodComparisons:
    MetaV2PeriodComparison[];
}

function buildDimensionRows(
  rows: MetaV2CleanRow[],
  dimension:
    MetaV2SpendDimension,
  accountTotals:
    MetaV2AnalysisTotals
): MetaV2SpendDimensionRow[] {
  const getKey =
    dimension === "campaign"
      ? (row: MetaV2CleanRow) =>
          row.campaignName
      : dimension === "adset"
        ? (row: MetaV2CleanRow) =>
            row.adSetName
        : (row: MetaV2CleanRow) =>
            row.adName;

  const groups =
    groupMetaV2RowsByKey(
      rows,
      getKey
    );

  return Array.from(
    groups.entries()
  )
    .map(
      ([
        name,
        groupRows,
      ]) => {
        const totals =
          calculateMetaV2AnalysisTotals(
            groupRows
          );

        return {
          id:
            `${dimension}:${name}`,

          name,
          dimension,
          totals,

          spendShare:
            accountTotals.spend > 0
              ? totals.spend /
                accountTotals.spend
              : 0,

          revenueShare:
            accountTotals.revenue > 0
              ? totals.revenue /
                accountTotals.revenue
              : 0,
        };
      }
    )
    .sort(
      (left, right) =>
        right.totals.spend -
        left.totals.spend
    );
}

export function buildMetaV2SpendAnalysis(
  rows: MetaV2CleanRow[],
  options:
    MetaV2SpendAnalysisOptions = {}
): MetaV2SpendAnalysisOutput {
  const preset =
    options.preset ?? 30;

  /**
   * Preserve the legacy Spend screen contract:
   * only currently live ads contribute historical rows.
   */
  const liveRows =
    filterMetaV2LiveRows(
      rows
    ).filter(
      (row) =>
        Boolean(row.date)
    );

  const availableRange =
    getMetaV2AvailableRange(
      liveRows
    );

  const selectedRange =
    options.customRange
      ? normalizeMetaV2SelectedRange(
          availableRange,
          options.customRange
        )
      : getMetaV2PresetRange(
          availableRange,
          preset
        );

  const selectedRows =
    filterMetaV2RowsByDateRange(
      liveRows,
      selectedRange
    );

  const totals =
    calculateMetaV2AnalysisTotals(
      selectedRows
    );

  const daily =
    buildMetaV2DailyAnalysis(
      selectedRows
    );

  const campaigns =
    buildDimensionRows(
      selectedRows,
      "campaign",
      totals
    );

  const adSets =
    buildDimensionRows(
      selectedRows,
      "adset",
      totals
    );

  const ads =
    buildDimensionRows(
      selectedRows,
      "ad",
      totals
    );

  return {
    isLive:
      liveRows.length > 0,

    availableRange,
    selectedRange,
    preset,
    totals,
    daily,

    /**
     * Legacy UI shows the final 28 available daily rows.
     */
    dailyDetail:
      daily.slice(-28),

    campaigns,
    adSets,
    ads:
      ads.slice(0, 20),

    /**
     * Legacy horizontal bar charts render the top eight
     * from low-to-high so the largest bar sits at the end.
     */
    campaignChartRows:
      campaigns
        .slice(0, 8)
        .reverse(),

    adSetChartRows:
      adSets
        .slice(0, 8)
        .reverse(),

    /**
     * Preserve exact comparison windows and the legacy
     * selected-range boundary behavior.
     */
    periodComparisons:
      [7, 14, 28].map(
        (days) =>
          buildMetaV2PeriodComparison(
            selectedRows,
            selectedRange.endDate,
            days
          )
      ),
  };
}
