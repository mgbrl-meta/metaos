export interface MetaV2BaseNumbers {
  spend: number;
  revenue: number;
  purchases: number;

  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  lpv: number;
  contentView: number;
  atc: number;
  checkout: number;
  payment: number;
}

export interface MetaV2DerivedNumbers {
  roas: number;
  cpa: number;
  aov: number;
  gpt: number;
  cpm: number;
  cpc: number;
  ctr: number;
  frequency: number;
  lpvRate: number;
  atcRate: number;
  checkoutRate: number;
  paymentRate: number;
  purchaseRate: number;
}

export function safeNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function safeDiv(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

export function deriveMetaV2Numbers(base: MetaV2BaseNumbers): MetaV2DerivedNumbers {
  const roas = safeDiv(base.revenue, base.spend);
  const cpa = safeDiv(base.spend, base.purchases);
  const aov = safeDiv(base.revenue, base.purchases);
  const gpt = base.purchases > 0 ? aov - cpa : 0;

  return {
    roas,
    cpa,
    aov,
    gpt,
    cpm: safeDiv(base.spend * 1000, base.impressions),
    cpc: safeDiv(base.spend, base.clicks),
    ctr: safeDiv(base.clicks, base.impressions) * 100,
    frequency: safeDiv(base.impressions, base.reach),
    lpvRate: safeDiv(base.lpv, base.linkClicks || base.clicks) * 100,
    atcRate: safeDiv(base.atc, base.lpv) * 100,
    checkoutRate: safeDiv(base.checkout, base.atc) * 100,
    paymentRate: safeDiv(base.payment, base.checkout) * 100,
    purchaseRate: safeDiv(base.purchases, base.lpv) * 100,
  };
}

export function emptyMetaV2BaseNumbers(): MetaV2BaseNumbers {
  return {
    spend: 0,
    revenue: 0,
    purchases: 0,
    impressions: 0,
    reach: 0,
    clicks: 0,
    linkClicks: 0,
    lpv: 0,
    contentView: 0,
    atc: 0,
    checkout: 0,
    payment: 0,
  };
}

export function sumMetaV2BaseNumbers<T extends Partial<MetaV2BaseNumbers>>(
  rows: T[]
): MetaV2BaseNumbers {
  return rows.reduce<MetaV2BaseNumbers>(
    (sum, row) => ({
      spend: sum.spend + safeNumber(row.spend),
      revenue: sum.revenue + safeNumber(row.revenue),
      purchases: sum.purchases + safeNumber(row.purchases),
      impressions: sum.impressions + safeNumber(row.impressions),
      reach: sum.reach + safeNumber(row.reach),
      clicks: sum.clicks + safeNumber(row.clicks),
      linkClicks: sum.linkClicks + safeNumber(row.linkClicks),
      lpv: sum.lpv + safeNumber(row.lpv),
      contentView: sum.contentView + safeNumber(row.contentView),
      atc: sum.atc + safeNumber(row.atc),
      checkout: sum.checkout + safeNumber(row.checkout),
      payment: sum.payment + safeNumber(row.payment),
    }),
    emptyMetaV2BaseNumbers()
  );
}

export function groupByKey<T>(
  rows: T[],
  getKey: (row: T) => string
): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const row of rows) {
    const key = getKey(row) || "Unknown";
    const group = map.get(key) || [];
    group.push(row);
    map.set(key, group);
  }

  return map;
}
