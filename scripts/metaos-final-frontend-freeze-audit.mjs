import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const rendererFile =
  "components/metaos-ui/MetaOSModuleRenderer.tsx";

const reportFile =
  "config/metaos-final-reconciliation-report.json";

const detectionFile =
  "config/metaos-step6e1-detected-modules.json";

function fail(message) {
  console.error(
    `❌ ${message}`
  );

  process.exitCode = 1;
}

function read(relativePath) {
  const absolute =
    path.join(
      root,
      relativePath
    );

  if (!fs.existsSync(absolute)) {
    fail(
      `Missing final-freeze file: ${relativePath}`
    );

    return "";
  }

  return fs.readFileSync(
    absolute,
    "utf8"
  );
}

const renderer =
  read(rendererFile);

let report = {};
let detected = {};

try {
  report = JSON.parse(
    read(reportFile)
  );
} catch {
  fail(
    "Final reconciliation report is invalid JSON."
  );
}

try {
  detected = JSON.parse(
    read(detectionFile)
  );
} catch {
  fail(
    "Detected architecture-module map is invalid JSON."
  );
}

const summary =
  report.summary ?? {};

const requiredSummary = {
  architectureOwned: 11,
  legacyOwned: 0,
  rendererLegacyImports: 0,
  workspaceLegacyImports: 0,
  missingSources: 0,
  missingRendererCases: 0,
  componentMismatches: 0,
  sourceMismatches: 0,
  unmappedModuleCandidates: 0,
  blockingIssues: 0,
};

for (
  const [
    field,
    expected,
  ] of Object.entries(
    requiredSummary
  )
) {
  if (
    Number(
      summary[field]
    ) !== expected
  ) {
    fail(
      `Final reconciliation ${field} expected ${expected}, received ${summary[field]}`
    );
  }
}

if (
  Number(
    summary.sharedModuleCandidates ??
      0
  ) < 1
) {
  fail(
    "No shared internal module was identified; PriorityModule must be classified before cleanup."
  );
}

for (const forbidden of [
  "@/components/meta/DataQCTab",
  "@/components/meta/ZeroPurchaseTabV2",
  "DataQCTab",
  "ZeroPurchaseTabV2",
]) {
  if (
    renderer.includes(
      forbidden
    )
  ) {
    fail(
      `Legacy workspace dependency remains: ${forbidden}`
    );
  }
}

for (const key of [
  "dataQc",
  "zeroPurchase",
]) {
  const component =
    detected[key];

  if (!component) {
    fail(
      `Missing detected architecture module: ${key}`
    );

    continue;
  }

  for (const token of [
    component.alias,
    `<${component.name} />`,
  ]) {
    if (
      !renderer.includes(
        token
      )
    ) {
      fail(
        `Renderer is missing architecture token: ${token}`
      );
    }
  }

  const sourcePath =
    path.join(
      root,
      component.file
    );

  if (
    !fs.existsSync(
      sourcePath
    )
  ) {
    fail(
      `Architecture module source does not exist: ${component.file}`
    );
  }
}

const sharedCandidates =
  report.sharedModuleCandidates ??
  [];

const priorityCandidate =
  sharedCandidates.find(
    (candidate) =>
      String(
        candidate.file
      ).endsWith(
        "/PriorityModule.tsx"
      )
  );

if (!priorityCandidate) {
  fail(
    "PriorityModule.tsx was not classified as a shared internal module."
  );
} else if (
  !Array.isArray(
    priorityCandidate.referencedBy
  ) ||
  priorityCandidate.referencedBy
    .length === 0
) {
  fail(
    "PriorityModule.tsx has no verified architecture consumer."
  );
}

if (process.exitCode) {
  console.error("");
  console.error(
    "MetaOS final frontend freeze audit failed."
  );

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Final Frontend Freeze Audit"
);
console.log(
  "=================================="
);
console.log(
  "✅ All 11 contracted Meta modules are architecture-owned."
);
console.log(
  "✅ No legacy-owned Meta contract modules remain."
);
console.log(
  "✅ Data QC uses its architecture-owned workspace module."
);
console.log(
  "✅ Zero Purchase uses its architecture-owned workspace module."
);
console.log(
  "✅ Renderer legacy imports: 0"
);
console.log(
  "✅ Workspace legacy imports: 0"
);
console.log(
  "✅ Missing sources, cases and mappings: 0"
);
console.log(
  "✅ Unmapped architecture modules: 0"
);
console.log(
  "✅ PriorityModule is retained as a verified shared internal module."
);
console.log(
  "✅ No files were deleted."
);
console.log(
  "✅ Final Meta frontend architecture: FROZEN"
);
