export const META_COLUMN_ALIASES = {
  date: [
    "date",
    "day",
    "reporting starts",
    "reporting start",
    "reporting date",
  ],

  campaignName: [
    "campaign name",
    "campaign_name",
    "campaign",
    "campaignname",
  ],

  adSetName: [
    "ad set name",
    "adset name",
    "ad_set_name",
    "adset_name",
    "adset",
    "adsetname",
  ],

  adName: [
    "ad name",
    "ad_name",
    "ad",
    "adname",
    "creative",
    "creative name",
  ],

  adId: [
    "ad id",
    "ad_id",
    "adid",
  ],

  spend: [
    "spend",
    "amount spent",
    "amount spent inr",
    "amount spent (inr)",
    "amount_spent",
    "amountspent",
    "cost",
  ],

  revenue: [
    "revenue",
    "purchase value",
    "purchasevalue",
    "purchase_value",
    "purchase conversion value",
    "purchases conversion value",
    "conversion value",
    "website purchase conversion value",
  ],

  purchases: [
    "purchases",
    "website purchases",
    "purchase",
    "orders",
  ],

  impressions: [
    "impressions",
  ],

  reach: [
    "reach",
  ],

  clicks: [
    "clicks",
    "clicks all",
    "clicks (all)",
    "all clicks",
  ],

  linkClicks: [
    "link clicks",
    "linkclicks",
    "outbound clicks",
    "inline link clicks",
  ],

  lpv: [
    "landing page views",
    "landingpageviews",
    "lpv",
    "landing_page_views",
  ],

  contentView: [
    "content views",
    "contentviews",
    "view content",
    "views content",
    "content_view",
  ],

  atc: [
    "adds to cart",
    "add to cart",
    "addstocart",
    "addtocart",
    "atc",
    "add_to_cart",
  ],

  checkout: [
    "checkouts initiated",
    "checkout initiated",
    "checkoutinitiated",
    "checkoutsinitiated",
    "initiate checkout",
    "checkout",
  ],

  payment: [
    "adds of payment info",
    "add payment info",
    "payment info",
    "paymentinfo",
    "addspaymentinfo",
    "payment",
  ],
} as const;

export type MetaCanonicalColumn = keyof typeof META_COLUMN_ALIASES;

export function normalizeColumnKey(value: string) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/₹/g, "inr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeColumnKeyCompact(value: string) {
  return normalizeColumnKey(value).replace(/\s+/g, "");
}

export function resolveMetaColumn(
  row: Record<string, unknown>,
  column: MetaCanonicalColumn
) {
  const aliases = META_COLUMN_ALIASES[column];
  const keys = Object.keys(row || {});

  const aliasSet = new Set(aliases.map(normalizeColumnKey));
  const aliasCompactSet = new Set(aliases.map(normalizeColumnKeyCompact));

  for (const key of keys) {
    const normalized = normalizeColumnKey(key);
    const compact = normalizeColumnKeyCompact(key);

    if (aliasSet.has(normalized) || aliasCompactSet.has(compact)) {
      return key;
    }
  }

  for (const key of keys) {
    const compact = normalizeColumnKeyCompact(key);

    for (const alias of aliases) {
      const aliasCompact = normalizeColumnKeyCompact(alias);
      if (compact.includes(aliasCompact) || aliasCompact.includes(compact)) {
        return key;
      }
    }
  }

  return "";
}

export function getMetaValue(
  row: Record<string, unknown>,
  column: MetaCanonicalColumn
) {
  const key = resolveMetaColumn(row, column);
  return key ? row[key] : undefined;
}
