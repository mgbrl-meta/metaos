import fs from "node:fs";

function safeDiv(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function almostEqual(actual, expected, label) {
  const delta = Math.abs(actual - expected);

  if (delta > 0.000001) {
    throw new Error(`${label} failed. Expected ${expected}, got ${actual}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} failed. Expected ${expected}, got ${actual}`);
  }
}

function deriveMetaV2Numbers(base) {
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

function sumMetaV2BaseNumbers(rows) {
  return rows.reduce(
    (sum, row) => ({
      spend: sum.spend + Number(row.spend || 0),
      revenue: sum.revenue + Number(row.revenue || 0),
      purchases: sum.purchases + Number(row.purchases || 0),
      impressions: sum.impressions + Number(row.impressions || 0),
      reach: sum.reach + Number(row.reach || 0),
      clicks: sum.clicks + Number(row.clicks || 0),
      linkClicks: sum.linkClicks + Number(row.linkClicks || 0),
      lpv: sum.lpv + Number(row.lpv || 0),
      contentView: sum.contentView + Number(row.contentView || 0),
      atc: sum.atc + Number(row.atc || 0),
      checkout: sum.checkout + Number(row.checkout || 0),
      payment: sum.payment + Number(row.payment || 0),
    }),
    {
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
    }
  );
}

const base = {
  spend: 1000,
  revenue: 2500,
  purchases: 5,
  impressions: 10000,
  reach: 5000,
  clicks: 200,
  linkClicks: 100,
  lpv: 80,
  contentView: 70,
  atc: 16,
  checkout: 8,
  payment: 4,
};

const derived = deriveMetaV2Numbers(base);

almostEqual(derived.roas, 2.5, "ROAS");
almostEqual(derived.cpa, 200, "CPA");
almostEqual(derived.aov, 500, "AOV");
almostEqual(derived.gpt, 300, "GPT");
almostEqual(derived.cpm, 100, "CPM");
almostEqual(derived.cpc, 5, "CPC");
almostEqual(derived.ctr, 2, "CTR");
almostEqual(derived.frequency, 2, "Frequency");
almostEqual(derived.lpvRate, 80, "LPV Rate");
almostEqual(derived.atcRate, 20, "ATC Rate");
almostEqual(derived.checkoutRate, 50, "Checkout Rate");
almostEqual(derived.paymentRate, 50, "Payment Rate");
almostEqual(derived.purchaseRate, 6.25, "Purchase Rate");

const zero = deriveMetaV2Numbers({
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
});

for (const [key, value] of Object.entries(zero)) {
  almostEqual(value, 0, `Zero-safe ${key}`);
}

const summed = sumMetaV2BaseNumbers([
  {
    spend: 100,
    revenue: 300,
    purchases: 1,
    impressions: 1000,
    reach: 800,
    clicks: 20,
    linkClicks: 15,
    lpv: 10,
    contentView: 8,
    atc: 3,
    checkout: 2,
    payment: 1,
  },
  {
    spend: 200,
    revenue: 700,
    purchases: 2,
    impressions: 2000,
    reach: 1200,
    clicks: 40,
    linkClicks: 25,
    lpv: 30,
    contentView: 20,
    atc: 5,
    checkout: 3,
    payment: 2,
  },
]);

assertEqual(summed.spend, 300, "Sum spend");
assertEqual(summed.revenue, 1000, "Sum revenue");
assertEqual(summed.purchases, 3, "Sum purchases");
assertEqual(summed.impressions, 3000, "Sum impressions");
assertEqual(summed.reach, 2000, "Sum reach");
assertEqual(summed.clicks, 60, "Sum clicks");
assertEqual(summed.linkClicks, 40, "Sum link clicks");
assertEqual(summed.lpv, 40, "Sum LPV");
assertEqual(summed.contentView, 28, "Sum content view");
assertEqual(summed.atc, 8, "Sum ATC");
assertEqual(summed.checkout, 5, "Sum checkout");
assertEqual(summed.payment, 3, "Sum payment");

const source = fs.readFileSync("lib/meta-v2/calculationCore.ts", "utf8");

const requiredFragments = [
  "export function safeNumber",
  "export function safeDiv",
  "export function deriveMetaV2Numbers",
  "export function sumMetaV2BaseNumbers",
  "gpt = base.purchases > 0 ? aov - cpa : 0",
  "lpvRate: safeDiv(base.lpv, base.linkClicks || base.clicks) * 100",
];

for (const fragment of requiredFragments) {
  if (!source.includes(fragment)) {
    throw new Error(`calculationCore.ts missing required fragment: ${fragment}`);
  }
}

console.log("✅ MetaOS backend calculation self-test passed.");
