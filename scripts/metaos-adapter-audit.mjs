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
    const acceptsSharedAnalysisTotals =
      fragment ===
        "calculateMetaV2Totals" &&
      [
        "lib/meta-v2/engines/spendAnalysisEngine.ts",
        "lib/meta-v2/engines/creativeFatigueEngine.ts",
        "lib/meta-v2/engines/creativeAgeingEngine.ts",
        "lib/meta-v2/engines/monthlyAnalysisEngine.ts",
      ].includes(file) &&
      source.includes(
        "calculateMetaV2AnalysisTotals"
      ) &&
      source.includes(
        'from "@/lib/meta-v2/analysisLayerUtils"'
      );

    if (
      !source.includes(fragment) &&
      !acceptsSharedAnalysisTotals
    ) {
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

function listFiles(target, matcher = () => true) {
  if (!fs.existsSync(target)) return [];

  const stat = fs.statSync(target);

  if (stat.isFile()) {
    return matcher(target) ? [target] : [];
  }

  const output = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = `${current}/${entry.name}`;

      if (entry.isDirectory()) {
        walk(full);
      } else if (matcher(full)) {
        output.push(full);
      }
    }
  }

  walk(target);
  return output.sort();
}

const requiredFiles = [
  "store/metaStore.ts",
  "components/meta-v2/shell/MetaOSV2App.tsx",
  "lib/meta-v2/schema.ts",
  "lib/meta-v2/columnMap.ts",
  "lib/meta-v2/normalize.ts",
  "lib/meta-v2/dateWindows.ts",
  "lib/meta-v2/calculationCore.ts",
  "lib/meta-v2/metrics.ts",
  "lib/meta-v2/engineUtils.ts",
  "lib/meta-v2/decisionRules.ts",
];

for (const file of requiredFiles) {
  read(file);
}

/**
 * 1. Current store → V2 app handoff
 */
mustContain("store/metaStore.ts", [
  "performanceRows",
]);

mustContain("components/meta-v2/shell/MetaOSV2App.tsx", [
  'from "@/store/metaStore"',
  "useMetaStore",
  "performanceRows",
  "normalizeMetaV2Rows",
  "cleanRows",
  "buildMetaV2CommandCenter",
]);

mustContain("components/meta-v2/shell/MetaOSV2App.tsx", [
  "normalizeMetaV2Rows((performanceRows || []) as unknown as Record<string, unknown>[])",
]);

mustNotContain("components/meta-v2/shell/MetaOSV2App.tsx", [
  "safeDiv(",
  "safeNumber(",
  "deriveMetaV2Numbers(",
  "sumMetaV2BaseNumbers(",
  "getColumnValue(",
]);

/**
 * 2. Raw row → column map → normalize contract
 */
mustContain("lib/meta-v2/schema.ts", [
  "export type MetaV2RawRow",
  "export interface MetaV2CleanRow",
  "export interface MetaV2Totals",
]);

mustContain("lib/meta-v2/columnMap.ts", [
  "export const META_V2_COLUMN_ALIASES",
  "export type MetaV2Column",
  "export function normalizeColumnName",
  "export function compactColumnName",
  "export function getColumnValue",
]);

const columnMap = read("lib/meta-v2/columnMap.ts");

const requiredCanonicalColumns = [
  "date",
  "campaignName",
  "adSetName",
  "adName",
  "adId",
  "spend",
  "revenue",
  "purchases",
  "impressions",
  "reach",
  "clicks",
  "linkClicks",
  "lpv",
  "contentView",
  "atc",
  "checkout",
  "payment",
];

for (const column of requiredCanonicalColumns) {
  if (!columnMap.includes(`${column}: [`)) {
    throw new Error(`columnMap.ts missing canonical column alias group: ${column}`);
  }
}

const requiredAliases = [
  "reporting starts",
  "campaign name",
  "ad set name",
  "ad name",
  "amount spent",
  "amount spent (inr)",
  "purchase value",
  "purchase conversion value",
  "website purchases",
  "link clicks",
  "landing page views",
  "adds to cart",
  "checkouts initiated",
  "adds of payment info",
];

for (const alias of requiredAliases) {
  if (!columnMap.includes(`"${alias}"`)) {
    throw new Error(`columnMap.ts missing important alias: ${alias}`);
  }
}

mustContain("lib/meta-v2/normalize.ts", [
  'from "@/lib/meta-v2/columnMap"',
  'from "@/lib/meta-v2/calculationCore"',
  'from "@/lib/meta-v2/dateWindows"',
  "getColumnValue(row,",
  "const base: MetaV2BaseNumbers",
  "deriveMetaV2Numbers(base)",
  "monthKey: getMonthKey(date)",
  "weekKey: getWeekKey(date)",
]);

mustNotContain("lib/meta-v2/normalize.ts", [
  "new Intl.NumberFormat",
  'from "@/components/',
  'from "@/app/',
  'from "react"',
]);

/**
 * 3. Engines should not read raw rows or store directly.
 */
const engineFiles = listFiles("lib/meta-v2/engines", (file) => file.endsWith(".ts"));

if (!engineFiles.length) {
  throw new Error("No V2 engine files found.");
}

for (const file of engineFiles) {
  mustContain(file, [
    "MetaV2CleanRow",
    "calculateMetaV2Totals",
  ]);

  mustNotContain(file, [
    'from "@/store/',
    'from "@/components/',
    'from "@/app/',
    "useMetaStore",
    "performanceRows",
    "getColumnValue(",
    "normalizeMetaV2Rows(",
    "safeNumber(",
    "deriveMetaV2Numbers(",
    "sumMetaV2BaseNumbers(",
    "new Intl.NumberFormat",
  ]);
}

/**
 * 4. V2 dashboard can consume engines, but must not own adapter/math primitives.
 */
const dashboardFiles = listFiles("components/meta-v2/dashboard", (file) => file.endsWith(".tsx"));

for (const file of dashboardFiles) {
  mustNotContain(file, [
    "getColumnValue(",
    "normalizeMetaV2Rows(",
    "safeNumber(",
    "safeDiv(",
    "deriveMetaV2Numbers(",
    "sumMetaV2BaseNumbers(",
  ]);
}

/**
 * 5. Old V1 files may exist, but V2 backend cannot depend on them.
 */
const v2BackendFiles = [
  "lib/meta-v2/normalize.ts",
  "lib/meta-v2/metrics.ts",
  "lib/meta-v2/engineUtils.ts",
  "lib/meta-v2/decisionRules.ts",
  ...engineFiles,
];

for (const file of v2BackendFiles) {
  mustNotContain(file, [
    'from "@/lib/meta/',
    'from "@/components/meta/',
    'from "@/components/dashboard/',
    'from "@/store/metaStore"',
  ]);
}

/**
 * 6. Minimal alias simulation against source logic.
 * This is source-level protection: it confirms the mapper is prepared
 * for common live Meta export/header variants.
 */
const aliasFamilies = {
  spend: ["spend", "amount spent", "amount spent (inr)"],
  revenue: ["purchase value", "purchase conversion value", "conversion value"],
  purchases: ["purchases", "website purchases", "orders"],
  lpv: ["landing page views", "lpv"],
  atc: ["adds to cart", "add to cart", "atc"],
  checkout: ["checkouts initiated", "initiate checkout"],
  payment: ["adds of payment info", "payment info", "add payment info"],
};

for (const [family, aliases] of Object.entries(aliasFamilies)) {
  for (const alias of aliases) {
    if (!columnMap.includes(`"${alias}"`)) {
      throw new Error(`Alias family ${family} is missing alias: ${alias}`);
    }
  }
}

console.log("✅ MetaOS backend data adapter audit passed.");
console.log("");
console.log("Verified adapter path:");
console.log("current metaStore.performanceRows → MetaOSV2App → normalizeMetaV2Rows → cleanRows → engines");
console.log("");
console.log("Protection checks:");
console.log("- V2 app reads current store rows");
console.log("- V2 app normalizes rows before engine use");
console.log("- columnMap supports core Meta export aliases");
console.log("- normalize owns raw-column access");
console.log("- engines consume clean rows only");
console.log("- dashboards do not call raw adapter/math primitives");
console.log("- V2 backend does not depend on old V1 lib/meta files");
