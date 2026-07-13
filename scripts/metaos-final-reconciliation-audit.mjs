import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const rendererFile =
  "components/metaos-ui/MetaOSModuleRenderer.tsx";

const contractFile =
  "config/metaos-remaining-meta-screen-contract.json";

const reportFile =
  "config/metaos-final-reconciliation-report.json";

const documentationFile =
  "docs/METAOS_FINAL_RECONCILIATION_6E0.md";

function absolute(relativePath) {
  return path.join(
    root,
    relativePath
  );
}

function exists(relativePath) {
  return fs.existsSync(
    absolute(relativePath)
  );
}

function read(relativePath) {
  if (!exists(relativePath)) {
    throw new Error(
      `Missing required file: ${relativePath}`
    );
  }

  return fs.readFileSync(
    absolute(relativePath),
    "utf8"
  );
}

function normalizePath(value) {
  return String(value ?? "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^@\//, "")
    .replace(
      /\.(tsx|ts|jsx|js)$/,
      ""
    );
}

function existingSourcePath(
  sourcePath
) {
  const normalized =
    normalizePath(sourcePath);

  const candidates = [
    normalized,
    `${normalized}.tsx`,
    `${normalized}.ts`,
    `${normalized}.jsx`,
    `${normalized}.js`,
    `${normalized}/index.tsx`,
    `${normalized}/index.ts`,
  ];

  return (
    candidates.find(
      (candidate) =>
        exists(candidate)
    ) ?? ""
  );
}

function classifySource(
  sourcePath
) {
  const normalized =
    normalizePath(sourcePath);

  if (
    normalized.includes(
      "components/metaos-ui/modules/"
    )
  ) {
    return "architecture_owned";
  }

  if (
    normalized.includes(
      "components/meta/"
    ) ||
    normalized.includes(
      "components/dashboard/"
    )
  ) {
    return "legacy";
  }

  if (
    normalized.includes(
      "components/meta-v2/"
    ) ||
    normalized.includes(
      "lib/meta-v2/"
    )
  ) {
    return "engine_owned";
  }

  return "other";
}

function parseImports(source) {
  const imports =
    new Map();

  const pattern =
    /import\s+(?:type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']\s*;?/g;

  let match;

  while (
    (
      match =
        pattern.exec(source)
    ) !== null
  ) {
    const clause =
      match[1]
        .replace(/\s+/g, " ")
        .trim();

    const importPath =
      match[2];

    const identifiers =
      clause.match(
        /\b[A-Z][A-Za-z0-9_$]*\b/g
      ) ?? [];

    for (
      const identifier of
      identifiers
    ) {
      if (
        identifier === "React"
      ) {
        continue;
      }

      imports.set(
        identifier,
        importPath
      );
    }
  }

  return imports;
}

function parseRendererCases(
  source
) {
  const cases =
    new Map();

  const pattern =
    /case\s+["']([^"']+)["']\s*:\s*return\s*\(?\s*<([A-Za-z0-9_$]+)\b/g;

  let match;

  while (
    (
      match =
        pattern.exec(source)
    ) !== null
  ) {
    cases.set(
      match[1],
      match[2]
    );
  }

  return cases;
}

function walkFiles(
  relativeDirectory,
  acceptedExtensions =
    new Set([
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
    ])
) {
  const output = [];

  const directory =
    absolute(
      relativeDirectory
    );

  if (
    !fs.existsSync(
      directory
    )
  ) {
    return output;
  }

  const stack = [
    directory,
  ];

  while (stack.length) {
    const current =
      stack.pop();

    for (
      const entry of
      fs.readdirSync(
        current,
        {
          withFileTypes: true,
        }
      )
    ) {
      const entryPath =
        path.join(
          current,
          entry.name
        );

      if (entry.isDirectory()) {
        stack.push(
          entryPath
        );

        continue;
      }

      if (
        acceptedExtensions.has(
          path.extname(
            entry.name
          )
        )
      ) {
        output.push(
          path
            .relative(
              root,
              entryPath
            )
            .replaceAll(
              "\\",
              "/"
            )
        );
      }
    }
  }

  return output.sort();
}

function scanLegacyImports(
  relativeDirectories
) {
  const matches = [];

  for (
    const relativeDirectory of
    relativeDirectories
  ) {
    for (
      const file of
      walkFiles(
        relativeDirectory
      )
    ) {
      const source =
        fs.readFileSync(
          absolute(file),
          "utf8"
        );

      const importPattern =
        /from\s+["']([^"']+)["']/g;

      let match;

      while (
        (
          match =
            importPattern.exec(
              source
            )
        ) !== null
      ) {
        const importPath =
          match[1];

        if (
          importPath.startsWith(
            "@/components/meta/"
          ) ||
          importPath.startsWith(
            "@/components/dashboard/"
          )
        ) {
          matches.push({
            importer: file,
            importPath,
          });
        }
      }
    }
  }

  return matches;
}

function latestBaseline() {
  const baselineDirectory =
    absolute(
      ".metaos-baselines"
    );

  if (
    !fs.existsSync(
      baselineDirectory
    )
  ) {
    return null;
  }

  const directories =
    fs
      .readdirSync(
        baselineDirectory,
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

  return directories.length
    ? `.metaos-baselines/${directories[0]}`
    : null;
}

const rendererSource =
  read(rendererFile);

const rendererImports =
  parseImports(
    rendererSource
  );

const rendererCases =
  parseRendererCases(
    rendererSource
  );

const contract =
  JSON.parse(
    read(contractFile)
  );

const contractModules =
  Array.isArray(
    contract.modules
  )
    ? contract.modules
    : [];

const duplicateIds =
  contractModules
    .map(
      (module) =>
        module.id
    )
    .filter(
      (
        id,
        index,
        array
      ) =>
        array.indexOf(id) !==
        index
    );

const modules =
  contractModules.map(
    (module) => {
      const moduleId =
        String(
          module.id ?? ""
        );

      const expectedComponent =
        String(
          module.exportName ??
            ""
        );

      const renderedComponent =
        rendererCases.get(
          moduleId
        ) ?? "";

      const rendererImport =
        renderedComponent
          ? rendererImports.get(
              renderedComponent
            ) ?? ""
          : "";

      const contractSource =
        String(
          module.sourceFile ??
            ""
        );

      const resolvedContractSource =
        existingSourcePath(
          contractSource
        );

      const resolvedRendererSource =
        existingSourcePath(
          rendererImport
        );

      const sourcePath =
        resolvedRendererSource ||
        resolvedContractSource ||
        normalizePath(
          rendererImport ||
          contractSource
        );

      const ownership =
        classifySource(
          sourcePath
        );

      const componentMatches =
        Boolean(
          expectedComponent
        ) &&
        expectedComponent ===
          renderedComponent;

      const sourceMatches =
        Boolean(
          resolvedContractSource
        ) &&
        Boolean(
          resolvedRendererSource
        )
          ? normalizePath(
              resolvedContractSource
            ) ===
            normalizePath(
              resolvedRendererSource
            )
          : Boolean(
              resolvedContractSource
            );

      return {
        id:
          moduleId,

        label:
          module.label ??
          module.title ??
          moduleId,

        migrationStatus:
          module.migrationStatus ??
          "unknown",

        expectedComponent,

        renderedComponent,

        contractSource,

        rendererImport,

        resolvedSource:
          sourcePath,

        ownership,

        sourceExists:
          Boolean(
            resolvedContractSource ||
            resolvedRendererSource
          ),

        rendererCaseExists:
          Boolean(
            renderedComponent
          ),

        componentMatches,

        sourceMatches,

        requiredCapabilities:
          Array.isArray(
            module.requiredCapabilities
          )
            ? module.requiredCapabilities
            : [],
      };
    }
  );

const architectureOwned =
  modules.filter(
    (module) =>
      module.ownership ===
      "architecture_owned"
  );

const legacyOwned =
  modules.filter(
    (module) =>
      module.ownership ===
      "legacy"
  );

const engineOwned =
  modules.filter(
    (module) =>
      module.ownership ===
      "engine_owned"
  );

const otherOwned =
  modules.filter(
    (module) =>
      module.ownership ===
      "other"
  );

const missingSources =
  modules.filter(
    (module) =>
      !module.sourceExists
  );

const missingRendererCases =
  modules.filter(
    (module) =>
      !module.rendererCaseExists
  );

const componentMismatches =
  modules.filter(
    (module) =>
      !module.componentMatches
  );

const sourceMismatches =
  modules.filter(
    (module) =>
      !module.sourceMatches
  );

const workspaceLegacyImports =
  scanLegacyImports([
    "components/metaos-ui",
    "app/workspace",
  ]);

const rendererLegacyImports =
  Array.from(
    rendererImports.entries()
  )
    .filter(
      ([
        ,
        importPath,
      ]) =>
        classifySource(
          importPath
        ) === "legacy"
    )
    .map(
      ([
        component,
        importPath,
      ]) => ({
        component,
        importPath,
      })
    );

const moduleFiles =
  walkFiles(
    "components/metaos-ui/modules"
  ).filter(
    (file) =>
      file.endsWith(
        "Module.tsx"
      )
  );

const renderedComponents =
  new Set(
    Array.from(
      rendererCases.values()
    )
  );

const architectureComponentFiles =
  walkFiles(
    "components/metaos-ui"
  );

const sharedModuleCandidates = [];

const unmappedModuleCandidates = [];

for (const file of moduleFiles) {
  const componentName =
    path.basename(
      file,
      ".tsx"
    );

  if (
    renderedComponents.has(
      componentName
    )
  ) {
    continue;
  }

  const moduleImportPath =
    `@/${normalizePath(file)}`;

  const referencedBy =
    architectureComponentFiles
      .filter(
        (candidate) =>
          candidate !== file
      )
      .filter(
        (candidate) => {
          const candidateSource =
            fs.readFileSync(
              absolute(candidate),
              "utf8"
            );

          return (
            candidateSource.includes(
              moduleImportPath
            ) ||
            candidateSource.includes(
              `/${componentName}"`
            ) ||
            candidateSource.includes(
              `/${componentName}'`
            )
          );
        }
      );

  if (referencedBy.length) {
    sharedModuleCandidates.push({
      file,
      referencedBy,
    });
  } else {
    unmappedModuleCandidates.push(
      file
    );
  }
}

const blockingIssues = [
  ...missingSources.map(
    (module) =>
      `Missing source: ${module.id}`
  ),

  ...missingRendererCases.map(
    (module) =>
      `Missing renderer case: ${module.id}`
  ),

  ...componentMismatches.map(
    (module) =>
      `Component mismatch: ${module.id}`
  ),

  ...sourceMismatches.map(
    (module) =>
      `Source mismatch: ${module.id}`
  ),

  ...duplicateIds.map(
    (id) =>
      `Duplicate contract ID: ${id}`
  ),
];

const report = {
  project:
    "MetaOS",

  step:
    "6E0",

  createdAt:
    new Date().toISOString(),

  latestProtectedBaseline:
    latestBaseline(),

  files: {
    renderer:
      rendererFile,

    contract:
      contractFile,

    report:
      reportFile,

    documentation:
      documentationFile,
  },

  summary: {
    contractModules:
      modules.length,

    rendererCases:
      rendererCases.size,

    architectureOwned:
      architectureOwned.length,

    legacyOwned:
      legacyOwned.length,

    engineOwned:
      engineOwned.length,

    otherOwned:
      otherOwned.length,

    missingSources:
      missingSources.length,

    missingRendererCases:
      missingRendererCases.length,

    componentMismatches:
      componentMismatches.length,

    sourceMismatches:
      sourceMismatches.length,

    rendererLegacyImports:
      rendererLegacyImports.length,

    workspaceLegacyImports:
      workspaceLegacyImports.length,

    sharedModuleCandidates:
      sharedModuleCandidates.length,

    unmappedModuleCandidates:
      unmappedModuleCandidates.length,

    blockingIssues:
      blockingIssues.length,
  },

  modules,

  architectureOwned:
    architectureOwned.map(
      (module) =>
        module.id
    ),

  legacyOwned:
    legacyOwned.map(
      (module) => ({
        id:
          module.id,

        source:
          module.resolvedSource,

        component:
          module.renderedComponent,
      })
    ),

  engineOwned:
    engineOwned.map(
      (module) =>
        module.id
    ),

  otherOwned:
    otherOwned.map(
      (module) => ({
        id:
          module.id,

        source:
          module.resolvedSource,
      })
    ),

  missingSources:
    missingSources.map(
      (module) =>
        module.id
    ),

  missingRendererCases:
    missingRendererCases.map(
      (module) =>
        module.id
    ),

  componentMismatches:
    componentMismatches.map(
      (module) => ({
        id:
          module.id,

        expected:
          module.expectedComponent,

        actual:
          module.renderedComponent,
      })
    ),

  sourceMismatches:
    sourceMismatches.map(
      (module) => ({
        id:
          module.id,

        contractSource:
          module.contractSource,

        rendererImport:
          module.rendererImport,
      })
    ),

  rendererLegacyImports,

  workspaceLegacyImports,

  sharedModuleCandidates,

  unmappedModuleCandidates,

  blockingIssues,
};

fs.writeFileSync(
  absolute(reportFile),
  JSON.stringify(
    report,
    null,
    2
  ) + "\n"
);

const moduleRows =
  modules
    .map(
      (module) =>
        `| ${module.id} | ${module.renderedComponent || "Missing"} | ${module.ownership} | ${module.migrationStatus} | ${module.sourceExists ? "Yes" : "No"} |`
    )
    .join("\n");

const legacyRows =
  legacyOwned.length
    ? legacyOwned
        .map(
          (module) =>
            `- \`${module.id}\` → \`${module.resolvedSource}\``
        )
        .join("\n")
    : "- None";

const mismatchRows =
  blockingIssues.length
    ? blockingIssues
        .map(
          (issue) =>
            `- ${issue}`
        )
        .join("\n")
    : "- None";

const workspaceImportRows =
  workspaceLegacyImports.length
    ? workspaceLegacyImports
        .map(
          (item) =>
            `- \`${item.importer}\` → \`${item.importPath}\``
        )
        .join("\n")
    : "- None";

const unmappedRows =
  unmappedModuleCandidates.length
    ? unmappedModuleCandidates
        .map(
          (file) =>
            `- \`${file}\``
        )
        .join("\n")
    : "- None";

const markdown = `# MetaOS Final Reconciliation — Step 6E0

Created: ${report.createdAt}

Protected baseline: ${report.latestProtectedBaseline ?? "Not found"}

## Summary

- Contract modules: ${report.summary.contractModules}
- Renderer cases: ${report.summary.rendererCases}
- Architecture-owned modules: ${report.summary.architectureOwned}
- Legacy-owned modules: ${report.summary.legacyOwned}
- Engine-owned modules: ${report.summary.engineOwned}
- Other ownership: ${report.summary.otherOwned}
- Missing sources: ${report.summary.missingSources}
- Missing renderer cases: ${report.summary.missingRendererCases}
- Component mismatches: ${report.summary.componentMismatches}
- Source mismatches: ${report.summary.sourceMismatches}
- Renderer legacy imports: ${report.summary.rendererLegacyImports}
- Workspace legacy imports: ${report.summary.workspaceLegacyImports}
- Shared internal modules: ${report.summary.sharedModuleCandidates}
- Unmapped module candidates: ${report.summary.unmappedModuleCandidates}
- Blocking reconciliation issues: ${report.summary.blockingIssues}

## Module ownership

| Module ID | Rendered component | Ownership | Migration | Source exists |
|---|---|---|---|---|
${moduleRows}

## Remaining legacy-owned modules

${legacyRows}

## Contract or renderer issues

${mismatchRows}

## Workspace legacy imports

${workspaceImportRows}

## Shared internal architecture modules

${sharedModuleCandidates.length
  ? sharedModuleCandidates
      .map(
        (item) =>
          `- \`${item.file}\` → used by ${item.referencedBy.map(
            (file) => `\`${file}\``
          ).join(", ")}`
      )
      .join("\n")
  : "- None"}

## Unmapped architecture-module candidates

${unmappedRows}

## Step 6E1 decision

- If legacy-owned modules remain, migrate only those modules.
- If no legacy-owned modules remain, remove obsolete renderer imports and freeze the final frontend contract.
- Unmapped module candidates must be inspected before deletion.
- No file may be deleted solely because it appears in this report.
`;

fs.writeFileSync(
  absolute(
    documentationFile
  ),
  markdown
);

console.log("");
console.log(
  "MetaOS Final Reconciliation Audit"
);
console.log(
  "================================="
);
console.log(
  `✅ Contract modules inspected: ${modules.length}`
);
console.log(
  `✅ Renderer cases inspected: ${rendererCases.size}`
);
console.log(
  `✅ Architecture-owned modules: ${architectureOwned.length}`
);
console.log(
  `✅ Legacy-owned modules: ${legacyOwned.length}`
);
console.log(
  `✅ Renderer legacy imports: ${rendererLegacyImports.length}`
);
console.log(
  `✅ Workspace legacy imports: ${workspaceLegacyImports.length}`
);
console.log(
  `✅ Shared internal modules: ${sharedModuleCandidates.length}`
);
console.log(
  `✅ Unmapped module candidates: ${unmappedModuleCandidates.length}`
);
console.log(
  `✅ Reconciliation report: ${reportFile}`
);
console.log(
  `✅ Reconciliation documentation: ${documentationFile}`
);

if (blockingIssues.length) {
  console.error("");
  console.error(
    "❌ Blocking reconciliation issues:"
  );

  for (
    const issue of
    blockingIssues
  ) {
    console.error(
      `- ${issue}`
    );
  }

  process.exit(1);
}

console.log(
  "✅ Contract, renderer, source and component mappings are consistent."
);
console.log(
  "✅ Final Meta reconciliation audit: PASS"
);
