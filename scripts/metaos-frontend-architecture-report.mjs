import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const outputDir = path.join(
  root,
  ".metaos-frontend-baselines",
  stamp
);

const contract = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "config",
      "metaos-frontend-contract.json"
    ),
    "utf8"
  )
);

const cssFiles = [
  "app/globals.css",
  "app/os-theme-final.css",
  "app/metaos-readability.css"
];

const compositionFiles = [
  "app/layout.tsx",
  "app/(legacy)/page.tsx",
  "app/(legacy)/v2/page.tsx",
  "components/layout/MetaOSShell.tsx",
  "components/meta-v2/shell/MetaOSV2App.tsx",
  "components/meta-v2/shell/MetaOSV2Header.tsx",
  "components/meta-v2/shell/MetaOSV2Sidebar.tsx",
  "components/meta-v2/shell/MetaOSV2TopDataControls.tsx",
  "components/meta-v2/shell/MetaOSV2TopSheetStatus.tsx",
  "components/meta-v2/shell/MetaOSClassicUXLayer.tsx"
];

function read(relativePath) {
  const absolute = path.join(root, relativePath);

  return fs.existsSync(absolute)
    ? fs.readFileSync(absolute, "utf8")
    : "";
}

function countMatches(source, pattern) {
  return (source.match(pattern) || []).length;
}

const css = cssFiles.map((file) => {
  const source = read(file);

  return {
    file,
    exists: Boolean(source),
    lines: source
      ? source.split("\n").length
      : 0,
    importantDeclarations: countMatches(
      source,
      /!important/g
    ),
    fixedPositions: countMatches(
      source,
      /position\s*:\s*fixed/g
    ),
    broadClassContainsSelectors: countMatches(
      source,
      /\[class\*=/g
    )
  };
});

const sources = Object.fromEntries(
  compositionFiles.map((file) => [
    file,
    read(file)
  ])
);

const architectureDebt = [
  {
    code: "GLOBAL_DOM_PATCH_LAYER",
    active:
      sources["app/layout.tsx"].includes(
        "<MetaOSClassicUXLayer"
      ),
    evidence:
      "app/layout.tsx mounts MetaOSClassicUXLayer globally."
  },
  {
    code: "DOM_OBSERVER_NAVIGATION",
    active:
      sources[
        "components/meta-v2/shell/MetaOSClassicUXLayer.tsx"
      ].includes("MutationObserver"),
    evidence:
      "MetaOSClassicUXLayer scans and clicks existing buttons instead of owning navigation state."
  },
  {
    code: "DUPLICATE_V2_TOP_CONTROLS",
    active:
      sources["app/(legacy)/v2/page.tsx"].includes(
        "MetaOSV2TopDataControls"
      ) &&
      sources["app/(legacy)/v2/page.tsx"].includes(
        "MetaOSV2TopSheetStatus"
      ) &&
      sources[
        "components/meta-v2/shell/MetaOSV2App.tsx"
      ].includes("MetaOSV2Header"),
    evidence:
      "/v2 composes top controls, sheet status and its own header as independent top-level layers."
  },
  {
    code: "MULTIPLE_SHELLS",
    active:
      Boolean(
        sources[
          "components/layout/MetaOSShell.tsx"
        ]
      ) &&
      Boolean(
        sources[
          "components/meta-v2/shell/MetaOSV2App.tsx"
        ]
      ),
    evidence:
      "Legacy and V2 shells coexist without one shared module and navigation contract."
  },
  {
    code: "MULTIPLE_THEME_LAYERS",
    active:
      css.filter((item) => item.exists).length >= 3,
    evidence:
      "globals.css, os-theme-final.css and metaos-readability.css all participate in application theming."
  }
].filter((item) => item.active);

const report = {
  project: "MetaOS",
  createdAt: new Date().toISOString(),
  contractVersion: contract.version,
  routes: contract.routes,
  retainedModules: {
    total: contract.modules.length,
    meta: contract.modules.filter(
      (module) => module.platform === "meta"
    ).length,
    google: contract.modules.filter(
      (module) => module.platform === "google"
    ).length,
    system: contract.modules.filter(
      (module) => module.platform === "system"
    ).length,
    engineBackedV2:
      contract.engineBackedV2Modules.length
  },
  css,
  compositionFiles: compositionFiles.map(
    (file) => ({
      file,
      exists: fs.existsSync(
        path.join(root, file)
      )
    })
  ),
  architectureDebt,
  protectedBackendBoundary: [
    "lib/meta-v2/calculationCore.ts",
    "lib/meta-v2/columnMap.ts",
    "lib/meta-v2/normalize.ts",
    "lib/meta-v2/metrics.ts",
    "lib/meta-v2/decisionRules.ts",
    "lib/meta-v2/engineUtils.ts",
    "lib/meta-v2/engines/*"
  ]
};

fs.mkdirSync(outputDir, {
  recursive: true
});

fs.writeFileSync(
  path.join(
    outputDir,
    "frontend-architecture-report.json"
  ),
  JSON.stringify(report, null, 2)
);

const markdown = `# MetaOS Frontend Architecture Baseline

Created: ${report.createdAt}

## Frozen functional contract

- Meta modules: ${report.retainedModules.meta}
- Google modules: ${report.retainedModules.google}
- System modules: ${report.retainedModules.system}
- Engine-backed V2 dashboards: ${report.retainedModules.engineBackedV2}
- Total retained production modules: ${report.retainedModules.total}

## Current CSS ownership

${report.css
  .map(
    (item) =>
      `- \`${item.file}\`: ${item.lines} lines, ${item.importantDeclarations} !important declarations, ${item.fixedPositions} fixed-position rules, ${item.broadClassContainsSelectors} broad class-contains selectors`
  )
  .join("\n")}

## Architecture debt to remove

${report.architectureDebt
  .map(
    (item) =>
      `- **${item.code}** — ${item.evidence}`
  )
  .join("\n")}

## Protected backend boundary

${report.protectedBackendBoundary
  .map((item) => `- \`${item}\``)
  .join("\n")}

## Migration rule

The redesign must preserve the frozen module contract and use one typed module registry, one application shell, one data-status controller and one theme-token system. No existing screen may be removed or silently replaced by a placeholder.
`;

fs.writeFileSync(
  path.join(
    outputDir,
    "frontend-architecture-report.md"
  ),
  markdown
);

console.log("");
console.log(
  "MetaOS Frontend Architecture Baseline"
);
console.log(
  "====================================="
);
console.log(
  `✅ Baseline created: ${path.relative(
    root,
    outputDir
  )}`
);
console.log(
  `✅ Frozen production modules: ${report.retainedModules.total}`
);
console.log(
  `✅ Engine-backed V2 dashboards: ${report.retainedModules.engineBackedV2}`
);
console.log(
  `⚠️ Architecture debt items recorded: ${report.architectureDebt.length}`
);

for (const item of report.css) {
  console.log(
    `- ${item.file}: ${item.lines} lines / ${item.importantDeclarations} !important`
  );
}
