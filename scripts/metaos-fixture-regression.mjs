import fs from "node:fs";

const fixturePath = ".metaos-fixtures/meta-v2-regression-fixture.json";

if (!fs.existsSync(fixturePath)) {
  throw new Error(`Missing fixture file: ${fixturePath}`);
}

const rows = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

function safeNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const parsed = Number(
    String(value).replace(/₹/g, "").replace(/,/g, "").replace(/%/g, "").trim()
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function safeDiv(a, b) {
  return b > 0 ? a / b : 0;
}

function normal(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/₹/g, "inr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compact(value) {
  return normal(value).replace(/\s+/g, "");
}

function get(row, aliases) {
  const aliasSet = new Set(aliases.map(normal));
  const compactAliasSet = new Set(aliases.map(compact));

  for (const key of Object.keys(row)) {
    if (aliasSet.has(normal(key)) || compactAliasSet.has(compact(key))) {
      return row[key];
    }
  }

  return undefined;
}

function toDateKey(value) {
  const raw = String(value || "").trim();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function getMonthKey(date) {
  return date ? date.slice(0, 7) : "";
}

function getWeekKey(dateKey) {
  if (!dateKey) return "";

  const date = new Date(`${dateKey}T00:00:00`);
  const day = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day + 1);

  return monday.toISOString().slice(0, 10);
}

function derive(base) {
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

function normalize(row, sourceIndex) {
  const date = toDateKey(get(row, ["date", "day", "reporting starts"]));

  const base = {
    spend: safeNumber(get(row, ["spend", "amount spent", "amount spent inr", "amount spent (inr)"])),
    revenue: safeNumber(get(row, ["purchase value", "purchase conversion value", "conversion value"])),
    purchases: safeNumber(get(row, ["purchases", "website purchases", "orders"])),
    impressions: safeNumber(get(row, ["impressions"])),
    reach: safeNumber(get(row, ["reach"])),
    clicks: safeNumber(get(row, ["clicks", "clicks all", "clicks (all)"])),
    linkClicks: safeNumber(get(row, ["link clicks", "outbound clicks", "inline link clicks"])),
    lpv: safeNumber(get(row, ["landing page views", "lpv"])),
    contentView: safeNumber(get(row, ["content views", "view content"])),
    atc: safeNumber(get(row, ["adds to cart", "add to cart", "atc"])),
    checkout: safeNumber(get(row, ["checkouts initiated", "checkout initiated", "initiate checkout"])),
    payment: safeNumber(get(row, ["adds of payment info", "payment info", "add payment info"])),
  };

  return {
    sourceIndex,
    date,
    monthKey: getMonthKey(date),
    weekKey: getWeekKey(date),
    campaignName: String(get(row, ["campaign name", "campaign"]) || "Unknown Campaign"),
    adSetName: String(get(row, ["ad set name", "adset name", "ad set"]) || "Unknown Ad Set"),
    adName: String(get(row, ["ad name", "ad", "creative name"]) || "Unknown Ad"),
    adId: String(get(row, ["ad id", "adid"]) || ""),
    ...base,
    ...derive(base),
  };
}

function totals(cleanRows) {
  const base = cleanRows.reduce(
    (sum, row) => ({
      spend: sum.spend + row.spend,
      revenue: sum.revenue + row.revenue,
      purchases: sum.purchases + row.purchases,
      impressions: sum.impressions + row.impressions,
      reach: sum.reach + row.reach,
      clicks: sum.clicks + row.clicks,
      linkClicks: sum.linkClicks + row.linkClicks,
      lpv: sum.lpv + row.lpv,
      contentView: sum.contentView + row.contentView,
      atc: sum.atc + row.atc,
      checkout: sum.checkout + row.checkout,
      payment: sum.payment + row.payment,
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

  return {
    ...base,
    ...derive(base),
  };
}

function groupBy(cleanRows, getKey) {
  const map = new Map();

  for (const row of cleanRows) {
    const key = getKey(row) || "Unknown";
    const group = map.get(key) || [];
    group.push(row);
    map.set(key, group);
  }

  return map;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} failed. Expected ${expected}, got ${actual}`);
  }
}

function assertAlmost(actual, expected, label) {
  const delta = Math.abs(actual - expected);

  if (delta > 0.000001) {
    throw new Error(`${label} failed. Expected ${expected}, got ${actual}`);
  }
}

const clean = rows.map(normalize);
const account = totals(clean);

assertEqual(clean.length, 4, "Clean row count");
assertEqual(account.spend, 9000, "Account spend");
assertEqual(account.revenue, 8000, "Account revenue");
assertEqual(account.purchases, 7, "Account purchases");
assertAlmost(account.roas, 8000 / 9000, "Account ROAS");
assertAlmost(account.cpa, 9000 / 7, "Account CPA");
assertAlmost(account.aov, 8000 / 7, "Account AOV");

const monthGroups = groupBy(clean, (row) => row.monthKey);
assertEqual(monthGroups.size, 1, "Funnel month count");

const weekGroups = groupBy(clean, (row) => row.weekKey);
assertEqual(weekGroups.size, 1, "Funnel week count");

const adGroups = groupBy(clean, (row) => row.adId);
assertEqual(adGroups.size, 3, "Ad group count");

const adTotals = Array.from(adGroups.entries()).map(([id, adRows]) => ({
  id,
  totals: totals(adRows),
}));

const winner = adTotals.find((row) => row.id === "ad_winner_01");
const zero = adTotals.find((row) => row.id === "ad_zero_01");
const highCpa = adTotals.find((row) => row.id === "ad_high_cpa_01");

assertEqual(winner.totals.spend, 2000, "Winner spend");
assertEqual(winner.totals.revenue, 6000, "Winner revenue");
assertEqual(winner.totals.purchases, 6, "Winner purchases");
assertAlmost(winner.totals.roas, 3, "Winner ROAS");

assertEqual(zero.totals.spend, 4000, "Zero purchase spend");
assertEqual(zero.totals.purchases, 0, "Zero purchase purchases");
assertEqual(zero.totals.revenue, 0, "Zero purchase revenue");

assertEqual(highCpa.totals.spend, 3000, "High CPA spend");
assertEqual(highCpa.totals.purchases, 1, "High CPA purchases");
assertEqual(highCpa.totals.cpa, 3000, "High CPA CPA");

const zeroPurchaseItems = adTotals.filter(
  (item) => item.totals.spend >= 3000 && item.totals.purchases <= 0
);

assertEqual(zeroPurchaseItems.length, 1, "Zero purchase item count");
assertEqual(zeroPurchaseItems[0].id, "ad_zero_01", "Zero purchase item id");
assertEqual(zeroPurchaseItems[0].totals.spend, 4000, "Zero purchase lifetime waste");

const zeroPurchaseShare = (zero.totals.spend / account.spend) * 100;
assertAlmost(zeroPurchaseShare, 44.44444444444444, "Zero purchase share");

const sourceChecks = [
  ["lib/meta-v2/engines/funnelEngine.ts", "buildMetaV2Funnel"],
  ["lib/meta-v2/engines/zeroPurchaseEngine.ts", "buildMetaV2ZeroPurchase"],
  ["lib/meta-v2/engines/commandCenterEngine.ts", "buildMetaV2CommandCenter"],
  ["lib/meta-v2/engines/dataQcEngine.ts", "buildMetaV2DataQc"],
  ["lib/meta-v2/decisionRules.ts", "getMetaV2Decision"],
];

for (const [file, fragment] of sourceChecks) {
  const source = fs.readFileSync(file, "utf8");

  if (!source.includes(fragment)) {
    throw new Error(`${file} missing ${fragment}`);
  }
}

console.log("✅ MetaOS backend fixture regression test passed.");
console.log("");
console.log("Fixture assertions:");
console.log("- Account totals stable");
console.log("- Month/week grouping stable");
console.log("- Ad grouping stable");
console.log("- Zero purchase waste stable");
console.log("- High CPA condition stable");
console.log("- Data QC zero-purchase share stable");
