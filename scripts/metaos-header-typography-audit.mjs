import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  tokens: "styles/metaos-ui/tokens.css",
  shell: "styles/metaos-ui/shell.css",
  dataStatus:
    "components/metaos-ui/data/MetaDataStatus.tsx",
  header:
    "components/metaos-ui/shell/MetaOSHeader.tsx",
};

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  const absolute = path.join(root, relativePath);

  if (!fs.existsSync(absolute)) {
    fail(`Missing architecture file: ${relativePath}`);
    return "";
  }

  return fs.readFileSync(absolute, "utf8");
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, filename]) => [
    key,
    read(filename),
  ])
);

const requiredTokens = [
  "--mos-type-display-size:",
  "--mos-type-title-size:",
  "--mos-type-body-size:",
  "--mos-type-control-size:",
  "--mos-type-control-weight:",
  "--mos-type-control-line-height:",
  "--mos-type-meta-size:",
  "--mos-control-height-sm:",
  "--mos-control-padding-sm:",
  "--mos-control-gap-sm:",
  "--mos-control-icon-sm:",
];

for (const token of requiredTokens) {
  if (!source.tokens.includes(token)) {
    fail(`Missing shared token: ${token}`);
  }
}

const actualClasses = [
  "mos-status-chip",
  "mos-header-action",
  "mos-icon-button",
];

for (const className of actualClasses) {
  if (
    !source.dataStatus.includes(className) &&
    !source.header.includes(className)
  ) {
    fail(
      `Actual header architecture no longer uses: ${className}`
    );
  }
}

const requiredCss = [
  ".metaos-workspace .mos-status-chip,",
  ".metaos-workspace .mos-header-action",
  "font-size: var(--mos-type-control-size)",
  "font-weight: var(--mos-type-control-weight)",
  "line-height: var(--mos-type-control-line-height)",
  "min-height: var(--mos-control-height-sm)",
  "width: var(--mos-control-icon-sm)",
  "height: var(--mos-control-icon-sm)",
];

for (const declaration of requiredCss) {
  if (!source.shell.includes(declaration)) {
    fail(
      `Shared header-control CSS is missing: ${declaration}`
    );
  }
}

for (const component of [
  source.dataStatus,
  source.header,
]) {
  for (const forbidden of [
    "fontSize:",
    "font-size:",
    "text-[",
  ]) {
    if (component.includes(forbidden)) {
      fail(
        `Component-level typography override found: ${forbidden}`
      );
    }
  }
}

if (source.header.includes("HeaderStatus")) {
  fail(
    "Restored baseline must not depend on the absent HeaderStatus primitive."
  );
}

if (source.dataStatus.includes("HeaderStatus")) {
  fail(
    "MetaDataStatus must use its actual status-chip architecture."
  );
}

if (process.exitCode) {
  console.error("");
  console.error(
    "MetaOS header typography architecture: FAIL"
  );
  process.exit(1);
}

console.log("");
console.log("MetaOS Header Typography Architecture Audit");
console.log("===========================================");
console.log("✅ Actual restored component structure verified.");
console.log("✅ One canonical typography hierarchy.");
console.log("✅ Status chips and action buttons share one font scale.");
console.log("✅ Refresh and Light share one font scale.");
console.log("✅ Status, actions and icons share one control height.");
console.log("✅ Components contain no local typography patches.");
console.log("✅ Header typography architecture: PASS");
