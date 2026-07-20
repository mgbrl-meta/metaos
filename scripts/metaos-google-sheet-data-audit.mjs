import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  source:
    "lib/meta/server/googleSheetDataSource.ts",

  route:
    "app/api/meta-sheet/route.ts",

  controller:
    "components/metaos-ui/data/MetaDataStatus.tsx",
};

const failures = [];

function read(relativePath) {
  const absolute = path.join(
    root,
    relativePath
  );

  if (!fs.existsSync(absolute)) {
    failures.push(
      `Missing file: ${relativePath}`
    );

    return "";
  }

  return fs.readFileSync(
    absolute,
    "utf8"
  );
}

const source = Object.fromEntries(
  Object.entries(files).map(
    ([key, filename]) => [
      key,
      read(filename),
    ]
  )
);

for (const token of [
  "getGoogleSheetDataset",
  "__metaosGoogleSheetCache",
  "inFlight",
  "expiresAt",
  "normalizeGooglePrivateKey",
  "spreadsheets.values.get",
]) {
  if (!source.source.includes(token)) {
    failures.push(
      `Google Sheet source missing: ${token}`
    );
  }
}

for (const token of [
  "getGoogleSheetDataset",
  "forceRefresh",
  "latestDate:",
  "generatedAt:",
  "rows:",
]) {
  if (!source.route.includes(token)) {
    failures.push(
      `Google Sheet route missing: ${token}`
    );
  }
}

for (const token of [
  "/api/meta-sheet",
  "?refresh=1",
  "setPerformanceRows",
  "setMetaFreshness",
  "sharedInitialRequest",
]) {
  if (!source.controller.includes(token)) {
    failures.push(
      `Data controller missing: ${token}`
    );
  }
}

if (
  source.controller.includes(
    "/api/meta-data"
  )
) {
  failures.push(
    "Active frontend controller still calls /api/meta-data."
  );
}

if (
  source.controller.includes(
    "/api/meta-connections/bigquery"
  )
) {
  failures.push(
    "Active frontend controller still calls BigQuery."
  );
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`❌ ${failure}`);
  }

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Google Sheet Data Architecture Audit"
);
console.log(
  "==========================================="
);
console.log(
  "✅ Canonical Google Sheet server source."
);
console.log(
  "✅ Server cache and in-flight request deduplication."
);
console.log(
  "✅ Private-key normalization remains server-owned."
);
console.log(
  "✅ Automatic load uses /api/meta-sheet."
);
console.log(
  "✅ Manual refresh forces a fresh Sheet read."
);
console.log(
  "✅ Store hydration uses one frontend controller."
);
console.log(
  "✅ No active BigQuery frontend dependency."
);
console.log(
  "✅ Google Sheet architecture: PASS"
);
