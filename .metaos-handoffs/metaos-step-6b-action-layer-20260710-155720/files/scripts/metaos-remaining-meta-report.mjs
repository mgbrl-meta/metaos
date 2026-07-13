import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const contract = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "config/metaos-remaining-meta-screen-contract.json"
    ),
    "utf8"
  )
);

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const outputDir = path.join(
  root,
  ".metaos-frontend-baselines",
  timestamp
);

fs.mkdirSync(
  outputDir,
  {
    recursive: true,
  }
);

function read(relativePath) {
  return fs.readFileSync(
    path.join(
      root,
      relativePath
    ),
    "utf8"
  );
}

function count(
  source,
  pattern
) {
  return (
    source.match(pattern) ?? []
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
        source.matchAll(pattern),
        (match) =>
          match[group]
      ).filter(Boolean)
    )
  ).sort();
}

const formulaRules = [
  {
    id: "roas",
    pattern:
      /(?:revenue|purchaseValue|value)\s*\/\s*spend|spend\s*>\s*0\s*\?\s*(?:revenue|purchaseValue|value)\s*\/\s*spend/gi,
  },
  {
    id: "cpa",
    pattern:
      /spend\s*\/\s*purchases|purchases\s*>\s*0\s*\?\s*spend\s*\/\s*purchases/gi,
  },
  {
    id: "aov",
    pattern:
      /(?:revenue|purchaseValue|value)\s*\/\s*purchases/gi,
  },
  {
    id: "gpt",
    pattern:
      /\baov\s*-\s*cpa\b/gi,
  },
  {
    id: "cpm",
    pattern:
      /spend\s*\*\s*1000\s*\/\s*impressions/gi,
  },
  {
    id: "ctr",
    pattern:
      /clicks\s*\/\s*impressions\s*\*\s*100/gi,
  },
  {
    id: "frequency",
    pattern:
      /impressions\s*\/\s*reach/gi,
  },
];

const dateHelperPatterns = [
  "addDays",
  "addDaysToDateKey",
  "summarizeCalendarWindow",
  "metaOsLast7DateKey",
  "toUtcDateKeyFromParts",
  "latestDate",
  "last7",
];

const interactionPatterns = {
  clipboard:
    /navigator\.clipboard|clipboard\.writeText/g,

  csvExport:
    /text\/csv|createObjectURL|\.csv["'`]/g,

  fileDownload:
    /document\.createElement\(["']a["']\)|\.download\s*=/g,

  localStorage:
    /localStorage\./g,

  useState:
    /\buseState\s*</g,

  useMemo:
    /\buseMemo\s*\(/g,

  useEffect:
    /\buseEffect\s*\(/g,

  buttons:
    /<button\b/g,

  inputs:
    /<input\b/g,

  selects:
    /<select\b/g,
};

const sourceReports = [];

for (
  const sourceFile of
  Array.from(
    new Set(
      contract.modules.map(
        (module) =>
          module.sourceFile
      )
    )
  )
) {
  const source =
    read(sourceFile);

  const modules =
    contract.modules
      .filter(
        (module) =>
          module.sourceFile ===
          sourceFile
      )
      .map(
        (module) => ({
          id: module.id,
          label: module.label,
          migrationGroup:
            module.migrationGroup,
        })
      );

  const formulas =
    formulaRules
      .map(
        (rule) => ({
          id: rule.id,
          occurrences:
            count(
              source,
              rule.pattern
            ),
        })
      )
      .filter(
        (item) =>
          item.occurrences > 0
      );

  const dateHelpers =
    dateHelperPatterns
      .filter(
        (token) =>
          source.includes(token)
      );

  const storeImports =
    uniqueMatches(
      source,
      /from\s+["'](@\/store\/[^"']+)["']/g
    );

  const libImports =
    uniqueMatches(
      source,
      /from\s+["'](@\/lib\/[^"']+)["']/g
    );

  const componentImports =
    uniqueMatches(
      source,
      /from\s+["'](@\/components\/[^"']+)["']/g
    );

  const exportedNames =
    uniqueMatches(
      source,
      /export\s+(?:function|const|class)\s+([A-Za-z0-9_]+)/g
    );

  const interactions =
    Object.fromEntries(
      Object.entries(
        interactionPatterns
      ).map(
        ([key, pattern]) => [
          key,
          count(
            source,
            pattern
          ),
        ]
      )
    );

  const localFunctionNames =
    uniqueMatches(
      source,
      /(?:^|\n)(?:export\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g
    );

  sourceReports.push({
    sourceFile,
    modules,
    lines:
      source.split("\n").length,
    exportedNames,
    storeImports,
    libImports,
    componentImports,
    formulas,
    dateHelpers,
    interactions,
    localFunctionNames,
    requiresEngineExtraction:
      formulas.length > 0 ||
      dateHelpers.length >= 3,
  });
}

const totals = {
  modules:
    contract.modules.length,

  sourceFiles:
    sourceReports.length,

  sourceLines:
    sourceReports.reduce(
      (sum, report) =>
        sum + report.lines,
      0
    ),

  formulaOccurrences:
    sourceReports.reduce(
      (sum, report) =>
        sum +
        report.formulas.reduce(
          (
            formulaSum,
            formula
          ) =>
            formulaSum +
            formula.occurrences,
          0
        ),
      0
    ),

  clipboardOccurrences:
    sourceReports.reduce(
      (sum, report) =>
        sum +
        report.interactions
          .clipboard,
      0
    ),

  exportOccurrences:
    sourceReports.reduce(
      (sum, report) =>
        sum +
        report.interactions
          .csvExport +
        report.interactions
          .fileDownload,
      0
    ),

  filesRequiringEngineExtraction:
    sourceReports.filter(
      (report) =>
        report.requiresEngineExtraction
    ).length,
};

const report = {
  project: "MetaOS",
  createdAt:
    new Date().toISOString(),

  scope:
    "Remaining Meta frontend screens",

  totals,
  sourceReports,

  migrationSequence: [
    {
      group: "6B",
      modules: [
        "summary",
        "top_descaling",
        "top_scaling",
        "influencer_ads",
      ],
      objective:
        "Create action and executive-summary engines/adapters before presentation migration.",
    },
    {
      group: "6C",
      modules: [
        "high_cpa",
        "gpt",
        "high_roas",
      ],
      objective:
        "Centralize threshold, window and economic qualification logic before replacing screens.",
    },
    {
      group: "6D",
      modules: [
        "spend_visuals",
        "creative",
        "creative_ageing",
        "monthly",
      ],
      objective:
        "Build shared reporting and creative intelligence outputs before visualization migration.",
    },
  ],
};

fs.writeFileSync(
  path.join(
    outputDir,
    "remaining-meta-screen-report.json"
  ),
  JSON.stringify(
    report,
    null,
    2
  )
);

const markdown = `# MetaOS Remaining Meta Screen Migration Report

Created: ${report.createdAt}

## Frozen scope

- Modules: ${totals.modules}
- Source files: ${totals.sourceFiles}
- Source lines inspected: ${totals.sourceLines}
- Local formula occurrences detected: ${totals.formulaOccurrences}
- Clipboard interactions detected: ${totals.clipboardOccurrences}
- Export/download interactions detected: ${totals.exportOccurrences}
- Files requiring engine extraction: ${totals.filesRequiringEngineExtraction}

## Source files

${sourceReports
  .map((item) => {
    const moduleNames = item.modules
      .map(
        (module) =>
          `\`${module.id}\``
      )
      .join(", ");

    const formulas = item.formulas.length
      ? item.formulas
          .map(
            (formula) =>
              `${formula.id}:${formula.occurrences}`
          )
          .join(", ")
      : "none detected";

    const dateHelpers =
      item.dateHelpers.length
        ? item.dateHelpers.join(", ")
        : "none detected";

    return `### \`${item.sourceFile}\`

- Modules: ${moduleNames}
- Lines: ${item.lines}
- Local formulas: ${formulas}
- Date/window helpers: ${dateHelpers}
- Store imports: ${item.storeImports.join(", ") || "none"}
- Clipboard calls: ${item.interactions.clipboard}
- Export/download signals: ${item.interactions.csvExport + item.interactions.fileDownload}
- Engine extraction required: ${item.requiresEngineExtraction ? "YES" : "NO"}
`;
  })
  .join("\n")}

## Controlled migration sequence

### Step 6B

Summary, Top De-scaling, Top Scaling and Influencer Ads.

### Step 6C

High CPA, GPT and High ROAS.

### Step 6D

Spend, Creative, Creative Ageing and Monthly.

## Non-negotiable rule

A remaining legacy screen cannot be visually rewritten until its local formulas, window logic and action qualification have either been moved into an architecture-owned engine or explicitly proven to consume an existing protected output.
`;

fs.writeFileSync(
  path.join(
    outputDir,
    "remaining-meta-screen-report.md"
  ),
  markdown
);

console.log("");
console.log(
  "MetaOS Remaining Meta Screen Report"
);
console.log(
  "==================================="
);
console.log(
  `✅ Modules inspected: ${totals.modules}`
);
console.log(
  `✅ Source files inspected: ${totals.sourceFiles}`
);
console.log(
  `✅ Source lines inspected: ${totals.sourceLines}`
);
console.log(
  `✅ Local formula occurrences recorded: ${totals.formulaOccurrences}`
);
console.log(
  `✅ Clipboard interactions recorded: ${totals.clipboardOccurrences}`
);
console.log(
  `✅ Export/download interactions recorded: ${totals.exportOccurrences}`
);
console.log(
  `✅ Files requiring engine extraction: ${totals.filesRequiringEngineExtraction}`
);
console.log(
  `✅ Report created: ${path.relative(
    root,
    outputDir
  )}`
);
