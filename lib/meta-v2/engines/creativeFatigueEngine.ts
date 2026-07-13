import {
  calculateMetaV2AnalysisTotals,
  getMetaV2Movement,
  type MetaV2AnalysisTotals,
} from "@/lib/meta-v2/analysisLayerUtils";

import {
  addMetaV2Days,
  filterMetaV2LiveRows,
  filterMetaV2RowsByDateRange,
  getMetaV2EconomicAdKey,
  getMetaV2InclusiveDateRange,
  getMetaV2LatestDate,
  groupMetaV2RowsByKey,
  type MetaV2DateRange,
} from "@/lib/meta-v2/engineUtils";

import type {
  MetaV2CleanRow,
} from "@/lib/meta-v2/schema";

export interface MetaV2CreativeFatigueItem {
  id: string;

  adName: string;
  handle: string;
  campaignName: string;
  adSetName: string;

  current:
    MetaV2AnalysisTotals;

  previous:
    MetaV2AnalysisTotals;

  yesterday:
    MetaV2AnalysisTotals;

  cpmChange: number;
  ctrChange: number;

  cpmFatigue: boolean;
  ctrFatigue: boolean;
  thumbstopFatigue: boolean;
  frequencyFatigue: boolean;

  signalCount: number;

  risk:
    | "refresh_priority"
    | "watch"
    | "healthy";

  signals: string[];
}

export interface MetaV2CreativeFatigueOutput {
  latestDate: string;

  currentRange:
    MetaV2DateRange;

  previousRange:
    MetaV2DateRange;

  minSignals: number;

  items:
    MetaV2CreativeFatigueItem[];

  fatigued:
    MetaV2CreativeFatigueItem[];

  highRisk:
    MetaV2CreativeFatigueItem[];

  monitored:
    MetaV2CreativeFatigueItem[];

  totalFatiguedSpend: number;
}

function getCreativeHandle(
  adName: string
): string {
  return String(
    adName || ""
  )
    .split(" - ")[0]
    .replace(
      /[|·,\s]+$/g,
      ""
    )
    .trim();
}

export function buildMetaV2CreativeFatigue(
  rows: MetaV2CleanRow[],
  minSignals = 2
): MetaV2CreativeFatigueOutput {
  const safeMinSignals =
    Math.max(
      1,
      Math.min(
        4,
        Math.floor(
          Number.isFinite(
            minSignals
          )
            ? minSignals
            : 2
        )
      )
    );

  const liveRows =
    filterMetaV2LiveRows(
      rows
    ).filter(
      (row) =>
        Boolean(row.date)
    );

  const latestDate =
    getMetaV2LatestDate(
      liveRows
    );

  const currentRange =
    getMetaV2InclusiveDateRange(
      latestDate,
      7
    );

  const previousEnd =
    addMetaV2Days(
      currentRange.startDate,
      -1
    );

  const previousRange =
    getMetaV2InclusiveDateRange(
      previousEnd,
      7
    );

  const activeIds =
    new Set(
      liveRows
        .filter(
          (row) =>
            row.date ===
              latestDate &&
            row.spend > 0
        )
        .map(
          (row) =>
            getMetaV2EconomicAdKey(
              row
            )
        )
        .filter(Boolean)
    );

  const groups =
    groupMetaV2RowsByKey(
      liveRows.filter(
        (row) =>
          activeIds.has(
            getMetaV2EconomicAdKey(
              row
            )
          )
      ),
      (row) =>
        getMetaV2EconomicAdKey(
          row
        )
    );

  const items =
    Array.from(
      groups.entries()
    )
      .map(
        ([
          id,
          adRows,
        ]): MetaV2CreativeFatigueItem => {
          const sample =
            adRows[0];

          const current =
            calculateMetaV2AnalysisTotals(
              filterMetaV2RowsByDateRange(
                adRows,
                currentRange
              )
            );

          const previous =
            calculateMetaV2AnalysisTotals(
              filterMetaV2RowsByDateRange(
                adRows,
                previousRange
              )
            );

          const yesterday =
            calculateMetaV2AnalysisTotals(
              adRows.filter(
                (row) =>
                  row.date ===
                  latestDate
              )
            );

          const cpmChange =
            getMetaV2Movement(
              current.cpm,
              previous.cpm
            ).relative * 100;

          const ctrChange =
            getMetaV2Movement(
              current.ctr,
              previous.ctr
            ).relative * 100;

          const cpmFatigue =
            previous.cpm > 0 &&
            cpmChange >= 20;

          const ctrFatigue =
            previous.ctr > 0 &&
            ctrChange <= -15;

          const thumbstopFatigue =
            current.impressions >
              0 &&
            current.thumbstop >
              0 &&
            current.thumbstop <
              25;

          const frequencyFatigue =
            current.frequency >
            3;

          const signalCount =
            [
              cpmFatigue,
              ctrFatigue,
              thumbstopFatigue,
              frequencyFatigue,
            ].filter(Boolean)
              .length;

          const signals = [
            cpmFatigue
              ? "CPM up 20%+ versus previous 7D"
              : "",

            ctrFatigue
              ? "CTR down 15%+ versus previous 7D"
              : "",

            thumbstopFatigue
              ? "Thumbstop below 25%"
              : "",

            frequencyFatigue
              ? "Frequency above 3.0"
              : "",
          ].filter(Boolean);

          return {
            id,

            adName:
              sample?.adName ??
              "Unknown Ad",

            handle:
              getCreativeHandle(
                sample?.adName ??
                  "Unknown Ad"
              ),

            campaignName:
              sample?.campaignName ??
              "Unknown Campaign",

            adSetName:
              sample?.adSetName ??
              "Unknown Ad Set",

            current,
            previous,
            yesterday,
            cpmChange,
            ctrChange,
            cpmFatigue,
            ctrFatigue,
            thumbstopFatigue,
            frequencyFatigue,
            signalCount,

            risk:
              signalCount >= 3
                ? "refresh_priority"
                : signalCount > 0
                  ? "watch"
                  : "healthy",

            signals,
          };
        }
      )
      .filter(
        (item) =>
          item.current.spend > 0
      )
      .sort(
        (left, right) =>
          right.signalCount -
            left.signalCount ||
          right.current.spend -
            left.current.spend
      );

  const fatigued =
    items.filter(
      (item) =>
        item.signalCount >=
        safeMinSignals
    );

  const highRisk =
    items.filter(
      (item) =>
        item.signalCount >= 3
    );

  const monitored =
    items.filter(
      (item) =>
        item.signalCount > 0 &&
        item.signalCount <
          safeMinSignals
    );

  return {
    latestDate,
    currentRange,
    previousRange,
    minSignals:
      safeMinSignals,
    items,
    fatigued,
    highRisk,
    monitored,

    totalFatiguedSpend:
      fatigued.reduce(
        (sum, item) =>
          sum +
          item.current.spend,
        0
      ),
  };
}
