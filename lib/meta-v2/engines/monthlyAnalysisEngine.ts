import {
  calculateMetaV2AnalysisTotals,
  getMetaV2MondayWeekKey,
  getMetaV2MonthLabel,
  getMetaV2Movement,
  type MetaV2AnalysisTotals,
  type MetaV2PeriodMovement,
} from "@/lib/meta-v2/analysisLayerUtils";

import {
  groupMetaV2RowsByKey,
} from "@/lib/meta-v2/engineUtils";

import type {
  MetaV2CleanRow,
} from "@/lib/meta-v2/schema";

export type MetaV2MonthlySpendOutcome =
  | "efficient_growth"
  | "inefficient_growth"
  | "contraction_decline"
  | "neutral";

export type MetaV2MonthlyCpaOutcome =
  | "improving"
  | "worsening"
  | "stable";

export interface MetaV2MonthlyRow {
  month: string;
  label: string;

  metrics:
    MetaV2AnalysisTotals;

  priorMonth:
    string | null;

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
  };

  spendOutcome:
    MetaV2MonthlySpendOutcome;

  cpaOutcome:
    MetaV2MonthlyCpaOutcome;
}

export interface MetaV2WeeklyRow {
  week: string;
  month: string;
  monthLabel: string;
  monthTick: string;

  metrics:
    MetaV2AnalysisTotals;

  spendLog: number;
  cpa: number | null;
}

export interface MetaV2MonthlyAnalysisOutput {
  monthlyRows:
    MetaV2MonthlyRow[];

  weeklyRows:
    MetaV2WeeklyRow[];

  current:
    MetaV2MonthlyRow |
    null;

  prior:
    MetaV2MonthlyRow |
    null;

  currentMovement: {
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
  };
}

function getSpendOutcome(
  spendMovement:
    MetaV2PeriodMovement,
  roasMovement:
    MetaV2PeriodMovement,
  hasPrior: boolean
): MetaV2MonthlySpendOutcome {
  if (!hasPrior) {
    return "neutral";
  }

  if (
    spendMovement.absolute >
      0 &&
    roasMovement.relative >=
      0
  ) {
    return "efficient_growth";
  }

  if (
    spendMovement.absolute >
      0 &&
    roasMovement.relative <
      0
  ) {
    return "inefficient_growth";
  }

  if (
    spendMovement.absolute <
      0 &&
    roasMovement.relative <
      0
  ) {
    return "contraction_decline";
  }

  return "neutral";
}

function getCpaOutcome(
  cpaMovement:
    MetaV2PeriodMovement,
  hasPrior: boolean
): MetaV2MonthlyCpaOutcome {
  if (
    !hasPrior ||
    cpaMovement.absolute ===
      0
  ) {
    return "stable";
  }

  return cpaMovement.absolute <
    0
    ? "improving"
    : "worsening";
}

export function buildMetaV2MonthlyAnalysis(
  rows: MetaV2CleanRow[]
): MetaV2MonthlyAnalysisOutput {
  const validRows =
    rows.filter(
      (row) =>
        Boolean(row.date)
    );

  const monthGroups =
    groupMetaV2RowsByKey(
      validRows,
      (row) =>
        row.monthKey
    );

  const baseMonths =
    Array.from(
      monthGroups.entries()
    )
      .filter(([month]) =>
        Boolean(month)
      )
      .sort(
        ([left], [right]) =>
          left.localeCompare(
            right
          )
      )
      .map(
        ([
          month,
          monthRows,
        ]) => ({
          month,

          label:
            getMetaV2MonthLabel(
              month
            ),

          metrics:
            calculateMetaV2AnalysisTotals(
              monthRows
            ),
        })
      );

  const monthlyRows =
    baseMonths.map(
      (
        row,
        index
      ): MetaV2MonthlyRow => {
        const prior =
          index > 0
            ? baseMonths[
                index - 1
              ]
            : null;

        const movement = {
          spend:
            getMetaV2Movement(
              row.metrics.spend,
              prior?.metrics
                .spend ?? 0
            ),

          revenue:
            getMetaV2Movement(
              row.metrics.revenue,
              prior?.metrics
                .revenue ?? 0
            ),

          purchases:
            getMetaV2Movement(
              row.metrics.purchases,
              prior?.metrics
                .purchases ?? 0
            ),

          roas:
            getMetaV2Movement(
              row.metrics.roas,
              prior?.metrics
                .roas ?? 0
            ),

          cpa:
            getMetaV2Movement(
              row.metrics.cpa,
              prior?.metrics
                .cpa ?? 0
            ),
        };

        return {
          ...row,

          priorMonth:
            prior?.month ?? null,

          movement,

          spendOutcome:
            getSpendOutcome(
              movement.spend,
              movement.roas,
              Boolean(prior)
            ),

          cpaOutcome:
            getCpaOutcome(
              movement.cpa,
              Boolean(prior)
            ),
        };
      }
    );

  const weekGroups =
    groupMetaV2RowsByKey(
      validRows,
      (row) =>
        getMetaV2MondayWeekKey(
          row.date
        )
    );

  const weeklyBase =
    Array.from(
      weekGroups.entries()
    )
      .filter(([week]) =>
        Boolean(week)
      )
      .sort(
        ([left], [right]) =>
          left.localeCompare(
            right
          )
      )
      .map(
        ([
          week,
          weekRows,
        ]) => {
          const month =
            week.slice(
              0,
              7
            );

          const metrics =
            calculateMetaV2AnalysisTotals(
              weekRows
            );

          return {
            week,
            month,

            monthLabel:
              getMetaV2MonthLabel(
                month
              ),

            metrics,

            spendLog:
              Math.max(
                metrics.spend,
                1
              ),

            cpa:
              metrics.cpa > 0
                ? metrics.cpa
                : null,
          };
        }
      );

  const seenMonths =
    new Set<string>();

  const weeklyRows =
    weeklyBase.map(
      (
        row
      ): MetaV2WeeklyRow => {
        const isFirstWeek =
          !seenMonths.has(
            row.month
          );

        seenMonths.add(
          row.month
        );

        return {
          ...row,

          monthTick:
            isFirstWeek
              ? row.monthLabel
              : "",
        };
      }
    );

  const current =
    monthlyRows.at(-1) ??
    null;

  const prior =
    monthlyRows.at(-2) ??
    null;

  return {
    monthlyRows,
    weeklyRows,
    current,
    prior,

    currentMovement: {
      spend:
        getMetaV2Movement(
          current?.metrics.spend ??
            0,
          prior?.metrics.spend ??
            0
        ),

      revenue:
        getMetaV2Movement(
          current?.metrics.revenue ??
            0,
          prior?.metrics.revenue ??
            0
        ),

      purchases:
        getMetaV2Movement(
          current?.metrics.purchases ??
            0,
          prior?.metrics.purchases ??
            0
        ),

      roas:
        getMetaV2Movement(
          current?.metrics.roas ??
            0,
          prior?.metrics.roas ??
            0
        ),

      cpa:
        getMetaV2Movement(
          current?.metrics.cpa ??
            0,
          prior?.metrics.cpa ??
            0
        ),
    },
  };
}
