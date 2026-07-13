import {
  clampMetaV2Number,
  filterMetaV2RowsByDateRange,
  getMetaV2DateRange,
  getMetaV2InclusiveDateRange,
  getMetaV2RelativeChange,
  groupMetaV2RowsByAd,
  groupMetaV2RowsByKey,
  addMetaV2Days,
} from "@/lib/meta-v2/engineUtils";

import {
  getMetaV2Decision,
  type MetaV2DecisionResult,
} from "@/lib/meta-v2/decisionRules";

import {
  calculateMetaV2Totals,
} from "@/lib/meta-v2/metrics";

import type {
  MetaV2CleanRow,
  MetaV2Settings,
  MetaV2Totals,
} from "@/lib/meta-v2/schema";

export interface MetaV2PriorityTrendRow {
  date: string;
  spend: number;
  cpm: number;
  ctr: number;
  cpa: number;
  aov: number;
  roas: number;
  purchases: number;
}

export interface MetaV2PriorityItem {
  id: string;

  adName: string;
  campaignName: string;
  adSetName: string;

  latestDate: string;

  trend:
    MetaV2PriorityTrendRow[];

  lifetime: MetaV2Totals;
  last7: MetaV2Totals;
  previous7: MetaV2Totals;

  cpaChangeVsLifetime: number;
  roasChangeVsLifetime: number;
  ctrChangeVsLifetime: number;
  cpmChangeVsLifetime: number;
  spendChange7d: number;

  incrementalSpend: number;
  incrementalRevenue: number;

  descalingScore: number;
  scalingScore: number;

  descalingSignals:
    string[];

  scalingSignals:
    string[];

  primaryIssue: string;
  scalingReason: string;

  descalingAction: string;
  scalingAction: string;

  decision:
    MetaV2DecisionResult;
}

export interface MetaV2PriorityOutput {
  latestDate: string;

  descaling:
    MetaV2PriorityItem[];

  scaling:
    MetaV2PriorityItem[];

  descalingSpend: number;
  scalingSpend: number;
}

function buildDailyTrend(
  rows: MetaV2CleanRow[]
): MetaV2PriorityTrendRow[] {
  const groups =
    groupMetaV2RowsByKey(
      rows,
      (row) => row.date
    );

  return Array.from(
    groups.entries()
  )
    .map(
      ([
        date,
        dateRows,
      ]) => {
        const totals =
          calculateMetaV2Totals(
            dateRows
          );

        return {
          date,
          spend:
            totals.spend,
          cpm: totals.cpm,
          ctr: totals.ctr,
          cpa:
            totals.purchases >
            0
              ? totals.cpa
              : 0,
          aov:
            totals.purchases >
            0
              ? totals.aov
              : 0,
          roas:
            totals.roas,
          purchases:
            totals.purchases,
        };
      }
    )
    .sort(
      (left, right) =>
        left.date.localeCompare(
          right.date
        )
    );
}

export function buildMetaV2PriorityMatrix(
  rows: MetaV2CleanRow[],
  settings: MetaV2Settings
): MetaV2PriorityOutput {
  const latestDate =
    getMetaV2DateRange(
      rows
    ).endDate;

  const last7Range =
    getMetaV2InclusiveDateRange(
      latestDate,
      7
    );

  const previous7End =
    addMetaV2Days(
      latestDate,
      -7
    );

  const previous7Range =
    getMetaV2InclusiveDateRange(
      previous7End,
      7
    );

  const activeAdIds =
    new Set(
      rows
        .filter(
          (row) =>
            row.date ===
              latestDate &&
            row.spend > 0
        )
        .map(
          (row) =>
            row.adId ||
            [
              row.campaignName,
              row.adSetName,
              row.adName,
            ].join(" > ")
        )
    );

  const grouped =
    groupMetaV2RowsByAd(
      rows.filter(
        (row) =>
          activeAdIds.has(
            row.adId ||
              [
                row.campaignName,
                row.adSetName,
                row.adName,
              ].join(" > ")
          )
      )
    );

  const items =
    Array.from(
      grouped.entries()
    ).map(
      ([
        id,
        adRows,
      ]): MetaV2PriorityItem => {
        const sample =
          adRows[0];

        const lifetime =
          calculateMetaV2Totals(
            adRows
          );

        const last7 =
          calculateMetaV2Totals(
            filterMetaV2RowsByDateRange(
              adRows,
              last7Range
            )
          );

        const previous7 =
          calculateMetaV2Totals(
            filterMetaV2RowsByDateRange(
              adRows,
              previous7Range
            )
          );

        const cpaChangeVsLifetime =
          getMetaV2RelativeChange(
            last7.cpa,
            lifetime.cpa
          );

        const roasChangeVsLifetime =
          getMetaV2RelativeChange(
            last7.roas,
            lifetime.roas
          );

        const ctrChangeVsLifetime =
          getMetaV2RelativeChange(
            last7.ctr,
            lifetime.ctr
          );

        const cpmChangeVsLifetime =
          getMetaV2RelativeChange(
            last7.cpm,
            lifetime.cpm
          );

        const spendChange7d =
          getMetaV2RelativeChange(
            last7.spend,
            previous7.spend
          );

        const incrementalSpend =
          last7.spend -
          previous7.spend;

        const incrementalRevenue =
          last7.revenue -
          previous7.revenue;

        const cpaDecay =
          last7.spend >= 1000 &&
          last7.purchases >= 1 &&
          lifetime.cpa > 0 &&
          last7.cpa >=
            lifetime.cpa *
              1.25;

        const roasDecay =
          last7.spend >= 1000 &&
          lifetime.roas > 0 &&
          last7.roas <=
            lifetime.roas *
              0.8;

        const attentionDecay =
          last7.impressions >=
            1000 &&
          lifetime.ctr > 0 &&
          lifetime.cpm > 0 &&
          last7.ctr <=
            lifetime.ctr *
              0.85 &&
          last7.cpm >=
            lifetime.cpm *
              1.1;

        const badScale =
          previous7.spend > 0 &&
          last7.spend >=
            previous7.spend *
              1.1 &&
          (
            (
              previous7.cpa >
                0 &&
              last7.cpa >=
                previous7.cpa *
                  1.15
            ) ||
            (
              previous7.roas >
                0 &&
              last7.roas <=
                previous7.roas *
                  0.85
            )
          );

        const scaleFatigue =
          previous7.spend > 0 &&
          last7.spend >
            previous7.spend &&
          previous7.cpa > 0 &&
          previous7.roas > 0 &&
          last7.cpa >
            previous7.cpa &&
          last7.roas <
            previous7.roas;

        const efficientScale =
          previous7.spend > 0 &&
          last7.spend >=
            previous7.spend *
              1.1 &&
          (
            (
              previous7.cpa >
                0 &&
              last7.cpa <=
                previous7.cpa *
                  0.9
            ) ||
            (
              previous7.roas >
                0 &&
              last7.roas >=
                previous7.roas *
                  1.1
            )
          );

        const underfedWinner =
          last7.spend <=
            3000 &&
          last7.purchases >=
            2 &&
          last7.roas >=
            1.2 &&
          lifetime.cpa > 0 &&
          last7.cpa <=
            lifetime.cpa;

        const spendRiskScore =
          clampMetaV2Number(
            last7.spend / 400,
            0,
            25
          );

        const cpaDecayScore =
          cpaDecay
            ? clampMetaV2Number(
                cpaChangeVsLifetime *
                  60,
                10,
                25
              )
            : 0;

        const roasDecayScore =
          roasDecay
            ? clampMetaV2Number(
                Math.abs(
                  roasChangeVsLifetime
                ) * 70,
                10,
                25
              )
            : 0;

        const attentionScore =
          attentionDecay
            ? clampMetaV2Number(
                Math.abs(
                  ctrChangeVsLifetime
                ) *
                  40 +
                  cpmChangeVsLifetime *
                    25,
                8,
                15
              )
            : 0;

        const badScaleScore =
          badScale ? 30 : 0;

        const scaleFatigueScore =
          scaleFatigue
            ? 25
            : 0;

        const efficientScaleScore =
          efficientScale
            ? 25
            : 0;

        const underfedWinnerScore =
          underfedWinner
            ? 30
            : 0;

        const opportunitySpendScore =
          underfedWinner
            ? clampMetaV2Number(
                (
                  3000 -
                  last7.spend
                ) / 150,
                0,
                20
              )
            : 0;

        const descalingScore =
          Math.round(
            cpaDecayScore +
              roasDecayScore +
              attentionScore +
              badScaleScore +
              scaleFatigueScore +
              spendRiskScore
          );

        const scalingScore =
          Math.round(
            efficientScaleScore +
              underfedWinnerScore +
              opportunitySpendScore +
              clampMetaV2Number(
                last7.roas * 5,
                0,
                15
              )
          );

        const descalingSignals =
          [
            badScale
              ? "Bad Scale"
              : null,

            scaleFatigue
              ? "Scale Fatigue"
              : null,

            cpaDecay
              ? "CPA Decay"
              : null,

            roasDecay
              ? "ROAS Decay"
              : null,

            attentionDecay
              ? "Attention Decay"
              : null,
          ].filter(
            (
              signal
            ): signal is string =>
              Boolean(signal)
          );

        const scalingSignals =
          [
            efficientScale
              ? "Efficient Scale"
              : null,

            underfedWinner
              ? "Underfed Winner"
              : null,
          ].filter(
            (
              signal
            ): signal is string =>
              Boolean(signal)
          );

        let primaryIssue =
          "Watch";

        if (badScale) {
          primaryIssue =
            "Bad Scale";
        } else if (
          scaleFatigue
        ) {
          primaryIssue =
            "Scale Fatigue";
        } else if (
          cpaDecay &&
          roasDecay
        ) {
          primaryIssue =
            "CPA + ROAS Decay";
        } else if (
          roasDecay
        ) {
          primaryIssue =
            "ROAS Decay";
        } else if (
          cpaDecay
        ) {
          primaryIssue =
            "CPA Decay";
        } else if (
          attentionDecay
        ) {
          primaryIssue =
            "Attention Decay";
        }

        let scalingReason =
          "No Scale Signal";

        if (underfedWinner) {
          scalingReason =
            "Underfed Winner";
        } else if (
          efficientScale
        ) {
          scalingReason =
            "Efficient Scale";
        }

        let descalingAction =
          "Watch";

        if (
          badScale ||
          scaleFatigue
        ) {
          descalingAction =
            "Do Not Scale / Reduce";
        }

        if (
          cpaDecay &&
          roasDecay
        ) {
          descalingAction =
            "Refresh or Pause";
        }

        if (
          attentionDecay &&
          !cpaDecay &&
          !roasDecay
        ) {
          descalingAction =
            "Refresh Creative";
        }

        let scalingAction =
          "Hold";

        if (underfedWinner) {
          scalingAction =
            "Increase Budget Carefully";
        }

        if (efficientScale) {
          scalingAction =
            "Eligible to Scale";
        }

        return {
          id,
          adName:
            sample?.adName ??
            "Unknown Ad",
          campaignName:
            sample?.campaignName ??
            "Unknown Campaign",
          adSetName:
            sample?.adSetName ??
            "Unknown Ad Set",
          latestDate,
          trend:
            buildDailyTrend(
              adRows
            ),
          lifetime,
          last7,
          previous7,
          cpaChangeVsLifetime,
          roasChangeVsLifetime,
          ctrChangeVsLifetime,
          cpmChangeVsLifetime,
          spendChange7d,
          incrementalSpend,
          incrementalRevenue,
          descalingScore,
          scalingScore,
          descalingSignals,
          scalingSignals,
          primaryIssue,
          scalingReason,
          descalingAction,
          scalingAction,
          decision:
            getMetaV2Decision(
              last7,
              settings
            ),
        };
      }
    );

  const descaling =
    items
      .filter(
        (item) =>
          item.descalingScore >=
          25
      )
      .sort(
        (left, right) =>
          right.descalingScore -
          left.descalingScore
      );

  const scaling =
    items
      .filter(
        (item) =>
          item.scalingScore >=
            30 &&
          item.descalingScore <
            45
      )
      .sort(
        (left, right) =>
          right.scalingScore -
          left.scalingScore
      );

  return {
    latestDate,
    descaling,
    scaling,

    descalingSpend:
      descaling.reduce(
        (sum, item) =>
          sum +
          item.last7.spend,
        0
      ),

    scalingSpend:
      scaling.reduce(
        (sum, item) =>
          sum +
          item.last7.spend,
        0
      ),
  };
}
