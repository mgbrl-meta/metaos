import type { MetaCleanRow, MetaRawRow } from "@/lib/meta/schema";
import { getMetaValue } from "@/lib/meta/columns";
import { safeDiv, safeNumber } from "@/lib/meta/formatters";
import { getMonthKey, getWeekKey, toIsoDateKey } from "@/lib/meta/windows";

function safeText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

export function normalizeMetaRow(row: MetaRawRow, sourceIndex: number): MetaCleanRow {
  const date = toIsoDateKey(getMetaValue(row, "date"));
  const monthKey = getMonthKey(date);
  const weekKey = getWeekKey(date);

  const campaignName = safeText(getMetaValue(row, "campaignName"), "Unknown Campaign");
  const adSetName = safeText(getMetaValue(row, "adSetName"), "Unknown Ad Set");
  const adName = safeText(getMetaValue(row, "adName"), "Unknown Ad");
  const adId = safeText(getMetaValue(row, "adId"), "");

  const spend = safeNumber(getMetaValue(row, "spend"));
  const revenue = safeNumber(getMetaValue(row, "revenue"));
  const purchases = safeNumber(getMetaValue(row, "purchases"));

  const impressions = safeNumber(getMetaValue(row, "impressions"));
  const reach = safeNumber(getMetaValue(row, "reach"));
  const clicks = safeNumber(getMetaValue(row, "clicks"));
  const linkClicks = safeNumber(getMetaValue(row, "linkClicks"));
  const lpv = safeNumber(getMetaValue(row, "lpv"));
  const contentView = safeNumber(getMetaValue(row, "contentView"));
  const atc = safeNumber(getMetaValue(row, "atc"));
  const checkout = safeNumber(getMetaValue(row, "checkout"));
  const payment = safeNumber(getMetaValue(row, "payment"));

  return {
    sourceIndex,

    date,
    monthKey,
    weekKey,

    campaignName,
    adSetName,
    adName,
    adId,

    spend,
    revenue,
    purchases,

    impressions,
    reach,
    clicks,
    linkClicks,
    lpv,
    contentView,
    atc,
    checkout,
    payment,

    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, purchases),
    cpm: safeDiv(spend * 1000, impressions),
    cpc: safeDiv(spend, clicks),
    ctr: safeDiv(clicks, impressions) * 100,
    frequency: safeDiv(impressions, reach),
    lpvRate: safeDiv(lpv, linkClicks || clicks) * 100,
    atcRate: safeDiv(atc, lpv) * 100,
    checkoutRate: safeDiv(checkout, atc) * 100,
    paymentRate: safeDiv(payment, checkout) * 100,
    purchaseRate: safeDiv(purchases, lpv) * 100,
  };
}

export function normalizeMetaRows(rows: MetaRawRow[]): MetaCleanRow[] {
  return rows.map((row, index) => normalizeMetaRow(row, index));
}

export function normalizeUnknownRows(rows: Record<string, unknown>[]): MetaCleanRow[] {
  return rows.map((row, index) => normalizeMetaRow(row as MetaRawRow, index));
}
