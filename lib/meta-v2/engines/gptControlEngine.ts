import {
  filterMetaV2LiveRows,
  filterMetaV2RowsByDateRange,
  getMetaV2DateRange,
  getMetaV2EconomicAdKey,
  getMetaV2InclusiveDateRange,
} from "@/lib/meta-v2/engineUtils";

import { calculateMetaV2Totals } from "@/lib/meta-v2/metrics";

import type {
  MetaV2CleanRow,
  MetaV2Totals,
} from "@/lib/meta-v2/schema";

export interface MetaV2GptRiskItem {
  id: string;
  adName: string;
  campaignName: string;
  adSetName: string;
  lifetime: MetaV2Totals;
  last7: MetaV2Totals;
  yesterday: MetaV2Totals;
  campaignAverage: MetaV2Totals;
  cpaAboveCampaign: boolean;
  gptBelowCampaign: boolean;
  gptBelowTarget: boolean;
  reason: string;
  action: string;
}

export interface MetaV2GptControlOutput {
  latestDate: string;
  last7StartDate: string;
  last7EndDate: string;
  threshold: number;
  items: MetaV2GptRiskItem[];
  totalSpend: number;
  yesterdaySpend: number;
  weightedAverageGpt: number;
}

export function buildMetaV2GptControl(
  rows: MetaV2CleanRow[],
  threshold = 100
): MetaV2GptControlOutput {
  const safeThreshold = Number.isFinite(threshold)
    ? threshold
    : 0;

  const liveRows = filterMetaV2LiveRows(rows).filter(
    (row) => Boolean(row.date)
  );

  const latestDate = getMetaV2DateRange(liveRows).endDate;
  const last7Range = getMetaV2InclusiveDateRange(
    latestDate,
    7
  );

  const activeIds = new Set(
    liveRows
      .filter(
        (row) =>
          row.date === latestDate &&
          row.spend > 0
      )
      .map((row) => getMetaV2EconomicAdKey(row))
      .filter(Boolean)
  );

  const adGroups = new Map<string, MetaV2CleanRow[]>();
  const campaignGroups = new Map<
    string,
    MetaV2CleanRow[]
  >();

  for (const row of liveRows) {
    const adId = getMetaV2EconomicAdKey(row);

    if (!adId || !activeIds.has(adId)) continue;

    const adRows = adGroups.get(adId) ?? [];
    adRows.push(row);
    adGroups.set(adId, adRows);

    const campaignRows =
      campaignGroups.get(row.campaignName) ?? [];

    campaignRows.push(row);
    campaignGroups.set(row.campaignName, campaignRows);
  }

  const campaignMetrics = new Map<
    string,
    MetaV2Totals
  >();

  for (const [campaignName, campaignRows] of campaignGroups) {
    campaignMetrics.set(
      campaignName,
      calculateMetaV2Totals(campaignRows)
    );
  }

  const items = Array.from(adGroups.entries())
    .map(([id, adRows]): MetaV2GptRiskItem => {
      const sample = adRows[0];
      const lifetime = calculateMetaV2Totals(adRows);
      const last7 = calculateMetaV2Totals(
        filterMetaV2RowsByDateRange(
          adRows,
          last7Range
        )
      );
      const yesterday = calculateMetaV2Totals(
        adRows.filter((row) => row.date === latestDate)
      );
      const campaignAverage =
        campaignMetrics.get(sample?.campaignName ?? "") ??
        calculateMetaV2Totals([]);

      const cpaAboveCampaign =
        lifetime.purchases > 0 &&
        campaignAverage.purchases > 0 &&
        lifetime.cpa > campaignAverage.cpa;

      const gptBelowCampaign =
        lifetime.purchases > 0 &&
        campaignAverage.purchases > 0 &&
        lifetime.gpt < campaignAverage.gpt;

      const gptBelowTarget =
        lifetime.purchases > 0 &&
        lifetime.gpt < safeThreshold;

      return {
        id,
        adName: sample?.adName ?? "Unknown Ad",
        campaignName:
          sample?.campaignName ?? "Unknown Campaign",
        adSetName:
          sample?.adSetName ?? "Unknown Ad Set",
        lifetime,
        last7,
        yesterday,
        campaignAverage,
        cpaAboveCampaign,
        gptBelowCampaign,
        gptBelowTarget,
        reason:
          "CPA is above the active-campaign average while GPT is below both the active-campaign average and the selected target.",
        action:
          "Review the offer, AOV path, creator quality, and whether spend should continue.",
      };
    })
    .filter((item) => item.yesterday.spend > 0)
    .filter((item) => item.lifetime.purchases > 0)
    .filter((item) => item.cpaAboveCampaign)
    .filter((item) => item.gptBelowCampaign)
    .filter((item) => item.gptBelowTarget)
    .sort(
      (left, right) =>
        left.lifetime.gpt - right.lifetime.gpt ||
        right.yesterday.spend - left.yesterday.spend
    );

  const selectedIds = new Set(items.map((item) => item.id));
  const combined = calculateMetaV2Totals(
    liveRows.filter((row) =>
      selectedIds.has(getMetaV2EconomicAdKey(row))
    )
  );

  return {
    latestDate,
    last7StartDate: last7Range.startDate,
    last7EndDate: last7Range.endDate,
    threshold: safeThreshold,
    items,
    totalSpend: combined.spend,
    yesterdaySpend: items.reduce(
      (sum, item) => sum + item.yesterday.spend,
      0
    ),
    weightedAverageGpt: combined.gpt,
  };
}
