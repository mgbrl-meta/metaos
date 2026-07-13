import {
  safeDiv,
} from "@/lib/meta-v2/calculationCore";

import {
  addMetaV2Days,
  filterMetaV2RowsByDateRange,
  formatMetaV2MonthLabel,
  getMetaV2DateRange,
  getMetaV2InclusiveDateRange,
  groupMetaV2RowsByKey,
  type MetaV2DateRange,
} from "@/lib/meta-v2/engineUtils";

import {
  calculateMetaV2Totals,
} from "@/lib/meta-v2/metrics";

import type {
  MetaV2CleanRow,
  MetaV2Totals,
} from "@/lib/meta-v2/schema";

export type MetaV2SpendPreset =
  | 7
  | 14
  | 30
  | 60
  | 90
  | "all";

export interface MetaV2AnalysisTotals
  extends MetaV2Totals {
  video3s: number;
  thumbstop: number;

  visitors: number;
  purchaseCvr: number;
  costPerVisitor: number;
  revenuePerVisitor: number;
}

export interface MetaV2PeriodMovement {
  absolute: number;
  relative: number;
}

export interface MetaV2PeriodComparison {
  period: string;
  days: number;

  currentRange:
    MetaV2DateRange;

  previousRange:
    MetaV2DateRange;

  current:
    MetaV2AnalysisTotals;

  previous:
    MetaV2AnalysisTotals;

  movement: {
    spend:
      MetaV2PeriodMovement;

    revenue:
      MetaV2PeriodMovement;

    purchases:
      MetaV2PeriodMovement;

    roas:
      MetaV2PeriodMovement;

    cpa:
      MetaV2PeriodMovement;

    aov:
      MetaV2PeriodMovement;

    cpm:
      MetaV2PeriodMovement;

    cpc:
      MetaV2PeriodMovement;

    ctr:
      MetaV2PeriodMovement;

    lpvRate:
      MetaV2PeriodMovement;

    atcRate:
      MetaV2PeriodMovement;
  };
}

export interface MetaV2DailyAnalysisRow
  extends MetaV2AnalysisTotals {
  date: string;
}

export function getMetaV2VisitorCount(
  row: Pick<
    MetaV2CleanRow,
    | "lpv"
    | "linkClicks"
    | "clicks"
  >
): number {
  if (row.lpv > 0) {
    return row.lpv;
  }

  if (row.linkClicks > 0) {
    return row.linkClicks;
  }

  return row.clicks;
}

export function calculateMetaV2AnalysisTotals(
  rows: MetaV2CleanRow[]
): MetaV2AnalysisTotals {
  const totals =
    calculateMetaV2Totals(
      rows
    );

  const video3s =
    rows.reduce(
      (sum, row) =>
        sum +
        Number(
          row.video3s ?? 0
        ),
      0
    );

  const visitors =
    rows.reduce(
      (sum, row) =>
        sum +
        getMetaV2VisitorCount(
          row
        ),
      0
    );

  return {
    ...totals,

    video3s,

    thumbstop:
      safeDiv(
        video3s,
        totals.impressions
      ) * 100,

    visitors,

    purchaseCvr:
      safeDiv(
        totals.purchases,
        totals.clicks
      ) * 100,

    costPerVisitor:
      safeDiv(
        totals.spend,
        visitors
      ),

    revenuePerVisitor:
      safeDiv(
        totals.revenue,
        visitors
      ),
  };
}

export function getMetaV2Movement(
  current: number,
  previous: number
): MetaV2PeriodMovement {
  return {
    absolute:
      current - previous,

    relative:
      previous !== 0
        ? (current - previous) /
          previous
        : 0,
  };
}

export function getMetaV2PresetRange(
  availableRange:
    MetaV2DateRange,
  preset:
    MetaV2SpendPreset
): MetaV2DateRange {
  if (
    !availableRange.startDate ||
    !availableRange.endDate
  ) {
    return {
      startDate: "",
      endDate: "",
    };
  }

  if (preset === "all") {
    return availableRange;
  }

  const requested =
    getMetaV2InclusiveDateRange(
      availableRange.endDate,
      preset
    );

  return {
    startDate:
      requested.startDate <
      availableRange.startDate
        ? availableRange.startDate
        : requested.startDate,

    endDate:
      availableRange.endDate,
  };
}

export function normalizeMetaV2SelectedRange(
  availableRange:
    MetaV2DateRange,
  requestedRange:
    Partial<MetaV2DateRange>
): MetaV2DateRange {
  const startDate =
    requestedRange.startDate ||
    availableRange.startDate;

  const endDate =
    requestedRange.endDate ||
    availableRange.endDate;

  if (
    !startDate ||
    !endDate
  ) {
    return {
      startDate: "",
      endDate: "",
    };
  }

  const safeStart =
    startDate <
    availableRange.startDate
      ? availableRange.startDate
      : startDate;

  const safeEnd =
    endDate >
    availableRange.endDate
      ? availableRange.endDate
      : endDate;

  if (
    safeStart >
    safeEnd
  ) {
    return {
      startDate: safeEnd,
      endDate: safeEnd,
    };
  }

  return {
    startDate: safeStart,
    endDate: safeEnd,
  };
}

export function buildMetaV2DailyAnalysis(
  rows: MetaV2CleanRow[]
): MetaV2DailyAnalysisRow[] {
  const groups =
    groupMetaV2RowsByKey(
      rows,
      (row) => row.date
    );

  return Array.from(
    groups.entries()
  )
    .filter(([date]) =>
      Boolean(date)
    )
    .sort(
      ([left], [right]) =>
        left.localeCompare(right)
    )
    .map(
      ([
        date,
        dateRows,
      ]) => ({
        date,
        ...calculateMetaV2AnalysisTotals(
          dateRows
        ),
      })
    );
}

export function buildMetaV2PeriodComparison(
  rows: MetaV2CleanRow[],
  endDate: string,
  days: number
): MetaV2PeriodComparison {
  const currentRange =
    getMetaV2InclusiveDateRange(
      endDate,
      days
    );

  const previousEnd =
    addMetaV2Days(
      currentRange.startDate,
      -1
    );

  const previousRange =
    getMetaV2InclusiveDateRange(
      previousEnd,
      days
    );

  const current =
    calculateMetaV2AnalysisTotals(
      filterMetaV2RowsByDateRange(
        rows,
        currentRange
      )
    );

  const previous =
    calculateMetaV2AnalysisTotals(
      filterMetaV2RowsByDateRange(
        rows,
        previousRange
      )
    );

  return {
    period:
      `Last ${days}D`,

    days,
    currentRange,
    previousRange,
    current,
    previous,

    movement: {
      spend:
        getMetaV2Movement(
          current.spend,
          previous.spend
        ),

      revenue:
        getMetaV2Movement(
          current.revenue,
          previous.revenue
        ),

      purchases:
        getMetaV2Movement(
          current.purchases,
          previous.purchases
        ),

      roas:
        getMetaV2Movement(
          current.roas,
          previous.roas
        ),

      cpa:
        getMetaV2Movement(
          current.cpa,
          previous.cpa
        ),

      aov:
        getMetaV2Movement(
          current.aov,
          previous.aov
        ),

      cpm:
        getMetaV2Movement(
          current.cpm,
          previous.cpm
        ),

      cpc:
        getMetaV2Movement(
          current.cpc,
          previous.cpc
        ),

      ctr:
        getMetaV2Movement(
          current.ctr,
          previous.ctr
        ),

      lpvRate:
        getMetaV2Movement(
          current.lpvRate,
          previous.lpvRate
        ),

      atcRate:
        getMetaV2Movement(
          current.atcRate,
          previous.atcRate
        ),
    },
  };
}

export function getMetaV2MondayWeekKey(
  dateKey: string
): string {
  if (!dateKey) {
    return "";
  }

  const date =
    new Date(
      `${dateKey}T00:00:00Z`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const day =
    date.getUTCDay() || 7;

  date.setUTCDate(
    date.getUTCDate() -
      day +
      1
  );

  return date
    .toISOString()
    .slice(0, 10);
}

export function getMetaV2MonthLabel(
  monthKey: string
): string {
  return formatMetaV2MonthLabel(
    monthKey
  );
}

export function getMetaV2AvailableRange(
  rows: MetaV2CleanRow[]
): MetaV2DateRange {
  return getMetaV2DateRange(
    rows.filter(
      (row) =>
        Boolean(row.date)
    )
  );
}
