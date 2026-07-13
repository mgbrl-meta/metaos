import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const paths = {
  config: "config/metaos-module-registry.json",
  contracts: "lib/metaos-ui/contracts.ts",
  registry: "lib/metaos-ui/moduleRegistry.ts",
  queries: "lib/metaos-ui/moduleQueries.ts",
  renderer:
    "components/metaos-ui/MetaOSModuleRenderer.tsx",
  commandAdapter:
    "components/metaos-ui/modules/CommandCenterModule.tsx",
  store: "store/metaOSUiStore.ts",
  frozenContract:
    "config/metaos-frontend-contract.json",
};

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function exists(relativePath) {
  return fs.existsSync(
    path.join(root, relativePath)
  );
}

function read(relativePath) {
  if (!exists(relativePath)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }

  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8"
  );
}

const configSource = read(paths.config);
const contractsSource = read(paths.contracts);
const registrySource = read(paths.registry);
const querySource = read(paths.queries);
const rendererSource = read(paths.renderer);
const commandAdapterSource = read(
  paths.commandAdapter
);
const storeSource = read(paths.store);

let registryConfig;

try {
  registryConfig = JSON.parse(configSource);
} catch {
  fail(
    "config/metaos-module-registry.json is not valid JSON."
  );

  registryConfig = {
    modules: [],
    sections: [],
  };
}

const modules = registryConfig.modules || [];
const sections = registryConfig.sections || [];

const ids = modules.map((module) => module.id);
const uniqueIds = new Set(ids);

if (ids.length !== uniqueIds.size) {
  fail("Module registry contains duplicate IDs.");
}

if (modules.length !== 22) {
  fail(
    `Expected 22 canonical modules, found ${modules.length}.`
  );
}

if (
  registryConfig.defaultModuleId !==
  "command_center"
) {
  fail(
    "Canonical default module must be command_center."
  );
}

const requiredModuleFields = [
  "id",
  "platform",
  "sectionId",
  "label",
  "shortLabel",
  "description",
  "iconKey",
  "componentKey",
  "componentPath",
  "currentRoute",
  "implementation",
  "status",
  "order",
  "keywords",
];

const sectionIds = new Set(
  sections.map((section) => section.id)
);

for (const module of modules) {
  for (const field of requiredModuleFields) {
    if (!(field in module)) {
      fail(
        `Module ${module.id || "unknown"} is missing ${field}.`
      );
    }
  }

  if (!sectionIds.has(module.sectionId)) {
    fail(
      `Module ${module.id} references unknown section ${module.sectionId}.`
    );
  }

  if (!Array.isArray(module.keywords)) {
    fail(
      `Module ${module.id} must provide searchable keywords.`
    );
  }

  if (!exists(module.componentPath)) {
    fail(
      `Module ${module.id} points to a missing component: ${module.componentPath}`
    );
  }

  if (
    module.preferredComponentPath &&
    !exists(module.preferredComponentPath)
  ) {
    fail(
      `Module ${module.id} points to a missing preferred component: ${module.preferredComponentPath}`
    );
  }

  if (
    !rendererSource.includes(
      `case "${module.id}":`
    )
  ) {
    fail(
      `Module renderer is missing: ${module.id}`
    );
  }

  if (
    !contractsSource.includes(
      `"${module.id}"`
    )
  ) {
    fail(
      `Contracts file is missing module ID: ${module.id}`
    );
  }
}

if (
  !rendererSource.includes(
    "const exhaustiveCheck: never"
  )
) {
  fail(
    "Module renderer is not protected by an exhaustive TypeScript switch."
  );
}

const registryExports = [
  "METAOS_REGISTRY_CONFIG",
  "METAOS_MODULES",
  "METAOS_SECTIONS",
  "METAOS_DEFAULT_MODULE_ID",
];

for (const exportName of registryExports) {
  if (!registrySource.includes(exportName)) {
    fail(
      `Canonical registry export missing: ${exportName}`
    );
  }
}

const queryFunctions = [
  "isMetaOSModuleId",
  "getMetaOSModule",
  "getMetaOSModulesByPlatform",
  "getMetaOSNavigationSections",
  "getDefaultMetaOSModuleId",
  "searchMetaOSModules",
  "getAdjacentMetaOSModuleId",
];

for (const functionName of queryFunctions) {
  if (
    !querySource.includes(
      `function ${functionName}`
    )
  ) {
    fail(
      `Module query helper missing: ${functionName}`
    );
  }
}

const requiredStoreTokens = [
  "activeModuleId",
  "setActiveModule",
  "setActivePlatform",
  "sidebarCollapsed",
  "mobileNavigationOpen",
  "commandPaletteOpen",
  "navigationSearch",
  "lastModuleByPlatform",
  "recentModuleIds",
  "metaos-ui-v1",
];

for (const token of requiredStoreTokens) {
  if (!storeSource.includes(token)) {
    fail(
      `Unified UI store is missing: ${token}`
    );
  }
}

if (
  !commandAdapterSource.includes(
    "normalizeMetaV2Rows"
  ) ||
  !commandAdapterSource.includes(
    "buildMetaV2CommandCenter"
  )
) {
  fail(
    "Command Center adapter does not use the protected normalize → engine data path."
  );
}

if (exists(paths.frozenContract)) {
  const frozenContract = JSON.parse(
    read(paths.frozenContract)
  );

  const frozenIds = (
    frozenContract.modules || []
  ).map((module) => module.id);

  for (const frozenId of frozenIds) {
    if (!uniqueIds.has(frozenId)) {
      fail(
        `Frozen production module is missing from canonical registry: ${frozenId}`
      );
    }
  }
}

const googleModules = modules.filter(
  (module) => module.platform === "google"
);

for (const module of googleModules) {
  if (!module.componentVariant) {
    fail(
      `Google module ${module.id} is missing componentVariant.`
    );
  }

  if (
    !rendererSource.includes(
      `initialTab="${module.componentVariant}"`
    )
  ) {
    fail(
      `Renderer lost Google variant ${module.componentVariant} for ${module.id}.`
    );
  }
}

if (process.exitCode) {
  console.error("");
  console.error(
    "Canonical module architecture audit failed."
  );

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Canonical Module Registry Audit"
);
console.log(
  "======================================"
);
console.log(
  "✅ Existing production modules retained: 21"
);
console.log(
  "✅ Engine-backed Command Center retained: 1"
);
console.log(
  `✅ Canonical registered modules: ${modules.length}`
);
console.log(
  `✅ Navigation sections: ${sections.length}`
);
console.log(
  "✅ Rich metadata contract retained."
);
console.log(
  "✅ Search, adjacency and platform queries retained."
);
console.log(
  "✅ Persistent unified UI state retained."
);
console.log(
  "✅ Exhaustive module renderer retained."
);
console.log(
  "✅ Protected Command Center adapter retained."
);
console.log(
  "✅ Canonical module architecture: PASS"
);
