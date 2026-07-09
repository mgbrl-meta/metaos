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

  "app/page.tsx",
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
  "lib/meta-v2/engines/funnelEngine.ts",
  "lib/meta-v2/engines/zeroPurchaseEngine.ts",
  "lib/meta-v2/engines/dataQcEngine.ts",

  "scripts/metaos-calc-test.mjs",
  "scripts/metaos-engine-regression.mjs",
  "scripts/metaos-readability-audit.mjs",
  "scripts/metaos-qc.mjs",
  "scripts/metaos-baseline.mjs",
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
  ["TypeScript", "npx tsc --noEmit"],
  ["Build", "npm run build"],
];

const informationalChecks = [
  ["Legacy Full Lint", "npm run metaos:legacy-lint"],
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
