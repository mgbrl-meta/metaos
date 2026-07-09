import fs from "node:fs";

function mustExist(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing required file: ${file}`);
}

function mustContain(file, fragments) {
  mustExist(file);
  const source = fs.readFileSync(file, "utf8");
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${file} missing required fragment: ${fragment}`);
    }
  }
}

const requiredFiles = [
  "docs/METAOS_V2_BACKEND_ARCHITECTURE.md",
  "lib/meta-v2/schema.ts",
  "lib/meta-v2/columnMap.ts",
  "lib/meta-v2/normalize.ts",
  "lib/meta-v2/calculationCore.ts",
  "lib/meta-v2/metrics.ts",
  "lib/meta-v2/engineUtils.ts",
  "lib/meta-v2/decisionRules.ts",
  "lib/meta-v2/formatters.ts",
  "lib/meta-v2/engines/commandCenterEngine.ts",
  "lib/meta-v2/engines/funnelEngine.ts",
  "lib/meta-v2/engines/zeroPurchaseEngine.ts",
  "lib/meta-v2/engines/dataQcEngine.ts",
  "scripts/metaos-qc.mjs",
  "scripts/metaos-baseline.mjs",
  "scripts/metaos-calc-test.mjs",
  "scripts/metaos-engine-regression.mjs",
  "scripts/metaos-data-contract-audit.mjs",
  "scripts/metaos-adapter-audit.mjs",
  "scripts/metaos-output-shape-audit.mjs",
  "scripts/metaos-fixture-regression.mjs",
  "scripts/metaos-settings-guardrail-audit.mjs",
  "scripts/metaos-readability-audit.mjs"
];

for (const file of requiredFiles) mustExist(file);

mustContain("docs/METAOS_V2_BACKEND_ARCHITECTURE.md", [
  "MetaOS V2 Backend Architecture Freeze",
  "Code calculates",
  "calculationCore.ts",
  "decisionRules.ts",
  "npm run metaos:qc"
]);

mustContain("package.json", [
  "metaos:qc",
  "metaos:baseline",
  "metaos:architecture-freeze"
]);

mustContain("scripts/metaos-qc.mjs", [
  "Backend Calculation Test",
  "Backend Engine Regression Test",
  "Backend Data Contract Audit",
  "Backend Data Adapter Audit",
  "Backend Output Shape Audit",
  "Backend Fixture Regression Test",
  "Settings Guardrail Audit",
  "Architecture Freeze Audit",
  "Readability Audit",
  "TypeScript",
  "Build"
]);

console.log("✅ MetaOS final backend architecture freeze passed.");
console.log("Frozen architecture: Raw rows → columnMap → normalize → clean rows → calculationCore → metrics → decisionRules → engines → UI");
