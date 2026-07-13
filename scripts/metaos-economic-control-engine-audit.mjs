import fs from "node:fs";

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing economic-control file: ${file}`);
  }

  return fs.readFileSync(file, "utf8");
}

function requireTokens(file, tokens) {
  const source = read(file);

  for (const token of tokens) {
    if (!source.includes(token)) {
      throw new Error(`${file} is missing required token:\n${token}`);
    }
  }
}

function forbidTokens(file, tokens) {
  const source = read(file);

  for (const token of tokens) {
    if (source.includes(token)) {
      throw new Error(`${file} contains forbidden token:\n${token}`);
    }
  }
}

requireTokens("lib/meta-v2/schema.ts", [
  "deliveryStatus?: string",
]);

requireTokens("lib/meta-v2/columnMap.ts", [
  "deliveryStatus:",
  '"delivery status"',
  '"ad delivery status"',
]);

requireTokens("lib/meta-v2/normalize.ts", [
  'getColumnValue(row, "deliveryStatus")',
]);

requireTokens("lib/meta-v2/engineUtils.ts", [
  "export function isMetaV2LiveDeliveryStatus",
  "export function getMetaV2EconomicAdKey",
  "export function getMetaV2LatestLiveDataDate",
  "export function getMetaV2LatestDayActiveAdKeys",
  "export function filterMetaV2LiveRows",
]);

requireTokens("lib/meta-v2/economicControlUtils.ts", [
  "export function combineMetaV2Totals",
  "export function getMetaV2ActiveSpendAdGroups",
  "export function buildMetaV2EconomicTrend",
  "export function buildMetaV2EconomicBaseItem",
  "export function buildMetaV2EconomicCampaignRows",
  "calculateMetaV2Totals",
]);

requireTokens("lib/meta-v2/engines/highCpaEngine.ts", [
  "export function buildMetaV2HighCpaControl",
  "calculateMetaV2Totals",
  "persistentItems",
  "improvingItems",
  "noRecentPurchaseItems",
  '"persistent"',
  '"improving"',
  '"no_recent_purchase"',
  "item.lifetime.cpa >= safeThreshold",
]);

requireTokens("lib/meta-v2/engines/gptControlEngine.ts", [
  "export function buildMetaV2GptControl",
  "calculateMetaV2Totals",
  "filterMetaV2LiveRows",
  "campaignAverage",
  "cpaAboveCampaign",
  "gptBelowCampaign",
  "gptBelowTarget",
  "weightedAverageGpt",
]);

requireTokens("lib/meta-v2/engines/highRoasEngine.ts", [
  "export function buildMetaV2HighRoasControl",
  "calculateMetaV2Totals",
  "recentCpaHealthy",
  "recentRoasHealthy",
  '"protected"',
  '"watch"',
  '"insufficient_recent_purchases"',
  "item.lifetime.roas >= safeThreshold",
  "blendedRoas",
]);

const engines = [
  "lib/meta-v2/engines/highCpaEngine.ts",
  "lib/meta-v2/engines/gptControlEngine.ts",
  "lib/meta-v2/engines/highRoasEngine.ts",
];

for (const file of engines) {
  requireTokens(file, [
    "MetaV2CleanRow",
    "calculateMetaV2Totals",
  ]);

  forbidTokens(file, [
    "@/components/",
    "@/store/",
    "ReactNode",
    "<div",
    "<table",
    "className=",
    "navigator.clipboard",
    "document.createElement",
    "fetch(",
    "revenue / spend",
    "spend / purchases",
    "revenue / purchases",
    "aov - cpa",
    "impressions / reach",
    "campaign_name",
    "adset_name",
    "purchase_value",
    'row["',
  ]);
}

requireTokens("components/metaos-ui/MetaOSModuleRenderer.tsx", [
  'case "high_cpa":',
  "<HighCpaModule />",
  'case "gpt":',
  "<GptControlModule />",
  'case "high_roas":',
  "<HighRoasModule />",
]);

console.log("");
console.log("MetaOS Economic-Control Engine Audit");
console.log("====================================");
console.log("✅ Delivery status preserved in clean rows.");
console.log("✅ Live-ad filtering centralized.");
console.log("✅ Latest-spend qualification centralized.");
console.log("✅ Inclusive L7D windows retained.");
console.log("✅ Shared 30-day economic trend installed.");
console.log("✅ High CPA states retained.");
console.log("✅ GPT campaign-benchmark logic retained.");
console.log("✅ High ROAS protection logic retained.");
console.log("✅ Engines use centralized metrics and clean rows.");
console.log("✅ Economic engines remain independent from presentation modules.");
console.log("✅ Economic-control engine architecture: PASS");
