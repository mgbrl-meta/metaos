import { execSync } from "node:child_process";

const checks = [
  ["Backend Calculation Test", "npm run metaos:calc-test"],
  ["Backend Engine Regression Test", "npm run metaos:engine-test"],
  ["Backend Data Contract Audit", "npm run metaos:data-contract"],
  ["Backend Data Adapter Audit", "npm run metaos:adapter-audit"],
  ["Data Connection Architecture Audit", "npm run metaos:data-connections"],
  ["Route Handler Architecture Audit", "npm run metaos:route-handlers"],
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
  ["Analysis Layer Engine Audit", "npm run metaos:analysis-layer"],
  ["Analysis Screen Migration Audit", "npm run metaos:analysis-screens"],
  ["Final Meta Reconciliation Audit", "npm run metaos:reconcile-final"],
  ["Final Frontend Freeze Audit", "npm run metaos:frontend-freeze-final"],
  ["Frontend Module Registry Audit", "npm run metaos:module-registry"],
  ["Frontend Unified UI State Audit", "npm run metaos:ui-state"],
  ["Frontend Shell Architecture Audit", "npm run metaos:frontend-shell"],
  ["TypeScript", "npm run metaos:typecheck"],
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
