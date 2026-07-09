import fs from "node:fs";

const requiredFiles = [
  "app/metaos-readability.css",
  "app/layout.tsx",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required readability file: ${file}`);
  }
}

const layout = fs.readFileSync("app/layout.tsx", "utf8");
const themeIndex = layout.indexOf('import "./os-theme-final.css";');
const readabilityIndex = layout.indexOf('import "./metaos-readability.css";');

if (themeIndex === -1) {
  throw new Error("layout.tsx must import os-theme-final.css before readability layer.");
}

if (readabilityIndex === -1) {
  throw new Error("layout.tsx must import metaos-readability.css.");
}

if (readabilityIndex < themeIndex) {
  throw new Error("metaos-readability.css must be imported after os-theme-final.css.");
}

const css = fs.readFileSync("app/metaos-readability.css", "utf8");

const requiredFragments = [
  '[data-os-root="true"][data-os-theme="light"]',
  '[data-os-root="true"][data-os-theme="dark"]',
  '--read-text',
  '--read-surface',
  '--read-table-head-bg',
  'thead',
  'tbody',
  'recharts',
  'bg-\\[\\#0A84FF\\]',
];

for (const fragment of requiredFragments) {
  if (!css.includes(fragment)) {
    throw new Error(`Readability CSS missing required fragment: ${fragment}`);
  }
}

const forbiddenFrontendTargets = [
  "components/meta/",
  "components/meta-v2/",
  "components/layout/",
];

console.log("✅ MetaOS readability audit passed.");
console.log("Checked:");
console.log("- Dedicated readability CSS exists");
console.log("- Import order is correct");
console.log("- Light/dark theme tokens exist");
console.log("- Table/chart/action-button readability rules exist");
console.log("- No component files are required for this layer");
console.log("");
console.log("Frontend component folders intentionally not touched by this audit:");
for (const target of forbiddenFrontendTargets) console.log(`- ${target}`);
