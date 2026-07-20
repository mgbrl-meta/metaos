import fs from "node:fs";

const requiredFiles = [
  "lib/meta-sheet/client.ts",
  "components/metaos-ui/data/MetaDataStatus.tsx",
  "store/metaStore.ts",
];

const failures = [];

function read(file) {
  if (!fs.existsSync(file)) {
    failures.push(`Missing file: ${file}`);
    return "";
  }

  return fs.readFileSync(file, "utf8");
}

function compact(source) {
  return source.replace(/\s+/g, "");
}

function requireToken(
  source,
  token,
  owner
) {
  if (!source.includes(token)) {
    failures.push(
      `${owner} contract missing: ${token}`
    );
  }
}

function requireCompactToken(
  source,
  token,
  owner
) {
  if (
    !compact(source).includes(
      compact(token)
    )
  ) {
    failures.push(
      `${owner} contract missing: ${token}`
    );
  }
}

const client = read(
  "lib/meta-sheet/client.ts"
);

const controller = read(
  "components/metaos-ui/data/MetaDataStatus.tsx"
);

const store = read(
  "store/metaStore.ts"
);

for (const token of [
  "loadMetaSheetData",
  "/api/meta-sheet",
  "initialRequest",
  "requestMetaSheet",
]) {
  requireToken(
    client,
    token,
    "Client"
  );
}

for (const token of [
  "loadMetaSheetData",
  "hydrateMetaDataset",
  "forceRefresh",
  "response.dataset.rows",
  "response.dataset.latestDate",
  "response.dataset.fetchedAt",
  "response.dataset.rowCount",
]) {
  requireCompactToken(
    controller,
    token,
    "Controller"
  );
}

for (const token of [
  "fetchFreshMetaRowsForStore",
  "loadMetaSheetData",
  "hydrateMetaDataset",
  "metaLatestDate",
  "metaFetchedAt",
  "metaRowCount",
]) {
  requireToken(
    store,
    token,
    "Store"
  );
}

const combined =
  `${client}\n${controller}\n${store}`;

for (const obsolete of [
  "/api/meta-data",
  "Meta BigQuery fetch failed",
  "source=raw",
]) {
  if (
    combined.includes(obsolete)
  ) {
    failures.push(
      `Obsolete active data path remains: ${obsolete}`
    );
  }
}

if (
  !compact(client).includes(
    compact(
      'searchParams.set("refresh","1")'
    )
  )
) {
  failures.push(
    "Client force-refresh contract is missing."
  );
}

if (
  !compact(controller).includes(
    compact(
      "void loadData(true)"
    )
  )
) {
  failures.push(
    "Manual refresh does not use the canonical controller."
  );
}

if (
  !compact(controller).includes(
    compact(
      "void loadData(false)"
    )
  )
) {
  failures.push(
    "Initial load does not use the canonical controller."
  );
}

if (failures.length > 0) {
  console.error("");
  console.error(
    "MetaOS Sheet Frontend Architecture Audit"
  );
  console.error(
    "========================================"
  );

  for (const failure of failures) {
    console.error(`❌ ${failure}`);
  }

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Sheet Frontend Architecture Audit"
);
console.log(
  "========================================"
);
console.log(
  "✅ Dedicated browser API client"
);
console.log(
  "✅ One shared initial request"
);
console.log(
  "✅ Canonical Sheet endpoint"
);
console.log(
  "✅ One store hydration action"
);
console.log(
  "✅ Initial load uses canonical controller"
);
console.log(
  "✅ Manual refresh uses canonical controller"
);
console.log(
  "✅ Dataset freshness metadata retained"
);
console.log(
  "✅ BigQuery frontend path removed"
);
console.log(
  "✅ Frontend architecture: PASS"
);
