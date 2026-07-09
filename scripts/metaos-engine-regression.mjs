import fs from "node:fs";

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }

  return fs.readFileSync(file, "utf8");
}

function mustContain(file, fragments) {
  const source = read(file);

  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${file} is missing required fragment:\n${fragment}`);
    }
  }
}

function mustNotContain(file, fragments) {
  const source = read(file);

  for (const fragment of fragments) {
    if (source.includes(fragment)) {
      throw new Error(`${file} contains forbidden fragment:\n${fragment}`);
    }
  }
}

function mustExist(files) {
  for (const file of files) {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing required file: ${file}`);
    }
  }
}

const backendFiles = [
  "lib/meta-v2/calculationCore.ts",
  "lib/meta-v2/engineUtils.ts",
  "lib/meta-v2/decisionRules.ts",
  "lib/meta-v2/normalize.ts",
  "lib/meta-v2/metrics.ts",
  "lib/meta-v2/formatters.ts",
  "lib/meta-v2/engines/commandCenterEngine.ts",
  "lib/meta-v2/engines/funnelEngine.ts",
  "lib/meta-v2/engines/zeroPurchaseEngine.ts",
  "lib/meta-v2/engines/dataQcEngine.ts",
];

mustExist(backendFiles);

mustContain("lib/meta-v2/calculationCore.ts", [
  "export function safeNumber",
  "export function safeDiv",
  "export function deriveMetaV2Numbers",
  "export function sumMetaV2BaseNumbers",
  "export function groupByKey",
  "gpt = base.purchases > 0 ? aov - cpa : 0",
]);

mustContain("lib/meta-v2/metrics.ts", [
  'from "@/lib/meta-v2/calculationCore"',
  "sumMetaV2BaseNumbers",
  "deriveMetaV2Numbers",
  "export function calculateMetaV2Totals",
]);

mustContain("lib/meta-v2/formatters.ts", [
  'from "@/lib/meta-v2/calculationCore"',
  "export { safeDiv, safeNumber }",
  "export function formatINRCompact",
  "export function formatRoas",
]);

mustNotContain("lib/meta-v2/formatters.ts", [
  "export function safeNumber(value",
  "export function safeDiv(a",
  "export function safeDiv(numerator",
]);

mustContain("lib/meta-v2/engineUtils.ts", [
  'from "@/lib/meta-v2/calculationCore"',
  "export function getMetaV2DateRange",
  "export function getMetaV2LatestDate",
  "export function getMetaV2LastNDates",
  "export function formatMetaV2MonthLabel",
  "export function formatMetaV2WeekLabel",
  "export function groupMetaV2RowsByAd",
]);

mustContain("lib/meta-v2/decisionRules.ts", [
  "export function getMetaV2WasteScore",
  "export function getMetaV2ScaleScore",
  "export function getMetaV2Action",
  "export function getMetaV2Decision",
  "export function getMetaV2SpendShare",
  "export function getMetaV2RevenueShare",
]);

mustContain("lib/meta-v2/normalize.ts", [
  'from "@/lib/meta-v2/calculationCore"',
  "deriveMetaV2Numbers",
  "safeNumber",
  "export function normalizeMetaV2Row",
  "export function normalizeMetaV2Rows",
]);

mustContain("lib/meta-v2/engines/funnelEngine.ts", [
  'from "@/lib/meta-v2/metrics"',
  'from "@/lib/meta-v2/engineUtils"',
  "calculateMetaV2Totals",
  "groupMetaV2RowsByKey",
  "formatMetaV2MonthLabel",
  "formatMetaV2WeekLabel",
  "export function buildMetaV2Funnel",
]);

mustNotContain("lib/meta-v2/engines/funnelEngine.ts", [
  "function groupBy<",
  "function dateRange",
  "function monthLabel",
  "function weekLabel",
]);

mustContain("lib/meta-v2/engines/zeroPurchaseEngine.ts", [
  'from "@/lib/meta-v2/metrics"',
  'from "@/lib/meta-v2/engineUtils"',
  'from "@/lib/meta-v2/decisionRules"',
  "calculateMetaV2Totals",
  "getMetaV2LastNDates",
  "getMetaV2LatestDate",
  "groupMetaV2RowsByAd",
  "getMetaV2SeverityFromSpend",
  "export function buildMetaV2ZeroPurchase",
]);

mustNotContain("lib/meta-v2/engines/zeroPurchaseEngine.ts", [
  "function getLatestDate",
  "function getLastNDates",
  "function groupByAd",
  "function getSeverity",
]);

mustContain("lib/meta-v2/engines/commandCenterEngine.ts", [
  'from "@/lib/meta-v2/decisionRules"',
  "getMetaV2Decision",
  "export function buildMetaV2CommandCenter",
]);

mustContain("lib/meta-v2/engines/dataQcEngine.ts", [
  'from "@/lib/meta-v2/calculationCore"',
  "safeDiv",
  "export function buildMetaV2DataQc",
]);

const forbiddenFrontendImportsInBackend = [
  "@/components/",
  "@/app/",
  "next/",
  "react",
  "lucide-react",
  "zustand",
];

for (const file of backendFiles) {
  mustNotContain(file, forbiddenFrontendImportsInBackend);
}

console.log("✅ MetaOS backend engine regression test passed.");
console.log("");
console.log("Verified:");
console.log("- Backend math is centralized in calculationCore.ts");
console.log("- Backend formatting does not own math");
console.log("- Engines use metrics, engineUtils, and decisionRules");
console.log("- Backend files do not import frontend/dashboard code");
console.log("- Funnel and Zero Purchase duplicate helpers are removed");
