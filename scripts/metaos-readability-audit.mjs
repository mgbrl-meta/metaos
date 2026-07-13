import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  rootLayout: "app/layout.tsx",

  legacyLayout:
    "app/(legacy)/layout.tsx",

  legacyGlobal:
    "app/globals.css",

  legacyTheme:
    "app/os-theme-final.css",

  legacyReadability:
    "app/metaos-readability.css",

  workspaceLayout:
    "app/workspace/layout.tsx",

  workspaceIndex:
    "styles/metaos-ui/index.css",

  workspaceTokens:
    "styles/metaos-ui/tokens.css",

  workspaceFoundation:
    "styles/metaos-ui/foundation.css",

  workspaceEngineScreens:
    "styles/metaos-ui/engine-screens.css",

  workspaceActionScreens:
    "styles/metaos-ui/action-screens.css",

  workspaceEconomicScreens:
    "styles/metaos-ui/economic-screens.css",

  workspaceAnalysisScreens:
    "styles/metaos-ui/analysis-screens.css",

  workspaceShell:
    "styles/metaos-ui/shell.css",
};

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  const absolute = path.join(
    root,
    relativePath
  );

  if (!fs.existsSync(absolute)) {
    fail(`Missing readability file: ${relativePath}`);
    return "";
  }

  return fs.readFileSync(
    absolute,
    "utf8"
  );
}

const source = Object.fromEntries(
  Object.entries(files).map(
    ([key, relativePath]) => [
      key,
      read(relativePath),
    ]
  )
);

function assertImportOrder(
  fileLabel,
  fileSource,
  imports
) {
  const positions = imports.map(
    (importToken) =>
      fileSource.indexOf(importToken)
  );

  imports.forEach(
    (importToken, index) => {
      if (positions[index] < 0) {
        fail(
          `${fileLabel} is missing import: ${importToken}`
        );
      }
    }
  );

  for (
    let index = 1;
    index < positions.length;
    index += 1
  ) {
    if (
      positions[index - 1] >= 0 &&
      positions[index] >= 0 &&
      positions[index - 1] >
        positions[index]
    ) {
      fail(
        `${fileLabel} has an invalid CSS import order.`
      );
    }
  }
}

/**
 * Legacy compatibility contract
 *
 * Legacy screens still depend on the previous global,
 * theme and readability layers. They must stay isolated
 * inside the legacy route group and maintain their
 * established import order.
 */
assertImportOrder(
  "Legacy layout",
  source.legacyLayout,
  [
    'import "../globals.css";',
    'import "../os-theme-final.css";',
    'import "../metaos-readability.css";',
  ]
);

for (const token of [
  "MetaOSClassicUXLayer",
  "CopyVisibleMetaFilter",
]) {
  if (
    !source.legacyLayout.includes(token)
  ) {
    fail(
      `Legacy layout lost compatibility layer: ${token}`
    );
  }
}

/**
 * Root-layout isolation contract
 *
 * The root layout must remain neutral. Reintroducing the
 * old CSS here would contaminate /workspace and recreate
 * the patch architecture.
 */
for (const forbidden of [
  "globals.css",
  "os-theme-final.css",
  "metaos-readability.css",
  "MetaOSClassicUXLayer",
]) {
  if (
    source.rootLayout.includes(forbidden)
  ) {
    fail(
      `Root layout must not load legacy readability dependency: ${forbidden}`
    );
  }
}

/**
 * Workspace CSS-entry contract
 */
if (
  !source.workspaceLayout.includes(
    'import "../../styles/metaos-ui/index.css";'
  )
) {
  fail(
    "Workspace layout must import the dedicated MetaOS UI stylesheet."
  );
}

assertImportOrder(
  "Workspace stylesheet",
  source.workspaceIndex,
  [
    '@import "tailwindcss";',
    '@import "./tokens.css";',
    '@import "./foundation.css";',
    '@import "./shell.css";',
  ]
);

/**
 * Workspace semantic-token contract
 */
const requiredLightTokens = [
  "--mos-bg:",
  "--mos-surface:",
  "--mos-surface-subtle:",
  "--mos-surface-strong:",
  "--mos-text:",
  "--mos-text-secondary:",
  "--mos-text-tertiary:",
  "--mos-text-inverse:",
  "--mos-border:",
  "--mos-positive:",
  "--mos-positive-soft:",
  "--mos-negative:",
  "--mos-negative-soft:",
  "--mos-warning:",
];

for (const token of requiredLightTokens) {
  if (
    !source.workspaceTokens.includes(token)
  ) {
    fail(
      `Workspace token contract is missing: ${token}`
    );
  }
}

if (
  !source.workspaceTokens.includes(
    '.metaos-workspace[data-theme="dark"]'
  )
) {
  fail(
    "Workspace dark-mode token scope is missing."
  );
}

const darkScopeStart =
  source.workspaceTokens.indexOf(
    '.metaos-workspace[data-theme="dark"]'
  );

const darkScope =
  darkScopeStart >= 0
    ? source.workspaceTokens.slice(
        darkScopeStart
      )
    : "";

for (const token of [
  "--mos-bg:",
  "--mos-surface:",
  "--mos-text:",
  "--mos-text-secondary:",
  "--mos-border:",
  "--mos-positive:",
  "--mos-negative:",
  "--mos-warning:",
]) {
  if (!darkScope.includes(token)) {
    fail(
      `Dark-mode token contract is missing: ${token}`
    );
  }
}

/**
 * Scoped architecture contract
 */
const workspaceCss = [
  source.workspaceTokens,
  source.workspaceFoundation,
  source.workspaceEngineScreens,
  source.workspaceActionScreens,
  source.workspaceEconomicScreens,
  source.workspaceAnalysisScreens,
  source.workspaceShell,
].join("\n");

for (const forbidden of [
  "!important",
  "[class*=",
  "[class^=",
  "body main",
  "table td *",
  "table th *",
]) {
  if (
    workspaceCss.includes(forbidden)
  ) {
    fail(
      `Workspace CSS contains forbidden broad override: ${forbidden}`
    );
  }
}

for (const selector of [
  ".metaos-workspace",
  ".mos-panel",
  ".mos-status-chip",
  ".mos-positive",
  ".mos-negative",
  ".mos-header-action",
  ".mos-nav-item.is-active",
]) {
  if (!workspaceCss.includes(selector)) {
    fail(
      `Workspace readability selector is missing: ${selector}`
    );
  }
}

/**
 * Neutral visual-language contract
 */
for (const forbidden of [
  "linear-gradient",
  "radial-gradient",
  "#0A84FF",
  "rgba(10,132,255",
  "rgba(10, 132, 255",
]) {
  if (
    workspaceCss.includes(forbidden)
  ) {
    fail(
      `Workspace visual system contains deprecated decorative styling: ${forbidden}`
    );
  }
}

/**
 * Legacy readability existence contract
 *
 * The old readability layer remains valid only for legacy
 * screens during migration. It must not be deleted until
 * those screens have been migrated.
 */
if (
  source.legacyReadability.trim().length < 100
) {
  fail(
    "Legacy readability layer appears to be empty or damaged."
  );
}

if (
  source.legacyTheme.trim().length < 100
) {
  fail(
    "Legacy theme compatibility layer appears to be empty or damaged."
  );
}

if (
  source.legacyGlobal.trim().length < 100
) {
  fail(
    "Legacy global stylesheet appears to be empty or damaged."
  );
}

if (process.exitCode) {
  console.error("");
  console.error(
    "MetaOS readability architecture audit failed."
  );
  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Architecture-Aware Readability Audit"
);
console.log(
  "==========================================="
);
console.log(
  "✅ Legacy readability CSS remains isolated to legacy routes."
);
console.log(
  "✅ Legacy CSS import order is preserved."
);
console.log(
  "✅ Root layout is free from legacy CSS contamination."
);
console.log(
  "✅ /workspace owns an independent stylesheet entry."
);
console.log(
  "✅ Light and dark semantic token contracts exist."
);
console.log(
  "✅ Positive, negative and warning states use semantic tokens."
);
console.log(
  "✅ Workspace styles are scoped to the new application architecture."
);
console.log(
  "✅ No broad class-selector overrides."
);
console.log(
  "✅ No !important declarations in the new UI layer."
);
console.log(
  "✅ No deprecated gradient or blue-accent styling."
);
console.log(
  "✅ Architecture-aware readability contract: PASS"
);
