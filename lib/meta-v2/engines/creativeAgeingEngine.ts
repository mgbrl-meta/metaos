import {
  calculateMetaV2AnalysisTotals,
  getMetaV2MonthLabel,
  type MetaV2AnalysisTotals,
} from "@/lib/meta-v2/analysisLayerUtils";

import {
  addMetaV2Days,
  filterMetaV2RowsByDateRange,
  getMetaV2EconomicAdKey,
  getMetaV2InclusiveDateRange,
  groupMetaV2RowsByKey,
} from "@/lib/meta-v2/engineUtils";

import type {
  MetaV2CleanRow,
} from "@/lib/meta-v2/schema";

export const META_V2_CREATIVE_AGE_BUCKETS =
  [
    {
      key: "lte_7",
      label: "≤7D",
      min: 0,
      max: 7,
    },
    {
      key: "8_14",
      label: "8–14D",
      min: 8,
      max: 14,
    },
    {
      key: "15_30",
      label: "15–30D",
      min: 15,
      max: 30,
    },
    {
      key: "31_45",
      label: "31–45D",
      min: 31,
      max: 45,
    },
    {
      key: "46_60",
      label: "46–60D",
      min: 46,
      max: 60,
    },
    {
      key: "61_90",
      label: "61–90D",
      min: 61,
      max: 90,
    },
    {
      key: "91_120",
      label: "91–120D",
      min: 91,
      max: 120,
    },
    {
      key: "121_180",
      label: "121–180D",
      min: 121,
      max: 180,
    },
    {
      key: "181_240",
      label: "181–240D",
      min: 181,
      max: 240,
    },
    {
      key: "241_360",
      label: "241–360D",
      min: 241,
      max: 360,
    },
    {
      key: "gt_360",
      label: "360D+",
      min: 361,
      max:
        Number.POSITIVE_INFINITY,
    },
  ] as const;

export interface MetaV2CreativeAgeingMonthRow {
  month: string;
  label: string;

  newCreatives: number;
  oldCreatives: number;

  newMetrics:
    MetaV2AnalysisTotals;

  oldMetrics:
    MetaV2AnalysisTotals;

  totalSpend: number;
  newSpendShare: number;
}

export interface MetaV2CreativeAgeBucketRow {
  key: string;
  bucket: string;

  creativeCount: number;

  metrics:
    MetaV2AnalysisTotals;
}

export interface MetaV2CreativeAgeingOutput {
  latestDate: string;
  latest30StartDate: string;

  monthlyRows:
    MetaV2CreativeAgeingMonthRow[];

  chartMonths:
    MetaV2CreativeAgeingMonthRow[];

  ageRows:
    MetaV2CreativeAgeBucketRow[];

  totals:
    MetaV2AnalysisTotals;

  latestMonth:
    MetaV2CreativeAgeingMonthRow |
    null;

  totalCreatives: number;
  totalFirstSeenMonths: number;
}

function differenceInMetaV2Days(
  startDate: string,
  endDate: string
): number {
  if (
    !startDate ||
    !endDate
  ) {
    return 0;
  }

  const start =
    new Date(
      `${startDate}T00:00:00Z`
    );

  const end =
    new Date(
      `${endDate}T00:00:00Z`
    );

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (
        end.getTime() -
        start.getTime()
      ) /
        86_400_000
    )
  );
}

function getMetaV2CreativeAgeBucket(
  ageDays: number
) {
  return (
    META_V2_CREATIVE_AGE_BUCKETS.find(
      (bucket) =>
        ageDays >=
          bucket.min &&
        ageDays <=
          bucket.max
    ) ??
    META_V2_CREATIVE_AGE_BUCKETS[
      META_V2_CREATIVE_AGE_BUCKETS.length -
        1
    ]
  );
}

export function buildMetaV2CreativeAgeing(
  rows: MetaV2CleanRow[]
): MetaV2CreativeAgeingOutput {
  /**
   * Preserve the legacy Ageing contract:
   * this screen analyses all valid historical rows,
   * not only currently live ads.
   */
  const validRows =
    rows.filter(
      (row) =>
        Boolean(row.date)
    );

  const dates =
    Array.from(
      new Set(
        validRows.map(
          (row) => row.date
        )
      )
    ).sort();

  const latestDate =
    dates.at(-1) || "";

  const latest30StartDate =
    addMetaV2Days(
      latestDate,
      -29
    );

  const firstSeenByAd =
    new Map<
      string,
      string
    >();

  for (const row of validRows) {
    const adKey =
      getMetaV2EconomicAdKey(
        row
      );

    if (!adKey) {
      continue;
    }

    const current =
      firstSeenByAd.get(
        adKey
      );

    if (
      !current ||
      row.date < current
    ) {
      firstSeenByAd.set(
        adKey,
        row.date
      );
    }
  }

  const allMonths =
    Array.from(
      new Set(
        validRows
          .map(
            (row) =>
              row.monthKey
          )
          .filter(Boolean)
      )
    ).sort();

  const last12Months =
    allMonths.slice(-12);

  const monthlyRows =
    last12Months
      .map(
        (
          month
        ): MetaV2CreativeAgeingMonthRow => {
          const monthRows =
            validRows.filter(
              (row) =>
                row.monthKey ===
                month
            );

          const newRows =
            monthRows.filter(
              (row) => {
                const firstSeen =
                  firstSeenByAd.get(
                    getMetaV2EconomicAdKey(
                      row
                    )
                  ) || "";

                return (
                  firstSeen.slice(
                    0,
                    7
                  ) === month
                );
              }
            );

          const oldRows =
            monthRows.filter(
              (row) => {
                const firstSeen =
                  firstSeenByAd.get(
                    getMetaV2EconomicAdKey(
                      row
                    )
                  ) || "";

                const firstMonth =
                  firstSeen.slice(
                    0,
                    7
                  );

                return (
                  Boolean(
                    firstMonth
                  ) &&
                  firstMonth < month
                );
              }
            );

          const newCreativeIds =
            new Set(
              Array.from(
                firstSeenByAd.entries()
              )
                .filter(
                  ([
                    ,
                    firstSeen,
                  ]) =>
                    firstSeen.slice(
                      0,
                      7
                    ) === month
                )
                .map(
                  ([adId]) =>
                    adId
                )
            );

          const oldCreativeIds =
            new Set(
              oldRows.map(
                (row) =>
                  getMetaV2EconomicAdKey(
                    row
                  )
              )
            );

          const newMetrics =
            calculateMetaV2AnalysisTotals(
              newRows
            );

          const oldMetrics =
            calculateMetaV2AnalysisTotals(
              oldRows
            );

          const totalSpend =
            newMetrics.spend +
            oldMetrics.spend;

          return {
            month,

            label:
              getMetaV2MonthLabel(
                month
              ),

            newCreatives:
              newCreativeIds.size,

            oldCreatives:
              oldCreativeIds.size,

            newMetrics,
            oldMetrics,
            totalSpend,

            newSpendShare:
              totalSpend > 0
                ? newMetrics.spend /
                  totalSpend
                : 0,
          };
        }
      )
      .sort(
        (left, right) =>
          right.month.localeCompare(
            left.month
          )
      );

  const latest30Range =
    getMetaV2InclusiveDateRange(
      latestDate,
      30
    );

  const latestWindowRows =
    filterMetaV2RowsByDateRange(
      validRows,
      latest30Range
    );

  const ageGroups =
    new Map<
      string,
      MetaV2CleanRow[]
    >();

  for (
    const row of
    latestWindowRows
  ) {
    const adKey =
      getMetaV2EconomicAdKey(
        row
      );

    const firstSeen =
      firstSeenByAd.get(
        adKey
      ) || row.date;

    /**
     * Preserve the legacy row-level ageing behavior.
     * One creative can contribute to more than one bucket
     * if it crosses a boundary during the latest 30-day window.
     */
    const ageDays =
      differenceInMetaV2Days(
        firstSeen,
        row.date
      ) + 1;

    const bucket =
      getMetaV2CreativeAgeBucket(
        ageDays
      );

    const current =
      ageGroups.get(
        bucket.key
      ) ?? [];

    current.push(row);

    ageGroups.set(
      bucket.key,
      current
    );
  }

  const ageRows =
    META_V2_CREATIVE_AGE_BUCKETS.map(
      (
        bucket
      ): MetaV2CreativeAgeBucketRow => {
        const bucketRows =
          ageGroups.get(
            bucket.key
          ) ?? [];

        return {
          key:
            bucket.key,

          bucket:
            bucket.label,

          creativeCount:
            new Set(
              bucketRows.map(
                (row) =>
                  getMetaV2EconomicAdKey(
                    row
                  )
              )
            ).size,

          metrics:
            calculateMetaV2AnalysisTotals(
              bucketRows
            ),
        };
      }
    );

  return {
    latestDate,
    latest30StartDate,
    monthlyRows,

    chartMonths:
      monthlyRows
        .slice()
        .reverse(),

    ageRows,

    totals:
      calculateMetaV2AnalysisTotals(
        validRows
      ),

    latestMonth:
      monthlyRows[0] ??
      null,

    totalCreatives:
      firstSeenByAd.size,

    totalFirstSeenMonths:
      last12Months.length,
  };
}
