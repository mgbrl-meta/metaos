import { execSync } from "node:child_process";

const checks = [
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

let failed = false;

console.log("");
console.log("MetaOS Product QC Gate");
console.log("======================");
console.log("");
console.log("Blocking checks:");
console.log("- Backend calculation integrity");
console.log("- Backend engine architecture");
console.log("- Readability contract");
console.log("- TypeScript");
console.log("- Production build");
console.log("");
console.log("Note: legacy full-project ESLint is intentionally separate as npm run metaos:legacy-lint.");
console.log("");

for (const [label, command] of checks) {
  try {
    console.log(`Running ${label}: ${command}`);
    execSync(command, {
      stdio: "inherit",
      timeout: 180000,
    });
    console.log(`✅ ${label}: PASS`);
    console.log("");
  } catch {
    console.log(`❌ ${label}: FAIL`);
    console.log("");
    failed = true;
  }
}

if (failed) {
  console.log("QC failed. Do not move to the next ponytail step until the failing product layer is understood.");
  process.exit(1);
}

console.log("✅ All MetaOS product QC checks passed.");
