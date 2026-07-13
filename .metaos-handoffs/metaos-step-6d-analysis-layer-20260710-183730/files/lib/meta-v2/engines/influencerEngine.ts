import {
  filterMetaV2RowsByDateRange,
  getMetaV2DateRange,
  getMetaV2InclusiveDateRange,
  groupMetaV2RowsByKey,
} from "@/lib/meta-v2/engineUtils";

import {
  calculateMetaV2Totals,
} from "@/lib/meta-v2/metrics";

import type {
  MetaV2CleanRow,
  MetaV2Totals,
} from "@/lib/meta-v2/schema";

export type MetaV2InfluencerRisk =
  | "Top Spender"
  | "Approval Check"
  | "Monitor";

export interface MetaV2InfluencerItem {
  id: string;

  creativeName: string;
  adName: string;
  campaignName: string;
  adSetName: string;

  risk:
    MetaV2InfluencerRisk;

  yesterday:
    MetaV2Totals;

  last7:
    MetaV2Totals;

  last14:
    MetaV2Totals;

  last30:
    MetaV2Totals;
}

export interface MetaV2InfluencerOutput {
  latestDate: string;

  threshold: number;
  query: string;

  items:
    MetaV2InfluencerItem[];

  totalYesterdaySpend: number;
  topSpenders: number;
}

function hasInfluencerIntent(
  row: MetaV2CleanRow
): boolean {
  const text = [
    row.creativeName,
    row.adName,
    row.adSetName,
    row.campaignName,
  ]
    .join(" ")
    .toLowerCase();

  return (
    text.includes("collab") ||
    text.includes("creator") ||
    text.includes("influencer") ||
    text.includes("partnership") ||
    text.includes(
      "paid partnership"
    ) ||
    text.includes("@")
  );
}

export function buildMetaV2InfluencerQueue(
  rows: MetaV2CleanRow[],
  threshold = 5000,
  query = ""
): MetaV2InfluencerOutput {
  const validRows =
    rows.filter(
      (row) =>
        Boolean(row.date)
    );

  const latestDate =
    getMetaV2DateRange(
      validRows
    ).endDate;

  const yesterdayRange =
    getMetaV2InclusiveDateRange(
      latestDate,
      1
    );

  const last7Range =
    getMetaV2InclusiveDateRange(
      latestDate,
      7
    );

  const last14Range =
    getMetaV2InclusiveDateRange(
      latestDate,
      14
    );

  const last30Range =
    getMetaV2InclusiveDateRange(
      latestDate,
      30
    );

  const influencerRows =
    validRows.filter(
      hasInfluencerIntent
    );

  const groups =
    groupMetaV2RowsByKey(
      influencerRows,
      (row) =>
        [
          row.creativeName ||
            row.adName,
          row.adName,
          row.adSetName,
          row.campaignName,
        ].join(" || ")
    );

  const normalizedQuery =
    query.trim().toLowerCase();

  const items =
    Array.from(
      groups.entries()
    )
      .map(
        ([
          id,
          itemRows,
        ]): MetaV2InfluencerItem => {
          const sample =
            itemRows[0];

          const yesterday =
            calculateMetaV2Totals(
              filterMetaV2RowsByDateRange(
                itemRows,
                yesterdayRange
              )
            );

          const last7 =
            calculateMetaV2Totals(
              filterMetaV2RowsByDateRange(
                itemRows,
                last7Range
              )
            );

          const last14 =
            calculateMetaV2Totals(
              filterMetaV2RowsByDateRange(
                itemRows,
                last14Range
              )
            );

          const last30 =
            calculateMetaV2Totals(
              filterMetaV2RowsByDateRange(
                itemRows,
                last30Range
              )
            );

          const risk:
            MetaV2InfluencerRisk =
            yesterday.spend >=
            25000
              ? "Top Spender"
              : yesterday.spend >=
                  5000
                ? "Approval Check"
                : "Monitor";

          return {
            id,
            creativeName:
              sample
                ?.creativeName ||
              sample?.adName ||
              "Unknown Creative",
            adName:
              sample?.adName ||
              "Unknown Ad",
            campaignName:
              sample
                ?.campaignName ||
              "Unknown Campaign",
            adSetName:
              sample
                ?.adSetName ||
              "Unknown Ad Set",
            risk,
            yesterday,
            last7,
            last14,
            last30,
          };
        }
      )
      .filter(
        (item) =>
          item.yesterday
            .spend >=
          Math.max(
            0,
            threshold
          )
      )
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }

        return [
          item.creativeName,
          item.adName,
          item.adSetName,
          item.campaignName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(
            normalizedQuery
          );
      });

  return {
    latestDate,
    threshold:
      Math.max(
        0,
        threshold
      ),
    query,
    items,

    totalYesterdaySpend:
      items.reduce(
        (sum, item) =>
          sum +
          item.yesterday
            .spend,
        0
      ),

    topSpenders:
      items.filter(
        (item) =>
          item.yesterday
            .spend >=
          25000
      ).length,
  };
}
