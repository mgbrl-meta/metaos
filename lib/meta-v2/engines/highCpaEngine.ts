import {
  buildMetaV2EconomicBaseItem,
  buildMetaV2EconomicCampaignRows,
  getMetaV2ActiveSpendAdGroups,
  type MetaV2EconomicBaseItem,
  type MetaV2EconomicCampaignRow,
} from "@/lib/meta-v2/economicControlUtils";

import { getMetaV2EconomicAdKey } from "@/lib/meta-v2/engineUtils";
import { calculateMetaV2Totals } from "@/lib/meta-v2/metrics";

import type {
  MetaV2CleanRow,
  MetaV2Totals,
} from "@/lib/meta-v2/schema";

export type MetaV2HighCpaState =
  | "persistent"
  | "improving"
  | "no_recent_purchase"
  | "threshold_match";

export interface MetaV2HighCpaItem
  extends MetaV2EconomicBaseItem {
  state: MetaV2HighCpaState;
  reason: string;
  action: string;
}

export interface MetaV2HighCpaOutput {
  latestDate: string;
  threshold: number;
  items: MetaV2HighCpaItem[];
  persistentItems: MetaV2HighCpaItem[];
  improvingItems: MetaV2HighCpaItem[];
  noRecentPurchaseItems: MetaV2HighCpaItem[];
  campaigns: MetaV2EconomicCampaignRow[];
  totals: MetaV2Totals;
  yesterdaySpend: number;
}

function getState(
  item: MetaV2EconomicBaseItem,
  threshold: number
): MetaV2HighCpaState {
  if (
    item.lifetime.cpa > threshold &&
    item.last7.purchases > 0 &&
    item.last7.cpa > threshold
  ) {
    return "persistent";
  }

  if (
    item.lifetime.cpa > threshold &&
    item.last7.purchases > 0 &&
    item.last7.cpa <= threshold
  ) {
    return "improving";
  }

  if (
    item.lifetime.cpa > threshold &&
    item.last7.spend > 0 &&
    item.last7.purchases <= 0
  ) {
    return "no_recent_purchase";
  }

  return "threshold_match";
}

function getReason(
  state: MetaV2HighCpaState,
  threshold: number
): string {
  if (state === "persistent") {
    return `Lifetime and L7D CPA are both above ₹${Math.round(
      threshold
    ).toLocaleString("en-IN")}.`;
  }

  if (state === "improving") {
    return "Lifetime CPA is above target, but L7D CPA has improved to the selected threshold or better.";
  }

  if (state === "no_recent_purchase") {
    return "Recent spend exists, but no purchase was recorded during the last seven days.";
  }

  return "Lifetime CPA is exactly at the selected threshold.";
}

function getAction(state: MetaV2HighCpaState): string {
  if (state === "persistent") {
    return "Pause, reduce, or complete a focused creative and offer review.";
  }

  if (state === "improving") {
    return "Hold budget stable and allow the recent improvement to mature.";
  }

  if (state === "no_recent_purchase") {
    return "Review alongside Zero Purchase before continuing spend.";
  }

  return "Monitor. The ad matches the threshold but does not enter a strict action split.";
}

export function buildMetaV2HighCpaControl(
  rows: MetaV2CleanRow[],
  threshold = 3000
): MetaV2HighCpaOutput {
  const safeThreshold = Math.max(
    0,
    Number.isFinite(threshold) ? threshold : 0
  );

  const { latestDate, groups } =
    getMetaV2ActiveSpendAdGroups(rows);

  const items = Array.from(groups.entries())
    .map(([id, adRows]): MetaV2HighCpaItem => {
      const base = buildMetaV2EconomicBaseItem(
        id,
        adRows,
        latestDate
      );

      const state = getState(base, safeThreshold);

      return {
        ...base,
        state,
        reason: getReason(state, safeThreshold),
        action: getAction(state),
      };
    })
    .filter((item) => item.yesterday.spend > 0)
    .filter((item) => item.lifetime.purchases > 0)
    .filter(
      (item) => item.lifetime.cpa >= safeThreshold
    )
    .sort(
      (left, right) =>
        right.lifetime.cpa - left.lifetime.cpa
    );

  const selectedIds = new Set(items.map((item) => item.id));
  const totals = calculateMetaV2Totals(
    rows.filter((row) =>
      selectedIds.has(getMetaV2EconomicAdKey(row))
    )
  );

  return {
    latestDate,
    threshold: safeThreshold,
    items,
    persistentItems: items.filter(
      (item) => item.state === "persistent"
    ),
    improvingItems: items.filter(
      (item) => item.state === "improving"
    ),
    noRecentPurchaseItems: items.filter(
      (item) => item.state === "no_recent_purchase"
    ),
    campaigns: buildMetaV2EconomicCampaignRows(
      items,
      "cpa"
    ),
    totals,
    yesterdaySpend: items.reduce(
      (sum, item) => sum + item.yesterday.spend,
      0
    ),
  };
}
