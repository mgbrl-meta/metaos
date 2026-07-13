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

export type MetaV2HighRoasProtection =
  | "protected"
  | "watch"
  | "insufficient_recent_purchases";

export interface MetaV2HighRoasItem
  extends MetaV2EconomicBaseItem {
  recentCpaHealthy: boolean;
  recentRoasHealthy: boolean;
  protection: MetaV2HighRoasProtection;
  reason: string;
  action: string;
}

export interface MetaV2HighRoasOutput {
  latestDate: string;
  threshold: number;
  items: MetaV2HighRoasItem[];
  campaigns: MetaV2EconomicCampaignRow[];
  totals: MetaV2Totals;
  yesterdaySpend: number;
  blendedRoas: number;
}

function getProtection(
  item: MetaV2EconomicBaseItem
): MetaV2HighRoasProtection {
  if (item.last7.purchases <= 0) {
    return "insufficient_recent_purchases";
  }

  const recentCpaHealthy =
    item.last7.cpa <= item.lifetime.cpa;

  const recentRoasHealthy =
    item.last7.roas >= item.lifetime.roas;

  return recentCpaHealthy && recentRoasHealthy
    ? "protected"
    : "watch";
}

function getReason(
  protection: MetaV2HighRoasProtection
): string {
  if (protection === "protected") {
    return "L7D CPA is at or below lifetime CPA and L7D ROAS is at or above lifetime ROAS.";
  }

  if (protection === "insufficient_recent_purchases") {
    return "The ad remains a lifetime ROAS winner, but recent purchase volume is insufficient for a confident scale decision.";
  }

  return "The ad remains above the lifetime ROAS threshold, but recent CPA or ROAS has weakened versus lifetime performance.";
}

function getAction(
  protection: MetaV2HighRoasProtection
): string {
  if (protection === "protected") {
    return "Protect from accidental edits and scale carefully while monitoring CPA and frequency.";
  }

  if (protection === "insufficient_recent_purchases") {
    return "Protect the creative, hold budget, and collect recent purchase evidence before scaling.";
  }

  return "Use as a creative reference, but hold scaling until recent CPA and ROAS stabilise.";
}

export function buildMetaV2HighRoasControl(
  rows: MetaV2CleanRow[],
  threshold = 1.2
): MetaV2HighRoasOutput {
  const safeThreshold = Math.max(
    0,
    Number.isFinite(threshold) ? threshold : 0
  );

  const { latestDate, groups } =
    getMetaV2ActiveSpendAdGroups(rows);

  const items = Array.from(groups.entries())
    .map(([id, adRows]): MetaV2HighRoasItem => {
      const base = buildMetaV2EconomicBaseItem(
        id,
        adRows,
        latestDate
      );

      const protection = getProtection(base);

      return {
        ...base,
        recentCpaHealthy:
          base.last7.purchases > 0 &&
          base.last7.cpa <= base.lifetime.cpa,
        recentRoasHealthy:
          base.last7.roas >= base.lifetime.roas,
        protection,
        reason: getReason(protection),
        action: getAction(protection),
      };
    })
    .filter((item) => item.yesterday.spend > 0)
    .filter((item) => item.lifetime.purchases > 0)
    .filter(
      (item) => item.lifetime.roas >= safeThreshold
    )
    .sort(
      (left, right) =>
        right.lifetime.roas - left.lifetime.roas
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
    campaigns: buildMetaV2EconomicCampaignRows(
      items,
      "roas"
    ),
    totals,
    yesterdaySpend: items.reduce(
      (sum, item) => sum + item.yesterday.spend,
      0
    ),
    blendedRoas: totals.roas,
  };
}
