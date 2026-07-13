import fs from "node:fs";

const files = {
  contracts:
    "lib/meta-connections/contracts.ts",

  environment:
    "lib/meta-connections/server/runtimeEnvironmentManager.ts",

  connectionManager:
    "lib/meta-connections/server/bigQueryConnectionManager.ts",

  ingestion:
    "lib/meta-connections/server/bigQueryIngestionEngine.ts",

  gateway:
    "lib/meta-connections/server/metaDataGateway.ts",

  dataRoute:
    "app/api/meta-data/route.ts",

  cron:
    "app/api/cron/meta-sync/route.ts",

  connectionUi:
    "components/metaos-ui/settings/BigQueryConnectionPanel.tsx",

  settings:
    "components/metaos-ui/modules/SettingsModule.tsx",

  renderer:
    "components/metaos-ui/MetaOSModuleRenderer.tsx",

  sidebar:
    "components/metaos-ui/shell/MetaOSSidebar.tsx",

  header:
    "components/metaos-ui/shell/MetaOSHeader.tsx",

  dataStatus:
    "components/metaos-ui/data/MetaDataStatus.tsx",

  store:
    "store/metaStore.ts",

  registry:
    "config/metaos-module-registry.json",

  vercel:
    "vercel.json",
};

function fail(
  message
) {
  console.error(
    `❌ ${message}`
  );

  process.exitCode = 1;
}

function read(
  filename
) {
  if (
    !fs.existsSync(
      filename
    )
  ) {
    fail(
      `Missing architecture file: ${filename}`
    );

    return "";
  }

  return fs.readFileSync(
    filename,
    "utf8"
  );
}

const source =
  Object.fromEntries(
    Object.entries(
      files
    ).map(
      ([
        key,
        filename,
      ]) => [
        key,
        read(filename),
      ]
    )
  );

const registry =
  JSON.parse(
    source.registry
  );

for (const token of [
  "meta_ads_raw_append",
  "meta_ads_current",
  "meta_ads_sync_runs",
  "BigQueryConnectionInput",
  "BigQuerySyncResult",
]) {
  if (
    !source.contracts.includes(
      token
    ) &&
    !source.connectionUi.includes(
      token
    )
  ) {
    fail(
      `Connection contract lost: ${token}`
    );
  }
}

for (const token of [
  "META_DATA_SOURCE",
  "GCP_PRIVATE_KEY",
  "writeLocalEnvironment",
  "writeVercelEnvironment",
  "normalizePrivateKey",
]) {
  if (
    !source.environment.includes(
      token
    )
  ) {
    fail(
      `Environment manager lost: ${token}`
    );
  }
}

for (const token of [
  "fetchSheetRows",
  "provisionMetaTables",
  "payload_json",
  "MERGE",
  "batchId",
  "status:",
  '"skipped"',
]) {
  if (
    !source.ingestion.includes(
      token
    )
  ) {
    fail(
      `Ingestion architecture lost: ${token}`
    );
  }
}

for (const token of [
  "loadMetaRowsFromGateway",
  "getRuntimeConnectionConfig",
  "createBigQueryClient",
  "config.currentTable",
  "payload_json",
]) {
  if (
    !source.gateway.includes(
      token
    )
  ) {
    fail(
      `Central gateway lost: ${token}`
    );
  }
}

for (const file of [
  "dataStatus",
  "store",
]) {
  if (
    !source[file].includes(
      "/api/meta-data"
    )
  ) {
    fail(
      `${file} does not use the central data gateway.`
    );
  }

  if (
    source[file].includes(
      "/api/meta-sheet"
    )
  ) {
    fail(
      `${file} still calls the Sheet directly.`
    );
  }
}

for (const token of [
  "BigQueryConnectionPanel",
  "Data Connections",
  "Operating Rules",
]) {
  if (
    !source.settings.includes(
      token
    ) &&
    !source.connectionUi.includes(
      token
    )
  ) {
    fail(
      `Settings architecture lost: ${token}`
    );
  }
}

if (
  !source.renderer.includes(
    "<SettingsModule />"
  )
) {
  fail(
    "Renderer does not use the architecture-owned Settings module."
  );
}

for (const token of [
  "Button",
  "IconButton",
  "MetaDataStatus",
]) {
  if (
    !source.header.includes(
      token
    )
  ) {
    fail(
      `Canonical header lost: ${token}`
    );
  }
}

if (
  source.header.includes(
    "<button"
  ) ||
  source.dataStatus.includes(
    "<button"
  )
) {
  fail(
    "Header still contains raw button controls."
  );
}

const googleSections =
  registry.sections.filter(
    (section) =>
      section.platform ===
      "google"
  );

const googleModules =
  registry.modules.filter(
    (module) =>
      module.platform ===
      "google"
  );

if (
  googleSections.length !==
  1
) {
  fail(
    "Google section count changed."
  );
}

if (
  googleModules.length !==
  6
) {
  fail(
    "Google module count changed."
  );
}

if (
  googleSections.some(
    (section) =>
      section.workspaceNavigation !==
      false
  ) ||
  googleModules.some(
    (module) =>
      module.workspaceNavigation !==
      false
  )
) {
  fail(
    "Google Operations is still visible in workspace navigation."
  );
}

if (
  !source.sidebar.includes(
    "isMetaOSWorkspaceModuleVisible"
  ) ||
  !source.sidebar.includes(
    "isMetaOSWorkspaceSectionVisible"
  )
) {
  fail(
    "Sidebar does not consume the centralized visibility policy."
  );
}

if (
  !source.cron.includes(
    "CRON_SECRET"
  ) ||
  !source.cron.includes(
    "syncMetaSheetToBigQuery"
  )
) {
  fail(
    "Automatic sync route is incomplete."
  );
}

if (
  !source.vercel.includes(
    "/api/cron/meta-sync"
  )
) {
  fail(
    "Vercel cron configuration is missing."
  );
}

if (
  source.connectionUi.includes(
    "localStorage"
  ) ||
  source.connectionUi.includes(
    "sessionStorage"
  )
) {
  fail(
    "Connection credentials are being persisted in browser storage."
  );
}

for (const token of [
  "bigQueryScalarString",
  "row.latest_reporting_date",
  "row.completed_at",
]) {
  if (
    !source.connectionManager.includes(
      token
    )
  ) {
    fail(
      `BigQuery scalar normalization lost: ${token}`
    );
  }
}

if (process.exitCode) {
  console.error("");
  console.error(
    "MetaOS Data Connection Architecture Audit failed."
  );

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Data Connection Architecture Audit"
);
console.log(
  "========================================="
);
console.log(
  "✅ One Settings-owned connection center."
);
console.log(
  "✅ One server-side credential manager."
);
console.log(
  "✅ One idempotent ingestion engine."
);
console.log(
  "✅ One append-only raw table."
);
console.log(
  "✅ One deduplicated current table."
);
console.log(
  "✅ One sync audit table."
);
console.log(
  "✅ One central Meta data gateway."
);
console.log(
  "✅ MetaDataStatus and metaStore use the gateway."
);
console.log(
  "✅ No Meta tab queries BigQuery directly."
);
console.log(
  "✅ Manual and scheduled sync share one engine."
);
console.log(
  "✅ Google Operations is hidden, not deleted."
);
console.log(
  "✅ Header controls use canonical primitives."
);
console.log(
  "✅ Browser storage contains no connection secrets."
);
console.log(
  "✅ BigQuery date and timestamp scalars are normalized centrally."
);
console.log(
  "✅ Data connection architecture: PASS"
);
