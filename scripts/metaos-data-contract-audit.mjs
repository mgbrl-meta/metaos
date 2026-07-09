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

const coreFiles = [
  "lib/meta-v2/schema.ts",
  "lib/meta-v2/columnMap.ts",
  "lib/meta-v2/normalize.ts",
  "lib/meta-v2/calculationCore.ts",
  "lib/meta-v2/metrics.ts",
  "lib/meta-v2/decisionRules.ts",
  "lib/meta-v2/engineUtils.ts",
  "lib/meta-v2/formatters.ts",
];

const engineFiles = listFiles(
  "lib/meta-v2/engines",
  (file) => file.endsWith(".ts")
);

if (!engineFiles.length) {
  throw new Error("No V2 engine files found in lib/meta-v2/engines.");
}

for (const file of coreFiles) {
  read(file);
}

mustContain("lib/meta-v2/schema.ts", [
  "export type MetaV2RawRow",
  "export interface MetaV2CleanRow",
  "export interface MetaV2Totals",
  "export interface MetaV2Settings",
]);

mustContain("lib/meta-v2/columnMap.ts", [
  "export const META_V2_COLUMN_ALIASES",
  "export type MetaV2Column",
  "export function getColumnValue",
]);

mustContain("lib/meta-v2/normalize.ts", [
  'from "@/lib/meta-v2/columnMap"',
  'from "@/lib/meta-v2/calculationCore"',
  'from "@/lib/meta-v2/dateWindows"',
  "export function normalizeMetaV2Row",
  "export function normalizeMetaV2Rows",
  "const base: MetaV2BaseNumbers",
  "deriveMetaV2Numbers(base)",
]);

mustContain("lib/meta-v2/calculationCore.ts", [
  "export interface MetaV2BaseNumbers",
  "export interface MetaV2DerivedNumbers",
  "export function safeNumber",
  "export function safeDiv",
  "export function deriveMetaV2Numbers",
  "export function sumMetaV2BaseNumbers",
  "export function groupByKey",
]);

mustContain("lib/meta-v2/metrics.ts", [
  'from "@/lib/meta-v2/calculationCore"',
  "export function calculateMetaV2Totals",
  "sumMetaV2BaseNumbers(rows)",
  "deriveMetaV2Numbers(base)",
]);

mustContain("lib/meta-v2/decisionRules.ts", [
  "export function getMetaV2Decision",
  "export function getMetaV2Action",
  "export function getMetaV2WasteScore",
  "export function getMetaV2ScaleScore",
]);

mustContain("lib/meta-v2/engineUtils.ts", [
  "export function getMetaV2DateRange",
  "export function getMetaV2LatestDate",
  "export function getMetaV2LastNDates",
  "export function groupMetaV2RowsByAd",
  "export function groupMetaV2RowsByKey",
]);

mustContain("lib/meta-v2/formatters.ts", [
  'from "@/lib/meta-v2/calculationCore"',
  "export { safeDiv, safeNumber }",
  "export function formatINRCompact",
  "export function formatRoas",
]);

mustNotContain("lib/meta-v2/formatters.ts", [
  "export function safeNumber(value",
  "export function safeDiv(numerator",
  "export function safeDiv(a",
]);

for (const file of engineFiles) {
  mustContain(file, [
    'from "@/lib/meta-v2/metrics"',
  ]);

  mustNotContain(file, [
    'from "@/components/',
    'from "@/app/',
    'from "react"',
    'from "next/',
    'from "zustand"',
    "getColumnValue(",
    "safeNumber(",
    "deriveMetaV2Numbers(",
    "sumMetaV2BaseNumbers(",
    "new Intl.NumberFormat",
  ]);
}

mustContain("lib/meta-v2/engines/commandCenterEngine.ts", [
  'from "@/lib/meta-v2/decisionRules"',
  "getMetaV2Decision",
  "calculateMetaV2Totals(rows)",
]);

mustContain("lib/meta-v2/engines/funnelEngine.ts", [
  'from "@/lib/meta-v2/engineUtils"',
  "groupMetaV2RowsByKey",
  "calculateMetaV2Totals",
]);

mustContain("lib/meta-v2/engines/zeroPurchaseEngine.ts", [
  'from "@/lib/meta-v2/engineUtils"',
  'from "@/lib/meta-v2/decisionRules"',
  "groupMetaV2RowsByAd",
  "getMetaV2LatestDate",
  "getMetaV2LastNDates",
  "calculateMetaV2Totals",
]);

mustContain("lib/meta-v2/engines/dataQcEngine.ts", [
  'from "@/lib/meta-v2/calculationCore"',
  'from "@/lib/meta-v2/metrics"',
  "safeDiv",
  "calculateMetaV2Totals",
]);

const dashboardFiles = listFiles(
  "components/meta-v2/dashboard",
  (file) => file.endsWith(".tsx")
);

for (const file of dashboardFiles) {
  mustNotContain(file, [
    "safeDiv(",
    "safeNumber(",
    "deriveMetaV2Numbers(",
    "sumMetaV2BaseNumbers(",
    "getColumnValue(",
  ]);
}

const shell = read("components/meta-v2/shell/MetaOSV2App.tsx");

if (!shell.includes("normalizeMetaV2Rows")) {
  throw new Error("MetaOSV2App must normalize raw store rows through normalizeMetaV2Rows.");
}

if (!shell.includes("buildMetaV2CommandCenter")) {
  throw new Error("MetaOSV2App must consume command center engine output.");
}

const forbiddenBackendUiCoupling = [
  "lib/meta-v2/engines",
  "lib/meta-v2/metrics.ts",
  "lib/meta-v2/calculationCore.ts",
  "lib/meta-v2/decisionRules.ts",
  "lib/meta-v2/normalize.ts",
].flatMap((target) =>
  listFiles(target, (file) => file.endsWith(".ts"))
);

for (const file of forbiddenBackendUiCoupling) {
  mustNotContain(file, [
    "className=",
    "<div",
    "<section",
    "<table",
    "lucide-react",
    "useState",
    "useMemo",
    "useEffect",
  ]);
}

console.log("✅ MetaOS backend data contract audit passed.");
console.log("");
console.log("Verified contract:");
console.log("Raw rows → columnMap → normalize → clean rows → metrics → decision rules → engines → UI");
console.log("");
console.log("Protection checks:");
console.log("- Engines do not read raw columns");
console.log("- Engines do not own derived math");
console.log("- Formatters do not own math");
console.log("- Backend does not import frontend");
console.log("- V2 dashboard files do not call backend primitive math directly");
console.log("- MetaOSV2App normalizes current store rows before engine use");
