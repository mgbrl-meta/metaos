import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const outputDirectory = process.argv[2];

if (!outputDirectory) {
  console.error(
    "Usage: node scripts/metaos-step6b-handoff.mjs <output-directory>"
  );

  process.exit(1);
}

const absoluteOutputDirectory =
  path.resolve(root, outputDirectory);

const entryFiles = [
  "components/meta/MetaExecutiveSummary.tsx",
  "components/meta/PrioritySplitTabs.tsx",
  "components/meta/InfluencerAdsTab.tsx",
];

const protectedFiles = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.ts",

  "config/metaos-remaining-meta-screen-contract.json",
  "config/metaos-module-registry.json",
  "config/metaos-frontend-contract.json",

  "components/metaos-ui/MetaOSModuleRenderer.tsx",

  "lib/metaos-ui/contracts.ts",
  "lib/metaos-ui/moduleRegistry.ts",
  "lib/metaos-ui/moduleQueries.ts",

  "store/metaStore.ts",
  "store/metaOSUiStore.ts",
  "store/metaV2SettingsStore.ts",

  "scripts/metaos-remaining-meta-contract-audit.mjs",
  "scripts/metaos-remaining-meta-report.mjs",
];

const extensions = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
];

function exists(relativePath) {
  return fs.existsSync(
    path.join(root, relativePath)
  );
}

function normalizeRelativePath(value) {
  return value
    .replaceAll("\\", "/")
    .replace(/^\.\//, "");
}

function resolveCandidate(basePath) {
  const normalizedBase =
    normalizeRelativePath(basePath);

  const candidates = [
    normalizedBase,

    ...extensions.map(
      (extension) =>
        `${normalizedBase}${extension}`
    ),

    ...extensions.map(
      (extension) =>
        `${normalizedBase}/index${extension}`
    ),
  ];

  for (const candidate of candidates) {
    if (
      exists(candidate) &&
      fs.statSync(
        path.join(root, candidate)
      ).isFile()
    ) {
      return candidate;
    }
  }

  return "";
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
        normalizeRelativePath(importer)
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
    /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g,
    /require\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;

    let match;

    while (
      (match = pattern.exec(source)) !== null
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

function copyFile(relativePath) {
  const sourcePath =
    path.join(root, relativePath);

  const destinationPath =
    path.join(
      absoluteOutputDirectory,
      "files",
      relativePath
    );

  fs.mkdirSync(
    path.dirname(destinationPath),
    {
      recursive: true,
    }
  );

  fs.copyFileSync(
    sourcePath,
    destinationPath
  );
}

const collectedFiles = new Set();
const dependencyGraph = {};
const unresolvedLocalImports = [];

function collect(relativePath) {
  const normalizedPath =
    normalizeRelativePath(relativePath);

  if (
    !normalizedPath ||
    collectedFiles.has(normalizedPath)
  ) {
    return;
  }

  if (!exists(normalizedPath)) {
    throw new Error(
      `Required source file does not exist: ${normalizedPath}`
    );
  }

  collectedFiles.add(normalizedPath);

  const absolutePath =
    path.join(root, normalizedPath);

  const extension =
    path.extname(normalizedPath);

  if (
    ![
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
    ].includes(extension)
  ) {
    dependencyGraph[normalizedPath] = [];
    return;
  }

  const source =
    fs.readFileSync(
      absolutePath,
      "utf8"
    );

  const imports =
    extractImports(source);

  const localDependencies = [];

  for (const importPath of imports) {
    const looksLocal =
      importPath.startsWith("@/") ||
      importPath.startsWith("./") ||
      importPath.startsWith("../");

    if (!looksLocal) {
      continue;
    }

    const resolved =
      resolveImport(
        normalizedPath,
        importPath
      );

    if (!resolved) {
      unresolvedLocalImports.push({
        importer: normalizedPath,
        importPath,
      });

      continue;
    }

    localDependencies.push(resolved);
    collect(resolved);
  }

  dependencyGraph[normalizedPath] =
    Array.from(
      new Set(localDependencies)
    ).sort();
}

for (const entryFile of entryFiles) {
  collect(entryFile);
}

for (const protectedFile of protectedFiles) {
  if (exists(protectedFile)) {
    collect(protectedFile);
  }
}

const reportRoot =
  path.join(
    root,
    ".metaos-frontend-baselines"
  );

let latestReportDirectory = "";

if (fs.existsSync(reportRoot)) {
  const reportDirectories =
    fs
      .readdirSync(reportRoot, {
        withFileTypes: true,
      })
      .filter(
        (entry) =>
          entry.isDirectory()
      )
      .map((entry) => entry.name)
      .sort()
      .reverse();

  latestReportDirectory =
    reportDirectories.find(
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
      path.join(
        ".metaos-frontend-baselines",
        latestReportDirectory,
        fileName
      );

    if (exists(reportPath)) {
      collectedFiles.add(reportPath);
      dependencyGraph[reportPath] = [];
      reportFiles.push(reportPath);
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
  Array.from(collectedFiles).sort()
) {
  const absolutePath =
    path.join(root, relativePath);

  const buffer =
    fs.readFileSync(absolutePath);

  copyFile(relativePath);

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

const sourceFacts = entryFiles.map(
  (entryFile) => {
    const source =
      fs.readFileSync(
        path.join(root, entryFile),
        "utf8"
      );

    return {
      file: entryFile,

      lines:
        source.split("\n").length,

      stateHooks:
        (
          source.match(
            /\buseState\s*</g
          ) ?? []
        ).length,

      memoHooks:
        (
          source.match(
            /\buseMemo\s*\(/g
          ) ?? []
        ).length,

      effectHooks:
        (
          source.match(
            /\buseEffect\s*\(/g
          ) ?? []
        ).length,

      clipboardSignals:
        (
          source.match(
            /navigator\.clipboard|clipboard\.writeText/g
          ) ?? []
        ).length,

      exportSignals:
        (
          source.match(
            /text\/csv|createObjectURL|\.download\s*=|\.csv["'`]/g
          ) ?? []
        ).length,

      buttonCount:
        (
          source.match(
            /<button\b/g
          ) ?? []
        ).length,

      inputCount:
        (
          source.match(
            /<input\b/g
          ) ?? []
        ).length,

      selectCount:
        (
          source.match(
            /<select\b/g
          ) ?? []
        ).length,

      localFunctions:
        Array.from(
          new Set(
            Array.from(
              source.matchAll(
                /(?:^|\n)(?:export\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g
              ),
              (match) => match[1]
            )
          )
        ).sort(),
    };
  }
);

const manifest = {
  project: "MetaOS",

  createdAt:
    new Date().toISOString(),

  purpose:
    "Exact source and dependency handoff for Step 6B action-layer migration.",

  entryFiles,

  latestGeneratedReport:
    latestReportDirectory || null,

  reportFiles,

  collectedFileCount:
    fileManifest.length,

  unresolvedLocalImports,

  sourceFacts,

  dependencyGraph,

  files:
    fileManifest,
};

fs.writeFileSync(
  path.join(
    absoluteOutputDirectory,
    "STEP_6B_MANIFEST.json"
  ),
  JSON.stringify(
    manifest,
    null,
    2
  ) + "\n"
);

const markdown = `# MetaOS Step 6B Action-Layer Handoff

Created: ${manifest.createdAt}

## Entry screens

${entryFiles
  .map(
    (file) => `- \`${file}\``
  )
  .join("\n")}

## Dependency closure

- Files collected: ${manifest.collectedFileCount}
- Latest report directory: ${
  latestReportDirectory || "not found"
}
- Unresolved local imports: ${
  unresolvedLocalImports.length
}

## Source facts

${sourceFacts
  .map(
    (fact) => `### \`${fact.file}\`

- Lines: ${fact.lines}
- useState hooks: ${fact.stateHooks}
- useMemo hooks: ${fact.memoHooks}
- useEffect hooks: ${fact.effectHooks}
- Clipboard signals: ${fact.clipboardSignals}
- Export signals: ${fact.exportSignals}
- Buttons: ${fact.buttonCount}
- Inputs: ${fact.inputCount}
- Selects: ${fact.selectCount}
- Local functions: ${
      fact.localFunctions.join(", ") ||
      "none detected"
    }
`
  )
  .join("\n")}

## Rule

This handoff is read-only. It contains the exact implementation and dependency contract required to design architecture-owned Summary, Priority and Influencer modules without guessing or modifying the frozen backend.
`;

fs.writeFileSync(
  path.join(
    absoluteOutputDirectory,
    "STEP_6B_README.md"
  ),
  markdown
);

if (unresolvedLocalImports.length) {
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
  "MetaOS Step 6B Source Handoff"
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
  `✅ Latest report: ${
    latestReportDirectory ||
    "not found"
  }`
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
