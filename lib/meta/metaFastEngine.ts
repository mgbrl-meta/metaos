export type MetaRawRow = Record<string, any>;

export type MetaSummary = {
  spend: number;
  revenue: number;
  purchases: number;
  impressions: number;
  reach: number;
  clicks: number;
  roas: number;
  cpa: number;
  aov: number;
  cpm: number;
  ctr: number;
  cpc: number;
  freq: number;
};

export type MetaCreativeItem = {
  key: string;
  ad: string;
  campaign: string;
  adSet: string;
  lifetime: MetaSummary;
  yesterday: MetaSummary;
  trend: Array<{
    date: string;
    label: string;
    spend: number;
    cpm: number;
    ctr: number;
    roas: number;
    cpa: number | null;
    purchases: number;
  }>;
};

const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function toNumber(value: any) {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const cleaned = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function pick(row: MetaRawRow, names: string[]) {
  const normalize = (x: string) =>
    String(x || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const wanted = names.map(normalize);

  for (const [key, value] of Object.entries(row)) {
    const nk = normalize(key);
    if (wanted.some((w) => nk === w || nk.includes(w) || w.includes(nk))) return value;
  }

  return undefined;
}

export function getDate(row: MetaRawRow) {
  return String(pick(row, ["date", "day", "Date", "Day"]) || "");
}

export function dateKey(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function displayDate(value?: string) {
  const d = new Date(value || "");
  if (Number.isNaN(d.getTime())) return value || "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getAdId(row: MetaRawRow) {
  return String(pick(row, ["ad_id", "adId", "Ad ID", "ad id"]) || getAd(row));
}

export function getAd(row: MetaRawRow) {
  return String(pick(row, ["ad_name", "adName", "Ad name", "ad name"]) || "Unknown Creative");
}

export function getCampaign(row: MetaRawRow) {
  return String(
    pick(row, ["campaign_name", "campaignName", "Campaign name", "campaign name"]) || "Unknown Campaign"
  );
}

export function getAdSet(row: MetaRawRow) {
  return String(
    pick(row, ["adset_name", "adSetName", "ad_set_name", "Ad set name", "ad set name"]) ||
      "Unknown Ad Set"
  );
}

export function getSpend(row: MetaRawRow) {
  return toNumber(pick(row, ["spend", "amountSpent", "amount_spent", "Amount spent (INR)", "amount spent"]));
}

export function getRevenue(row: MetaRawRow) {
  return toNumber(
    pick(row, [
      "revenue",
      "purchaseValue",
      "purchase_value",
      "conversionValue",
      "conversion_value",
      "Purchases conversion value",
      "purchase conversion value",
    ])
  );
}

export function getPurchases(row: MetaRawRow) {
  return toNumber(pick(row, ["purchases", "Purchases", "purchase"]));
}

export function getImpressions(row: MetaRawRow) {
  return toNumber(pick(row, ["impressions", "Impressions"]));
}

export function getReach(row: MetaRawRow) {
  return toNumber(pick(row, ["reach", "Reach"]));
}

export function getClicks(row: MetaRawRow) {
  return toNumber(
    pick(row, [
      "clicks",
      "linkClicks",
      "link_clicks",
      "outboundClicks",
      "outbound_clicks",
      "Link clicks",
      "Clicks (all)",
    ])
  );
}

export function summarize(rows: MetaRawRow[]): MetaSummary {
  const spend = rows.reduce((s, r) => s + getSpend(r), 0);
  const revenue = rows.reduce((s, r) => s + getRevenue(r), 0);
  const purchases = rows.reduce((s, r) => s + getPurchases(r), 0);
  const impressions = rows.reduce((s, r) => s + getImpressions(r), 0);
  const reach = rows.reduce((s, r) => s + getReach(r), 0);
  const clicks = rows.reduce((s, r) => s + getClicks(r), 0);

  return {
    spend,
    revenue,
    purchases,
    impressions,
    reach,
    clicks,
    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, purchases),
    aov: safeDiv(revenue, purchases),
    cpm: safeDiv(spend * 1000, impressions),
    ctr: safeDiv(clicks, impressions),
    cpc: safeDiv(spend, clicks),
    freq: safeDiv(impressions, reach),
  };
}

export function latestDate(rows: MetaRawRow[]) {
  const dates = rows
    .map((r) => {
      const d = new Date(getDate(r));
      return Number.isNaN(d.getTime()) ? null : d;
    })
    .filter(Boolean) as Date[];

  if (!dates.length) return "";
  return dateKey(new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString());
}

export function dailyTrend(rows: MetaRawRow[]) {
  const map = new Map<string, MetaRawRow[]>();

  rows.forEach((row) => {
    const key = dateKey(getDate(row));
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, dayRows]) => {
      const s = summarize(dayRows);

      return {
        date,
        label: displayDate(date),
        spend: s.spend,
        cpm: s.cpm,
        ctr: s.ctr,
        roas: s.roas,
        cpa: s.purchases > 0 ? s.cpa : null,
        purchases: s.purchases,
      };
    });
}

export function buildZeroPurchaseFast(rows: MetaRawRow[], threshold: number) {
  const latest = latestDate(rows);
  const activeYesterdayIds = new Set(
    rows
      .filter((row) => dateKey(getDate(row)) === latest)
      .filter((row) => getSpend(row) > 0)
      .map((row) => getAdId(row))
  );

  const map = new Map<string, MetaRawRow[]>();

  rows.forEach((row) => {
    const key = getAdId(row);
    if (!activeYesterdayIds.has(key)) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  const items: MetaCreativeItem[] = Array.from(map.entries())
    .map(([key, adRows]) => {
      const sample = adRows[0];
      const lifetime = summarize(adRows);
      const yesterday = summarize(adRows.filter((row) => dateKey(getDate(row)) === latest));

      return {
        key,
        ad: getAd(sample),
        campaign: getCampaign(sample),
        adSet: getAdSet(sample),
        lifetime,
        yesterday,
        trend: dailyTrend(adRows),
      };
    })
    .filter((item) => item.yesterday.spend > 0)
    .filter((item) => item.lifetime.spend >= threshold)
    .filter((item) => item.lifetime.purchases === 0)
    .sort((a, b) => b.lifetime.spend - a.lifetime.spend);

  return {
    latest,
    items,
    totalSpend: items.reduce((s, x) => s + x.lifetime.spend, 0),
    yesterdaySpend: items.reduce((s, x) => s + x.yesterday.spend, 0),
    threshold,
    rawRowsUsed: rows.length,
    activeAdCount: activeYesterdayIds.size,
  };
}
