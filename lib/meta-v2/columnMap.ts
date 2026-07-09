export const META_V2_COLUMN_ALIASES = {
  date: ["date", "day", "reporting starts", "reporting start"],
  campaignName: ["campaign name", "campaign"],
  adSetName: ["ad set name", "adset name", "ad set"],
  adName: ["ad name", "ad", "creative name"],
  adId: ["ad id", "adid"],
  spend: ["spend", "amount spent", "amount spent inr", "amount spent (inr)"],
  revenue: ["revenue", "purchase value", "purchase conversion value", "purchases conversion value", "conversion value"],
  purchases: ["purchases", "website purchases", "orders"],
  impressions: ["impressions"],
  reach: ["reach"],
  clicks: ["clicks", "clicks all", "clicks (all)"],
  linkClicks: ["link clicks", "outbound clicks", "inline link clicks"],
  lpv: ["landing page views", "lpv"],
  contentView: ["content views", "view content"],
  atc: ["adds to cart", "add to cart", "atc"],
  checkout: ["checkouts initiated", "checkout initiated", "initiate checkout"],
  payment: ["adds of payment info", "payment info", "add payment info"],
} as const;

export type MetaV2Column = keyof typeof META_V2_COLUMN_ALIASES;

export function normalizeColumnName(value: string): string {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/₹/g, "inr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function compactColumnName(value: string): string {
  return normalizeColumnName(value).replace(/\s+/g, "");
}

export function getColumnValue(row: Record<string, unknown>, column: MetaV2Column): unknown {
  const keys = Object.keys(row || {});
  const aliases = META_V2_COLUMN_ALIASES[column];

  const aliasSet = new Set(aliases.map(normalizeColumnName));
  const compactAliasSet = new Set(aliases.map(compactColumnName));

  for (const key of keys) {
    const normal = normalizeColumnName(key);
    const compact = compactColumnName(key);

    if (aliasSet.has(normal) || compactAliasSet.has(compact)) {
      return row[key];
    }
  }

  return undefined;
}
