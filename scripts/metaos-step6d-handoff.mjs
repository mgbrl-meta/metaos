import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputDirectory = process.argv[2];

if (!outputDirectory) {
  console.error(
    "Usage: node scripts/metaos-step6d-handoff.mjs <output-directory>"
  );

  process.exit(1);
}

const absoluteOutputDirectory =
  path.resolve(root, outputDirectory);

const contractFile =
  "config/metaos-remaining-meta-screen-contract.json";

if (!fs.existsSync(path.join(root, contractFile))) {
  throw new Error(
    `Missing frozen screen contract: ${contractFile}`
  );
}

const contract = JSON.parse(
  fs.readFileSync(
    path.join(root, contractFile),
    "utf8"
  )
);

const modules = Array.isArray(contract.modules)
  ? contract.modules
  : [];

const targetDefinitions = [
  {
    key: "spend",
    label: "Spend Analysis",
    idCandidates: [
      "spend_analysis",
      "spend",
      "spend_analyzer",
      "spend_control",
    ],
    searchTerms: [
      "spend analysis",
      "spend",
    ],
  },
  {
    key: "creative",
    label: "Creative Analysis",
    idCandidates: [
      "creative_analysis",
      "creative",
      "creative_intelligence",
      "creative_performance",
    ],
    searchTerms: [
      "creative analysis",
      "creative intelligence",
      "creative",
    ],
  },
  {
    key: "ageing",
    label: "Creative Ageing",
    idCandidates: [
      "creative_ageing",
      "creative_aging",
      "ageing",
      "aging",
      "creative_age",
    ],
    searchTerms: [
      "creative ageing",
      "creative aging",
      "ageing",
      "aging",
    ],
  },
  {
    key: "monthly",
    label: "Monthly Summary",
    idCandidates: [
      "monthly_summary",
      "monthly",
      "month_summary",
      "monthly_analysis",
    ],
    searchTerms: [
      "monthly summary",
      "monthly analysis",
      "monthly",
    ],
  },
];

function moduleSearchText(module) {
  return [
    module.id,
    module.label,
    module.title,
    module.name,
    module.sourceFile,
    module.exportName,
    module.rendererToken,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function findTargetModule(definition) {
  for (const id of definition.idCandidates) {
    const exact = modules.find(
      (module) => module.id === id
    );

    if (exact) {
      return exact;
    }
  }

  const matches = modules.filter((module) => {
    const haystack =
      moduleSearchText(module);

    return definition.searchTerms.some(
      (term) =>
        haystack.includes(
          term.toLowerCase()
        )
    );
  });

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    const sourceMatch = matches.find(
      (module) =>
        definition.searchTerms.some(
          (term) =>
            String(
              module.sourceFile ?? ""
            )
              .toLowerCase()
              .includes(
                term
                  .toLowerCase()
                  .replaceAll(" ", "")
              )
        )
    );

    if (sourceMatch) {
      return sourceMatch;
    }

    return matches[0];
  }

  return null;
}

const selectedModules =
  targetDefinitions.map(
    (definition) => ({
      definition,
      module:
        findTargetModule(
          definition
        ),
    })
  );

const missingTargets =
  selectedModules.filter(
    (item) => !item.module
  );

if (missingTargets.length) {
  console.error("");
  console.error(
    "❌ Could not resolve all Step 6D modules from the frozen contract."
  );

  for (const item of missingTargets) {
    console.error(
      `- ${item.definition.label}`
    );
  }

  console.error("");
  console.error(
    "Available contract modules:"
  );

  for (const module of modules) {
    console.error(
      `- ${module.id} → ${module.sourceFile ?? "no source"}`
    );
  }

  process.exit(1);
}

const entryFiles =
  selectedModules.map(
    (item) =>
      item.module.sourceFile
  );

const protectedCandidates = [
  "components/metaos-ui/MetaOSModuleRenderer.tsx",

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
  "lib/meta-v2/economicControlUtils.ts",

  "store/metaStore.ts",
  "store/metaV2SettingsStore.ts",
  "store/metaOSUiStore.ts",

  "styles/metaos-ui/index.css",
  "styles/metaos-ui/tokens.css",
  "styles/metaos-ui/primitives.css",
  "styles/metaos-ui/table.css",
  "styles/metaos-ui/action-screens.css",
  "styles/metaos-ui/economic-screens.css",

  "scripts/metaos-remaining-meta-contract-audit.mjs",
  "scripts/metaos-economic-control-engine-audit.mjs",
  "scripts/metaos-economic-screen-migration-audit.mjs",
  "scripts/metaos-module-registry-audit.mjs",
  "scripts/metaos-qc.mjs",
  "scripts/metaos-baseline.mjs",

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
  return String(value ?? "")
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

  const patterns = [
    /(?:^|\n)[ \t]*import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"'\n]+)["'][ \t]*;?/g,

    /(?:^|\n)[ \t]*export\s+(?:type\s+)?(?:\*|\{[\s\S]*?\})\s+from\s+["']([^"'\n]+)["'][ \t]*;?/g,

    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,

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
const unresolvedLocalImports = [];

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

  const localDependencies = [];

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

let latestReportDirectory = "";

if (
  fs.existsSync(reportRoot)
) {
  latestReportDirectory =
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
      .reverse()
      .find(
        (directory) =>
          fs.existsSync(
            path.join(
              reportRoot,
              directory,
              "remaining-meta-screen-report.json"
            )
          ) ||
          fs.existsSync(
            path.join(
              reportRoot,
              directory,
              "remaining-meta-screen-report.md"
            )
          )
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
  selectedModules.map(
    ({
      definition,
      module,
    }) => {
      const entryFile =
        module.sourceFile;

      const source =
        fs.readFileSync(
          absolute(entryFile),
          "utf8"
        );

      return {
        key:
          definition.key,

        label:
          definition.label,

        moduleId:
          module.id,

        file:
          entryFile,

        exportName:
          module.exportName ??
          null,

        rendererToken:
          module.rendererToken ??
          null,

        migrationStatus:
          module.migrationStatus ??
          null,

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

        excelSignals:
          count(
            source,
            /exceljs|xlsx|application\/vnd\.ms-excel|\.xlsx|\.xls/g
          ),

        downloadSignals:
          count(
            source,
            /\.download\s*=|createElement\(["']a["']\)/g
          ),

        fetchTargets:
          uniqueMatches(
            source,
            /fetch\s*\(\s*["'`]([^"'`]+)["'`]/g
          ),

        localStorageSignals:
          count(
            source,
            /localStorage\./g
          ),

        chartSignals:
          uniqueMatches(
            source,
            /<(LineChart|BarChart|ScatterChart|AreaChart|ComposedChart|ResponsiveContainer)\b/g
          ),

        tableSignals:
          count(
            source,
            /<table\b|DataTable|TablePagination|TableToolbar/g
          ),

        detailsSignals:
          count(
            source,
            /<details\b|renderExpandedRow|expandedRowIds/g
          ),

        dateSignals:
          uniqueMatches(
            source,
            /\b(last7|last14|last30|yesterday|month|monthly|age|ageing|aging|daysLive|firstSeen|latestDate)\b/gi
          ),

        thresholdValues:
          Array.from(
            new Set(
              Array.from(
                source.matchAll(
                  /\b(?:threshold|minSpend|maxSpend|minRoas|maxRoas|minAge|maxAge|ageDays|daysLive)\b[\s\S]{0,50}?(\d+(?:\.\d+)?)/gi
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
              /spend\s*\/\s*purchases/gi
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

          cpm:
            count(
              source,
              /spend\s*\*\s*1000\s*\/\s*impressions/gi
            ),

          frequency:
            count(
              source,
              /impressions\s*\/\s*reach/gi
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
  });
}

const manifest = {
  project: "MetaOS",

  createdAt:
    new Date().toISOString(),

  purpose:
    "Exact source and dependency handoff for Spend Analysis, Creative Analysis, Creative Ageing, and Monthly Summary.",

  selectedModules:
    selectedModules.map(
      ({
        definition,
        module,
      }) => ({
        key:
          definition.key,
        label:
          definition.label,
        id:
          module.id,
        sourceFile:
          module.sourceFile,
        exportName:
          module.exportName ??
          null,
        rendererToken:
          module.rendererToken ??
          null,
        migrationStatus:
          module.migrationStatus ??
          null,
      })
    ),

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

  files:
    fileManifest,
};

fs.writeFileSync(
  path.join(
    absoluteOutputDirectory,
    "STEP_6D_MANIFEST.json"
  ),
  JSON.stringify(
    manifest,
    null,
    2
  ) + "\n"
);

const markdown = `# MetaOS Step 6D Analysis-Layer Handoff

Created: ${manifest.createdAt}

## Resolved modules

${manifest.selectedModules
  .map(
    (module) =>
      `- **${module.label}**: \`${module.id}\` → \`${module.sourceFile}\``
  )
  .join("\n")}

## Dependency closure

- Files collected: ${manifest.collectedFileCount}
- API contracts inspected: ${manifest.apiSignals.length}
- Latest migration report: ${latestReportDirectory || "not found"}
- Unresolved local imports: ${unresolvedLocalImports.length}

## Screen facts

${sourceFacts
  .map(
    (fact) => `### ${fact.label}

- Module ID: \`${fact.moduleId}\`
- Source: \`${fact.file}\`
- Lines: ${fact.lines}
- State hooks: ${fact.stateHooks}
- Memo hooks: ${fact.memoHooks}
- Effect hooks: ${fact.effectHooks}
- Clipboard signals: ${fact.clipboardSignals}
- CSV signals: ${fact.csvSignals}
- Excel signals: ${fact.excelSignals}
- Download signals: ${fact.downloadSignals}
- Fetch targets: ${fact.fetchTargets.join(", ") || "none detected"}
- Local-storage signals: ${fact.localStorageSignals}
- Charts: ${fact.chartSignals.join(", ") || "none detected"}
- Table signals: ${fact.tableSignals}
- Expansion signals: ${fact.detailsSignals}
- Date/age signals: ${fact.dateSignals.join(", ") || "none detected"}
- Threshold values: ${fact.thresholdValues.join(", ") || "none detected"}
- CPA formulas: ${fact.calculationSignals.cpa}
- ROAS formulas: ${fact.calculationSignals.roas}
- AOV formulas: ${fact.calculationSignals.aov}
- CPM formulas: ${fact.calculationSignals.cpm}
- Frequency formulas: ${fact.calculationSignals.frequency}
`
  )
  .join("\n")}

## Required next architecture step

Before replacing the visible modules, extract:

1. Spend distribution and concentration logic
2. Creative-level aggregation and qualification
3. First-seen / latest-seen / days-live ageing logic
4. Monthly grouping and month-over-month comparison
5. Shared filters, date windows, trends, exports and campaign rollups
6. Any API-backed view or threshold contract

The frontend modules may only consume prepared engine output.
`;

fs.writeFileSync(
  path.join(
    absoluteOutputDirectory,
    "STEP_6D_README.md"
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
  "MetaOS Step 6D Source Handoff"
);
console.log(
  "============================="
);

for (
  const module of
  manifest.selectedModules
) {
  console.log(
    `✅ ${module.label}: ${module.id} → ${module.sourceFile}`
  );
}

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
  "✅ Calculation, threshold, chart, table and export signals recorded."
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
