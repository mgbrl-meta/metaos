import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const baselineDir = path.join(root, ".metaos-baselines", stamp);

const criticalFiles = [
  "package.json",
  "tsconfig.json",
  "next.config.ts",

  "app/(legacy)/page.tsx",
  "app/layout.tsx",
  "app/globals.css",
  "app/os-theme-final.css",
  "app/metaos-readability.css",
  "app/api/meta-sheet/route.ts",

  "components/layout/MetaOSShell.tsx",
  "components/meta/AutoMetaSheetLoader.tsx",
  "components/meta/FunnelTab.tsx",
  "components/meta/FunnelTabV2.tsx",
  "components/meta/ZeroPurchaseTab.tsx",
  "components/meta/ZeroPurchaseTabV2.tsx",
  "components/meta/DataQCTab.tsx",
  "components/meta/GptTab.tsx",

  "store/metaStore.ts",
  "store/metaV2UiStore.ts",
  "store/metaOSUiStore.ts",
  "lib/metaos-ui/moduleRegistry.ts",
  "components/metaos-ui/modules/CommandCenterModule.tsx",
  "docs/METAOS_ENGINE_SCREEN_MIGRATION.md",
  "scripts/metaos-engine-screen-migration-audit.mjs",
  "styles/metaos-ui/engine-screens.css",
  "components/metaos-ui/modules/ZeroPurchaseModule.tsx",
  "components/metaos-ui/modules/DataQcModule.tsx",
  "components/metaos-ui/modules/FunnelModule.tsx",
  "docs/METAOS_ACTION_SCREEN_MIGRATION.md",
  "scripts/metaos-action-screen-migration-audit.mjs",
  "styles/metaos-ui/action-screens.css",
  "components/metaos-ui/modules/InfluencerModule.tsx",
  "docs/METAOS_ECONOMIC_SCREEN_MIGRATION.md",
  "scripts/metaos-economic-screen-migration-audit.mjs",
  "styles/metaos-ui/economic-screens.css",
  "components/metaos-ui/modules/HighRoasModule.tsx",
  "components/metaos-ui/modules/GptControlModule.tsx",
  "components/metaos-ui/modules/HighCpaModule.tsx",
  "components/metaos-ui/modules/EconomicControlShared.tsx",
  "components/metaos-ui/modules/PriorityModule.tsx",
  "components/metaos-ui/modules/SummaryModule.tsx",
  "components/metaos-ui/MetaOSModuleRenderer.tsx",
  "docs/METAOS_UI_PRIMITIVE_ARCHITECTURE.md",
  "docs/METAOS_DESIGN_SYSTEM_AUDIT_CONTRACT.md",
  "scripts/metaos-primitives-audit.mjs",
  "styles/metaos-ui/primitives.css",
  "components/metaos-ui/primitives/StatePanel.tsx",
  "components/metaos-ui/primitives/SegmentedControl.tsx",
  "components/metaos-ui/primitives/FilterBar.tsx",
  "components/metaos-ui/primitives/MetricCard.tsx",
  "components/metaos-ui/primitives/Card.tsx",
  "lib/metaos-ui/cx.ts",
  "docs/METAOS_FRONTEND_SHELL_ARCHITECTURE.md",
  "docs/METAOS_READABILITY_ARCHITECTURE.md",
  "scripts/metaos-frontend-shell-audit.mjs",
  "components/metaos-ui/shell/MetaOSWorkspaceShell.tsx",
  "components/metaos-ui/shell/MetaOSHeader.tsx",
  "components/metaos-ui/shell/MetaOSSidebar.tsx",
  "components/metaos-ui/data/MetaDataStatus.tsx",
  "styles/metaos-ui/shell.css",
  "styles/metaos-ui/foundation.css",
  "styles/metaos-ui/tokens.css",
  "styles/metaos-ui/index.css",
  "app/workspace/page.tsx",
  "app/workspace/layout.tsx",
  "app/(legacy)/v2/page.tsx",
  "app/(legacy)/layout.tsx",
  "app/root.css",
  "scripts/metaos-module-registry-audit.mjs",
  "docs/METAOS_FRONTEND_MODULE_ARCHITECTURE.md",
  "styles/metaos-tokens.css",
  "styles/metaos-foundation.css",
  "lib/metaos-ui/themeContract.ts",
  "components/metaos-ui/foundation/MetaOSThemeScope.tsx",
  "components/metaos-ui/primitives/Button.tsx",
  "components/metaos-ui/primitives/IconButton.tsx",
  "components/metaos-ui/primitives/Badge.tsx",
  "components/metaos-ui/primitives/Panel.tsx",
  "components/metaos-ui/primitives/Metric.tsx",
  "components/metaos-ui/primitives/PageHeader.tsx",
  "components/metaos-ui/primitives/Divider.tsx",
  "components/metaos-ui/primitives/index.ts",
  "docs/METAOS_ANALYTICAL_TABLE_ARCHITECTURE.md",
  "scripts/metaos-table-system-audit.mjs",
  "styles/metaos-ui/table.css",
  "components/metaos-ui/table/index.ts",
  "components/metaos-ui/table/TableDensityControl.tsx",
  "components/metaos-ui/table/TablePagination.tsx",
  "components/metaos-ui/table/TableToolbar.tsx",
  "components/metaos-ui/table/DataTable.tsx",
  "components/metaos-ui/table/types.ts",
  "scripts/metaos-design-system-audit.mjs",
  "docs/METAOS_DESIGN_SYSTEM.md",
  "store/metaV2SettingsStore.ts",

  "lib/meta-v2/calculationCore.ts",
  "lib/meta-v2/engineUtils.ts",
  "lib/meta-v2/decisionRules.ts",
  "lib/meta-v2/normalize.ts",
  "lib/meta-v2/metrics.ts",
  "lib/meta-v2/formatters.ts",
  "lib/meta-v2/dateWindows.ts",
  "lib/meta-v2/columnMap.ts",
  "lib/meta-v2/engines/commandCenterEngine.ts",
  "docs/METAOS_ACTION_LAYER_ENGINE_ARCHITECTURE.md",
  "scripts/metaos-action-layer-engine-audit.mjs",
  "lib/meta-v2/engines/influencerEngine.ts",
  "docs/METAOS_ECONOMIC_CONTROL_ENGINE_ARCHITECTURE.md",
  "scripts/metaos-economic-control-engine-audit.mjs",
  "lib/meta-v2/engines/highRoasEngine.ts",
  "lib/meta-v2/engines/gptControlEngine.ts",
  "lib/meta-v2/engines/highCpaEngine.ts",
  "lib/meta-v2/economicControlUtils.ts",
  "lib/meta-v2/engines/priorityEngine.ts",
  "lib/meta-v2/engines/executiveSummaryEngine.ts",
  "lib/meta-v2/engines/funnelEngine.ts",
  "lib/meta-v2/engines/zeroPurchaseEngine.ts",
  "lib/meta-v2/engines/dataQcEngine.ts",

  "scripts/metaos-calc-test.mjs",
  "scripts/metaos-engine-regression.mjs",
  "scripts/metaos-readability-audit.mjs",
  "scripts/metaos-qc.mjs",
  "scripts/metaos-typecheck.mjs",
  "scripts/metaos-baseline.mjs",
  "config/metaos-module-registry.json",
  "lib/metaos-ui/contracts.ts",
  "lib/metaos-ui/moduleRegistry.ts",
  "lib/metaos-ui/moduleQueries.ts",
  "store/metaOSUiStore.ts",
  "scripts/metaos-module-registry-audit.mjs",
  "scripts/metaos-ui-state-audit.mjs",
  "docs/METAOS_FRONTEND_MODULE_ARCHITECTURE.md",
  "config/metaos-frontend-contract.json",
  "docs/METAOS_REMAINING_META_MIGRATION_CONTRACT.md",
  "scripts/metaos-remaining-meta-report.mjs",
  "scripts/metaos-remaining-meta-contract-audit.mjs",
  "config/metaos-remaining-meta-screen-contract.json",
  "docs/METAOS_FRONTEND_MIGRATION_CONTRACT.md",
  "scripts/metaos-frontend-contract-audit.mjs",
  "scripts/metaos-frontend-architecture-report.mjs",
  "scripts/metaos-no-dom-patch-audit.mjs",
];

const ignoredDirs = new Set([
  "node_modules",
  ".next",
  ".git",
  ".metaos-backups",
  ".metaos-baselines",
  "dist",
  "out",
]);

const blockingChecks = [
  ["Backend Calculation Test", "npm run metaos:calc-test"],
  ["Backend Engine Regression Test", "npm run metaos:engine-test"],
  ["Backend Data Contract Audit", "npm run metaos:data-contract"],
  ["Backend Data Adapter Audit", "npm run metaos:adapter-audit"],
  ["Backend Output Shape Audit", "npm run metaos:output-shape"],
  ["Backend Fixture Regression Test", "npm run metaos:fixture-test"],
  ["Settings Guardrail Audit", "npm run metaos:settings-guardrail"],
  ["Architecture Freeze Audit", "npm run metaos:architecture-freeze"],
  ["Readability Audit", "npm run metaos:readability-audit"],
  ["Frontend Contract Audit", "npm run metaos:frontend-contract"],
  ["Design System Audit", "npm run metaos:design-system"],
  ["UI Primitive Architecture Audit", "npm run metaos:primitives"],
  ["Analytical Table System Audit", "npm run metaos:table-system"],
  ["Engine Screen Migration Audit", "npm run metaos:engine-screens"],
  ["Remaining Meta Screen Contract Audit", "npm run metaos:remaining-meta-contract"],
  ["Action Layer Engine Audit", "npm run metaos:action-layer"],
  ["Action Screen Migration Audit", "npm run metaos:action-screens"],
  ["Economic Control Engine Audit", "npm run metaos:economic-control"],
  ["Economic Screen Migration Audit", "npm run metaos:economic-screens"],
  ["Frontend Module Registry Audit", "npm run metaos:module-registry"],
  ["Frontend Unified UI State Audit", "npm run metaos:ui-state"],
  ["Frontend Shell Architecture Audit", "npm run metaos:frontend-shell"],
  ["TypeScript", "npm run metaos:typecheck"],
  ["Build", "npm run build"],
];

const informationalChecks = [
  ["Legacy Full Lint", "npm run metaos:legacy-lint"],
  ["Frontend DOM Patch Debt", "npm run metaos:no-dom-patch"],
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function copyFileSafe(file) {
  const source = path.join(root, file);
  const target = path.join(baselineDir, "files", file);

  if (!fs.existsSync(source)) return;

  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function walk(dir = root, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute);

    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      walk(absolute, list);
    } else {
      list.push(relative);
    }
  }

  return list;
}

function runCheck(label, command, blocking = true) {
  try {
    const output = execSync(command, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 180000,
    });

    return {
      label,
      command,
      blocking,
      status: "PASS",
      output: output.trim(),
    };
  } catch (error) {
    return {
      label,
      command,
      blocking,
      status: "FAIL",
      output: `${error.stdout || ""}\n${error.stderr || ""}`.trim(),
    };
  }
}

ensureDir(baselineDir);
ensureDir(path.join(baselineDir, "files"));

for (const file of criticalFiles) {
  copyFileSafe(file);
}

const manifest = walk().sort();

const blockingResults = blockingChecks.map(([label, command]) =>
  runCheck(label, command, true)
);

const informationalResults = informationalChecks.map(([label, command]) =>
  runCheck(label, command, false)
);

const results = [...blockingResults, ...informationalResults];

const blockingFailed = blockingResults.some((check) => check.status === "FAIL");

const report = {
  project: "MetaOS / Meta AI Growth OS",
  createdAt: new Date().toISOString(),
  baselineDir: path.relative(root, baselineDir),
  totalFiles: manifest.length,
  blockingStatus: blockingFailed ? "FAIL" : "PASS",
  note: "Legacy full-project lint is informational because it contains pre-existing legacy frontend lint debt. Product QC blocks on backend tests, readability, TypeScript, and build.",
  criticalFiles: criticalFiles.map((file) => ({
    file,
    exists: exists(file),
  })),
  checks: results.map((check) => ({
    label: check.label,
    command: check.command,
    blocking: check.blocking,
    status: check.status,
  })),
};

fs.writeFileSync(
  path.join(baselineDir, "manifest.json"),
  JSON.stringify(manifest, null, 2)
);

fs.writeFileSync(
  path.join(baselineDir, "baseline-report.json"),
  JSON.stringify(report, null, 2)
);

fs.writeFileSync(
  path.join(baselineDir, "qc-output.txt"),
  results
    .map(
      (check) =>
        `# ${check.label}\nCommand: ${check.command}\nBlocking: ${check.blocking}\nStatus: ${check.status}\n\n${check.output || "No output"}\n`
    )
    .join("\n\n")
);

console.log("");
console.log("✅ MetaOS baseline snapshot created");
console.log(`📁 ${path.relative(root, baselineDir)}`);
console.log("");
console.log("Product QC Summary:");
for (const check of blockingResults) {
  console.log(`- ${check.label}: ${check.status}`);
}
console.log("");
console.log("Informational Checks:");
for (const check of informationalResults) {
  console.log(`- ${check.label}: ${check.status}`);
}
console.log("");
console.log(blockingFailed ? "❌ Blocking product QC failed." : "✅ Blocking product QC passed.");
console.log("Legacy lint is recorded but does not block backend/product QC.");
console.log("");
