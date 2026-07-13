import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputDirectory = process.argv[2];

if (!outputDirectory) {
  console.error(
    "Usage: node scripts/metaos-step6c-handoff.mjs <output-directory>"
  );

  process.exit(1);
}

const absoluteOutputDirectory =
  path.resolve(root, outputDirectory);

const entryFiles = [
  "components/meta/HighCpaTab.tsx",
  "components/meta/GptTab.tsx",
  "components/meta/HighRoasTab.tsx",
];

const protectedCandidates = [
  "components/meta/CriticalCpaCreatives.tsx",
  "components/meta/HighCpaFastTab.tsx",
  "components/meta/CreativeTimelineMetrics.tsx",

  "components/metaos-ui/MetaOSModuleRenderer.tsx",

  "app/api/meta-bq/route.ts",
  "app/api/meta-zero-purchase/route.ts",
  "app/api/meta-os-fast/route.ts",
  "app/api/meta-sheet/route.ts",

  "config/metaos-remaining-meta-screen-contract.json",
  "config/metaos-module-registry.json",
  "config/metaos-frontend-contract.json",

  "lib/meta-v2/schema.ts",
  "lib/meta-v2/columnMap.ts",
  "lib/meta-v2/normalize.ts",
  "lib/meta-v2/calculationCore.ts",
  "lib/meta-v2/metrics.ts",
  "lib/meta-v2/decisionRules.ts",
  "lib/meta-v2/engineUtils.ts",
  "lib/meta-v2/formatters.ts",

  "store/metaStore.ts",
  "store/metaV2SettingsStore.ts",
  "store/metaOSUiStore.ts",

  "scripts/metaos-remaining-meta-contract-audit.mjs",
  "scripts/metaos-remaining-meta-report.mjs",
  "scripts/metaos-action-layer-engine-audit.mjs",
  "scripts/metaos-action-screen-migration-audit.mjs",

  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.ts",
];

const extensions = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".mjs",
  ".cjs",
];

function normalizeRelativePath(value) {
  return value
    .replaceAll("\\", "/")
    .replace(/^\.\//, "");
}

function absolute(relativePath) {
  return path.join(
    root,
    normalizeRelativePath(relativePath)
  );
}

function exists(relativePath) {
  return fs.existsSync(
    absolute(relativePath)
  );
}

function isFile(relativePath) {
  return (
    exists(relativePath) &&
    fs
      .statSync(
        absolute(relativePath)
      )
      .isFile()
  );
}

function resolveCandidate(basePath) {
  const normalized =
    normalizeRelativePath(basePath);

  const candidates = [
    normalized,

    ...extensions.map(
      (extension) =>
        `${normalized}${extension}`
    ),

    ...extensions.map(
      (extension) =>
        `${normalized}/index${extension}`
    ),
  ];

  return (
    candidates.find(isFile) ??
    ""
  );
}

function resolveImport(
  importer,
  importPath
) {
  if (
    importPath.startsWith("@/")
  ) {
    return resolveCandidate(
      importPath.slice(2)
    );
  }

  if (
    importPath.startsWith("./") ||
    importPath.startsWith("../")
  ) {
    const importerDirectory =
      path.posix.dirname(
        normalizeRelativePath(
          importer
        )
      );

    return resolveCandidate(
      path.posix.normalize(
        path.posix.join(
          importerDirectory,
          importPath
        )
      )
    );
  }

  return "";
}

function extractImports(source) {
  const imports = new Set();

  /**
   * Inspect only genuine JavaScript and TypeScript dependency syntax.
   *
   * This deliberately ignores CSS @import strings that appear inside
   * audit-token arrays such as:
   *
   * '@import "./engine-screens.css";'
   */

  const patterns = [
    /**
     * Static imports:
     *
     * import value from "@/file";
     * import type { Value } from "@/file";
     * import "@/file";
     */
    /(?:^|\n)[ \t]*import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"'\n]+)["'][ \t]*;?/g,

    /**
     * Re-exports:
     *
     * export { value } from "@/file";
     * export type { Value } from "@/file";
     * export * from "@/file";
     */
    /(?:^|\n)[ \t]*export\s+(?:type\s+)?(?:\*|\{[\s\S]*?\})\s+from\s+["']([^"'\n]+)["'][ \t]*;?/g,

    /**
     * Dynamic imports.
     */
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,

    /**
     * CommonJS dependencies.
     */
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;

    let match;

    while (
      (
        match =
          pattern.exec(source)
      ) !== null
    ) {
      if (match[1]) {
        imports.add(match[1]);
      }
    }
  }

  return Array.from(imports);
}

function sha256(buffer) {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}

function count(source, pattern) {
  return (
    source.match(pattern) ??
    []
  ).length;
}

function uniqueMatches(
  source,
  pattern,
  group = 1
) {
  return Array.from(
    new Set(
      Array.from(
        source.matchAll(
          pattern
        ),
        (match) =>
          match[group]
      ).filter(Boolean)
    )
  ).sort();
}

const collectedFiles =
  new Set();

const dependencyGraph = {};

const unresolvedLocalImports =
  [];

function collect(relativePath) {
  const normalizedPath =
    normalizeRelativePath(
      relativePath
    );

  if (
    !normalizedPath ||
    collectedFiles.has(
      normalizedPath
    )
  ) {
    return;
  }

  if (!isFile(normalizedPath)) {
    throw new Error(
      `Required file does not exist: ${normalizedPath}`
    );
  }

  collectedFiles.add(
    normalizedPath
  );

  const extension =
    path.extname(
      normalizedPath
    );

  if (
    ![
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
    ].includes(extension)
  ) {
    dependencyGraph[
      normalizedPath
    ] = [];

    return;
  }

  const source =
    fs.readFileSync(
      absolute(normalizedPath),
      "utf8"
    );

  const localDependencies =
    [];

  for (
    const importPath of
    extractImports(source)
  ) {
    const looksLocal =
      importPath.startsWith(
        "@/"
      ) ||
      importPath.startsWith(
        "./"
      ) ||
      importPath.startsWith(
        "../"
      );

    if (!looksLocal) {
      continue;
    }

    const resolved =
      resolveImport(
        normalizedPath,
        importPath
      );

    if (!resolved) {
      unresolvedLocalImports.push(
        {
          importer:
            normalizedPath,
          importPath,
        }
      );

      continue;
    }

    localDependencies.push(
      resolved
    );

    collect(resolved);
  }

  dependencyGraph[
    normalizedPath
  ] = Array.from(
    new Set(
      localDependencies
    )
  ).sort();
}

for (const entryFile of entryFiles) {
  collect(entryFile);
}

for (
  const candidate of
  protectedCandidates
) {
  if (isFile(candidate)) {
    collect(candidate);
  }
}

const reportRoot =
  absolute(
    ".metaos-frontend-baselines"
  );

let latestReportDirectory =
  "";

if (
  fs.existsSync(reportRoot)
) {
  const reportDirectories =
    fs
      .readdirSync(
        reportRoot,
        {
          withFileTypes: true,
        }
      )
      .filter(
        (entry) =>
          entry.isDirectory()
      )
      .map(
        (entry) =>
          entry.name
      )
      .sort()
      .reverse();

  latestReportDirectory =
    reportDirectories.find(
      (directory) => {
        const base =
          path.join(
            reportRoot,
            directory
          );

        return (
          fs.existsSync(
            path.join(
              base,
              "remaining-meta-screen-report.json"
            )
          ) ||
          fs.existsSync(
            path.join(
              base,
              "remaining-meta-screen-report.md"
            )
          )
        );
      }
    ) ?? "";
}

const reportFiles = [];

if (latestReportDirectory) {
  for (const fileName of [
    "remaining-meta-screen-report.json",
    "remaining-meta-screen-report.md",
  ]) {
    const reportPath =
      normalizeRelativePath(
        path.join(
          ".metaos-frontend-baselines",
          latestReportDirectory,
          fileName
        )
      );

    if (isFile(reportPath)) {
      collectedFiles.add(
        reportPath
      );

      dependencyGraph[
        reportPath
      ] = [];

      reportFiles.push(
        reportPath
      );
    }
  }
}

fs.mkdirSync(
  absoluteOutputDirectory,
  {
    recursive: true,
  }
);

const fileManifest = [];

for (
  const relativePath of
  Array.from(
    collectedFiles
  ).sort()
) {
  const sourcePath =
    absolute(relativePath);

  const destinationPath =
    path.join(
      absoluteOutputDirectory,
      "files",
      relativePath
    );

  fs.mkdirSync(
    path.dirname(
      destinationPath
    ),
    {
      recursive: true,
    }
  );

  fs.copyFileSync(
    sourcePath,
    destinationPath
  );

  const buffer =
    fs.readFileSync(
      sourcePath
    );

  fileManifest.push({
    file: relativePath,
    bytes:
      buffer.byteLength,
    lines:
      buffer
        .toString("utf8")
        .split("\n").length,
    sha256:
      sha256(buffer),
  });
}

const sourceFacts =
  entryFiles.map(
    (entryFile) => {
      const source =
        fs.readFileSync(
          absolute(entryFile),
          "utf8"
        );

      return {
        file: entryFile,

        lines:
          source
            .split("\n")
            .length,

        exportedNames:
          uniqueMatches(
            source,
            /export\s+(?:default\s+)?(?:function|const|class)\s+([A-Za-z0-9_]+)/g
          ),

        localFunctions:
          uniqueMatches(
            source,
            /(?:^|\n)(?:export\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g
          ),

        stateHooks:
          count(
            source,
            /\buseState\s*(?:<|\()/g
          ),

        memoHooks:
          count(
            source,
            /\buseMemo\s*\(/g
          ),

        effectHooks:
          count(
            source,
            /\buseEffect\s*\(/g
          ),

        clipboardSignals:
          count(
            source,
            /navigator\.clipboard|clipboard\.writeText/g
          ),

        csvSignals:
          count(
            source,
            /text\/csv|\.csv["'`]|createObjectURL/g
          ),

        downloadSignals:
          count(
            source,
            /\.download\s*=|createElement\(["']a["']\)/g
          ),

        fetchSignals:
          uniqueMatches(
            source,
            /fetch\s*\(\s*["'`]([^"'`]+)["'`]/g
          ),

        localStorageSignals:
          count(
            source,
            /localStorage\./g
          ),

        detailsElements:
          count(
            source,
            /<details\b/g
          ),

        buttonElements:
          count(
            source,
            /<button\b/g
          ),

        inputElements:
          count(
            source,
            /<input\b/g
          ),

        selectElements:
          count(
            source,
            /<select\b/g
          ),

        chartSignals:
          uniqueMatches(
            source,
            /<(LineChart|BarChart|ScatterChart|AreaChart|ResponsiveContainer)\b/g
          ),

        numericThresholds:
          Array.from(
            new Set(
              Array.from(
                source.matchAll(
                  /\b(?:threshold|minCpa|maxCpa|minRoas|maxRoas|minSpend|targetCpa|targetRoas)\b[\s\S]{0,50}?(\d+(?:\.\d+)?)/gi
                ),
                (match) =>
                  Number(match[1])
              ).filter(
                Number.isFinite
              )
            )
          ).sort(
            (left, right) =>
              left - right
          ),

        calculationSignals: {
          cpa:
            count(
              source,
              /spend\s*\/\s*purchases|purchases\s*>\s*0[\s\S]{0,40}?spend\s*\/\s*purchases/gi
            ),

          roas:
            count(
              source,
              /(?:revenue|purchaseValue|value)\s*\/\s*spend/gi
            ),

          aov:
            count(
              source,
              /(?:revenue|purchaseValue|value)\s*\/\s*purchases/gi
            ),

          gpt:
            count(
              source,
              /\baov\s*-\s*cpa\b/gi
            ),

          frequency:
            count(
              source,
              /impressions\s*\/\s*reach/gi
            ),

          cpm:
            count(
              source,
              /spend\s*\*\s*1000\s*\/\s*impressions/gi
            ),
        },
      };
    }
  );

const apiSignals = [];

for (
  const relativePath of
  Array.from(collectedFiles)
) {
  if (
    !relativePath.startsWith(
      "app/api/"
    )
  ) {
    continue;
  }

  const source =
    fs.readFileSync(
      absolute(relativePath),
      "utf8"
    );

  apiSignals.push({
    file: relativePath,

    queryViews:
      uniqueMatches(
        source,
        /view\s*===\s*["']([^"']+)["']/g
      ),

    parameterNames:
      uniqueMatches(
        source,
        /searchParams\.get\(["']([^"']+)["']\)/g
      ),

    sqlParameters:
      uniqueMatches(
        source,
        /@([a-zA-Z0-9_]+)/g
      ),

    formulaSignals: {
      cpa:
        count(
          source,
          /spend\s*\/\s*purchases/gi
        ),

      roas:
        count(
          source,
          /(?:revenue|purchase_value|purchaseValue)\s*\/\s*spend/gi
        ),

      aov:
        count(
          source,
          /(?:revenue|purchase_value|purchaseValue)\s*\/\s*purchases/gi
        ),
    },
  });
}

const manifest = {
  project: "MetaOS",

  createdAt:
    new Date().toISOString(),

  purpose:
    "Exact source and dependency handoff for High CPA, GPT and High ROAS architecture extraction.",

  entryFiles,

  protectedCandidates:
    protectedCandidates.filter(
      isFile
    ),

  latestGeneratedReport:
    latestReportDirectory ||
    null,

  reportFiles,

  collectedFileCount:
    fileManifest.length,

  unresolvedLocalImports,

  sourceFacts,

  apiSignals,

  dependencyGraph,

  files: fileManifest,
};

fs.writeFileSync(
  path.join(
    absoluteOutputDirectory,
    "STEP_6C_MANIFEST.json"
  ),
  JSON.stringify(
    manifest,
    null,
    2
  ) + "\n"
);

const markdown = `# MetaOS Step 6C Economic-Control Handoff

Created: ${manifest.createdAt}

## Entry screens

${entryFiles
  .map(
    (file) => `- \`${file}\``
  )
  .join("\n")}

## Dependency closure

- Files collected: ${manifest.collectedFileCount}
- Latest migration report: ${latestReportDirectory || "not found"}
- Unresolved local imports: ${unresolvedLocalImports.length}

## Screen facts

${sourceFacts
  .map(
    (fact) => `### \`${fact.file}\`

- Lines: ${fact.lines}
- State hooks: ${fact.stateHooks}
- Memo hooks: ${fact.memoHooks}
- Effect hooks: ${fact.effectHooks}
- Clipboard signals: ${fact.clipboardSignals}
- CSV signals: ${fact.csvSignals}
- Download signals: ${fact.downloadSignals}
- Fetch targets: ${fact.fetchSignals.join(", ") || "none detected"}
- Local-storage signals: ${fact.localStorageSignals}
- Details rows: ${fact.detailsElements}
- Buttons: ${fact.buttonElements}
- Inputs: ${fact.inputElements}
- Selects: ${fact.selectElements}
- Charts: ${fact.chartSignals.join(", ") || "none detected"}
- Threshold values: ${fact.numericThresholds.join(", ") || "none detected"}
- CPA formulas: ${fact.calculationSignals.cpa}
- ROAS formulas: ${fact.calculationSignals.roas}
- AOV formulas: ${fact.calculationSignals.aov}
- GPT formulas: ${fact.calculationSignals.gpt}
`
  )
  .join("\n")}

## Architecture requirement

Before migrating these screens, the following must be extracted:

1. High-CPA lifetime and active-window qualification
2. GPT calculation and profitability tiers
3. High-ROAS eligibility and scale-protection rules
4. Shared daily and weekly trend output
5. Clipboard and action-only export behavior
6. Any API-backed threshold or view contract

The visual modules may only consume prepared engine output.
`;

fs.writeFileSync(
  path.join(
    absoluteOutputDirectory,
    "STEP_6C_README.md"
  ),
  markdown
);

if (
  unresolvedLocalImports.length
) {
  console.error("");
  console.error(
    "❌ Local imports could not be resolved:"
  );

  for (
    const item of
    unresolvedLocalImports
  ) {
    console.error(
      `- ${item.importer} → ${item.importPath}`
    );
  }

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Step 6C Source Handoff"
);
console.log(
  "============================="
);
console.log(
  `✅ Entry screens: ${entryFiles.length}`
);
console.log(
  `✅ Dependency files collected: ${fileManifest.length}`
);
console.log(
  `✅ API contracts inspected: ${apiSignals.length}`
);
console.log(
  `✅ Latest report: ${latestReportDirectory || "not found"}`
);
console.log(
  "✅ Calculation and threshold signals recorded."
);
console.log(
  "✅ Clipboard, export and fetch behavior recorded."
);
console.log(
  "✅ SHA-256 manifest created."
);
console.log(
  "✅ Dependency graph created."
);
console.log(
  "✅ No unresolved local imports."
);
