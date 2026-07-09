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
      throw new Error(`${file} is missing required output-shape fragment:\n${fragment}`);
    }
  }
}

function mustNotContain(file, fragments) {
  const source = read(file);

  for (const fragment of fragments) {
    if (source.includes(fragment)) {
      throw new Error(`${file} contains forbidden output-shape fragment:\n${fragment}`);
    }
  }
}

/**
 * 1. Schema-level command center contract
 */
mustContain("lib/meta-v2/schema.ts", [
  "export interface MetaV2CommandCenterOutput",
  "status: MetaV2Status",
  "totals: MetaV2Totals",
  "healthScore: number",
  "scaleReadiness:",
  "verdict: string",
  "biggestRisk: string",
  "biggestOpportunity: string",
  "actionCounts:",
  "scale: number",
  "reduce: number",
  "kill: number",
  "refresh: number",
  "watch: number",
]);

/**
 * 2. Command Center engine output contract
 */
mustContain("lib/meta-v2/engines/commandCenterEngine.ts", [
  "export function buildMetaV2CommandCenter",
  "MetaV2CommandCenterOutput",
  "status:",
  "isLive: rows.length > 0",
  "latestDate",
  "rowCount: rows.length",
  "syncedAt",
  "totals",
  "healthScore",
  "scaleReadiness",
  "verdict",
  "biggestRisk",
  "biggestOpportunity",
  "actionCounts:",
  "scale: scaleCount",
  "reduce: reduceCount",
  "kill: killCount",
  "refresh: refreshCount",
  "watch: watchCount",
]);

/**
 * 3. Funnel output contract
 */
mustContain("lib/meta-v2/engines/funnelEngine.ts", [
  "export interface MetaV2FunnelRow",
  "id: string",
  "label: string",
  'level: "month" | "week"',
  "startDate: string",
  "endDate: string",
  "totals: MetaV2Totals",
  "children?: MetaV2FunnelRow[]",
  "export interface MetaV2FunnelOutput",
  "summary: MetaV2Totals",
  "rows: MetaV2FunnelRow[]",
  "monthCount: number",
  "weekCount: number",
  "strongestMonth: string",
  "weakestMonth: string",
  "verdict: string",
  "export function buildMetaV2Funnel",
]);

mustContain("lib/meta-v2/engines/funnelEngine.ts", [
  "summary,",
  "rows: monthRows",
  "monthCount: monthRows.length",
  "weekCount:",
  "strongestMonth:",
  "weakestMonth:",
  "verdict",
]);

/**
 * 4. Zero Purchase output contract
 */
mustContain("lib/meta-v2/engines/zeroPurchaseEngine.ts", [
  "export interface MetaV2ZeroPurchaseTrendRow",
  "date: string",
  "spend: number",
  "clicks: number",
  "lpv: number",
  "atc: number",
  "purchases: number",
  "roas: number",
  "export interface MetaV2ZeroPurchaseItem",
  "id: string",
  "adName: string",
  "adSetName: string",
  "campaignName: string",
  "latestDate: string",
  "lifetime: MetaV2Totals",
  "last7: MetaV2Totals",
  "latest: MetaV2Totals",
  'severity: "critical" | "high" | "medium"',
  "action: string",
  "reason: string",
  "trend: MetaV2ZeroPurchaseTrendRow[]",
  "export interface MetaV2ZeroPurchaseOutput",
  "latestDate: string",
  "totalItems: number",
  "totalLifetimeWaste: number",
  "totalLast7Waste: number",
  "totalLatestWaste: number",
  "items: MetaV2ZeroPurchaseItem[]",
  "verdict: string",
]);

mustContain("lib/meta-v2/engines/zeroPurchaseEngine.ts", [
  "export function buildMetaV2ZeroPurchase",
  "totalLifetimeWaste",
  "totalLast7Waste",
  "totalLatestWaste",
  "items",
  "verdict",
]);

/**
 * 5. Data QC output contract
 */
mustContain("lib/meta-v2/engines/dataQcEngine.ts", [
  "export type MetaV2QcSeverity",
  "export interface MetaV2QcIssue",
  "severity: MetaV2QcSeverity",
  "code: string",
  "title: string",
  "detail: string",
  "action: string",
  "export interface MetaV2DataQcOutput",
  "score: number",
  "grade:",
  "confidence:",
  "latestDate: string",
  "earliestDate: string",
  "rowCount: number",
  "activeRowCount: number",
  "totalColumnsConfidence: number",
  "totals: MetaV2Totals",
  "zeroPurchaseSpend: number",
  "zeroPurchaseSpendShare: number",
  "issueCounts:",
  "critical: number",
  "warning: number",
  "info: number",
  "pass: number",
  "issues: MetaV2QcIssue[]",
  "verdict: string",
  "export function buildMetaV2DataQc",
]);

/**
 * 6. Decision result output contract
 */
mustContain("lib/meta-v2/decisionRules.ts", [
  "export interface MetaV2DecisionResult",
  "action: MetaV2EngineAction",
  "severity: MetaV2EngineSeverity",
  "wasteScore: number",
  "scaleScore: number",
  "reason: string",
  "nextStep: string",
  "export function getMetaV2Decision",
]);

mustContain("lib/meta-v2/decisionRules.ts", [
  "action,",
  "wasteScore,",
  "scaleScore,",
  "reason:",
  "nextStep:",
]);

/**
 * 7. UI consumption audit.
 * This should verify dashboards use engine outputs,
 * not force every output field to be consumed in one component.
 */
mustContain("components/meta-v2/shell/MetaOSV2App.tsx", [
  "commandOutput",
  "commandOutput.status",
  "buildMetaV2CommandCenter",
]);

mustContain("components/meta-v2/dashboard/CommandCenter.tsx", [
  "MetaV2CommandCenterOutput",
  "output.healthScore",
  "output.scaleReadiness",
  "output.verdict",
  "output.biggestRisk",
  "output.biggestOpportunity",
  "output.actionCounts.scale",
  "output.actionCounts.reduce",
  "output.actionCounts.kill",
  "output.actionCounts.refresh",
  "output.actionCounts.watch",
]);

mustContain("components/meta-v2/dashboard/FunnelDashboard.tsx", [
  "buildMetaV2Funnel",
  "output.summary",
  "output.monthCount",
  "output.weekCount",
  "output.strongestMonth",
  "output.weakestMonth",
  "output.rows.map",
]);

mustContain("components/meta-v2/dashboard/ZeroPurchaseDashboard.tsx", [
  "buildMetaV2ZeroPurchase",
  "output.totalItems",
  "output.totalLifetimeWaste",
  "output.totalLast7Waste",
  "output.totalLatestWaste",
  "output.items.map",
]);

mustContain("components/meta-v2/dashboard/DataQcDashboard.tsx", [
  "buildMetaV2DataQc",
  "output.score",
  "output.grade",
  "output.confidence",
  "output.rowCount",
  "output.activeRowCount",
  "output.totalColumnsConfidence",
  "output.zeroPurchaseSpendShare",
  "output.issueCounts",
  "output.issues.map",
]);

/**
 * 8. Engines must return objects, not UI fragments/classes.
 */
const backendFiles = [
  "lib/meta-v2/engines/commandCenterEngine.ts",
  "lib/meta-v2/engines/funnelEngine.ts",
  "lib/meta-v2/engines/zeroPurchaseEngine.ts",
  "lib/meta-v2/engines/dataQcEngine.ts",
  "lib/meta-v2/decisionRules.ts",
];

for (const file of backendFiles) {
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

console.log("✅ MetaOS backend output shape audit passed.");
console.log("");
console.log("Verified output shapes:");
console.log("- Command Center");
console.log("- Funnel");
console.log("- Zero Purchase");
console.log("- Data QC");
console.log("- Decision Rules");
console.log("");
console.log("Protection checks:");
console.log("- Engines return stable data objects");
console.log("- Shell/header may consume status output");
console.log("- Dashboard files consume expected engine output fields");
console.log("- Backend engines do not return UI fragments");
