import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const contractFile =
  "config/metaos-remaining-meta-screen-contract.json";

const rendererFile =
  "components/metaos-ui/MetaOSModuleRenderer.tsx";

const registryFile =
  "config/metaos-module-registry.json";

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  const absolute = path.join(
    root,
    relativePath
  );

  if (!fs.existsSync(absolute)) {
    fail(`Missing file: ${relativePath}`);
    return "";
  }

  return fs.readFileSync(
    absolute,
    "utf8"
  );
}

let contract;

try {
  contract = JSON.parse(
    read(contractFile)
  );
} catch {
  fail(
    "Remaining Meta screen contract is invalid JSON."
  );

  contract = {
    modules: [],
  };
}

let registry;

try {
  registry = JSON.parse(
    read(registryFile)
  );
} catch {
  fail(
    "Canonical module registry is invalid JSON."
  );

  registry = {
    modules: [],
  };
}

const renderer = read(
  rendererFile
);

const modules =
  contract.modules ?? [];

if (modules.length !== 11) {
  fail(
    `Expected 11 remaining Meta modules, found ${modules.length}.`
  );
}

const sourceFiles = new Set(
  modules.map(
    (module) =>
      module.sourceFile
  )
);

if (sourceFiles.size !== 10) {
  fail(
    `Expected 10 remaining source files, found ${sourceFiles.size}.`
  );
}

const ids = new Set();

for (const module of modules) {
  if (ids.has(module.id)) {
    fail(
      `Duplicate remaining Meta module: ${module.id}`
    );
  }

  ids.add(module.id);

  const registryModule =
    (
      registry.modules ?? []
    ).find(
      (candidate) =>
        candidate.id ===
        module.id
    );

  if (!registryModule) {
    fail(
      `Remaining module is missing from canonical registry: ${module.id}`
    );
  }

  if (
    registryModule.platform !==
    "meta"
  ) {
    fail(
      `Remaining module is not registered as Meta: ${module.id}`
    );
  }

  if (
    !fs.existsSync(
      path.join(
        root,
        module.sourceFile
      )
    )
  ) {
    fail(
      `Missing remaining screen source: ${module.sourceFile}`
    );

    continue;
  }

  const source = read(
    module.sourceFile
  );

  const exportPatterns = [
    `function ${module.exportName}`,
    `const ${module.exportName}`,
    `export { ${module.exportName}`,
  ];

  if (
    !exportPatterns.some(
      (token) =>
        source.includes(token)
    )
  ) {
    fail(
      `Expected export ${module.exportName} was not found in ${module.sourceFile}`
    );
  }

  if (
    !renderer.includes(
      `case "${module.id}":`
    )
  ) {
    fail(
      `Renderer case is missing: ${module.id}`
    );
  }

  if (
    !renderer.includes(
      module.rendererToken
    )
  ) {
    fail(
      `Renderer mapping changed for ${module.id}. Expected: ${module.rendererToken}`
    );
  }

  for (
    const capability of
    module.requiredCapabilities ??
    []
  ) {
    if (
      !source.includes(
        capability
      )
    ) {
      fail(
        `${module.id} lost required capability token: ${capability}`
      );
    }
  }
}

const expectedIds = [
  "summary",
  "top_descaling",
  "top_scaling",
  "influencer_ads",
  "high_cpa",
  "gpt",
  "high_roas",
  "spend_visuals",
  "creative",
  "creative_ageing",
  "monthly",
];

for (const expectedId of expectedIds) {
  if (!ids.has(expectedId)) {
    fail(
      `Remaining Meta contract lost module: ${expectedId}`
    );
  }
}

if (process.exitCode) {
  console.error("");
  console.error(
    "Remaining Meta screen contract audit failed."
  );

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Remaining Meta Screen Contract Audit"
);
console.log(
  "==========================================="
);
console.log(
  "✅ Remaining Meta modules frozen: 11"
);
console.log(
  "✅ Remaining source components frozen: 10"
);
console.log(
  "✅ Summary and action-priority modules retained."
);
console.log(
  "✅ High CPA, GPT and High ROAS modules retained."
);
console.log(
  "✅ Spend, Creative, Ageing and Monthly modules retained."
);
console.log(
  "✅ Existing renderer mappings retained."
);
console.log(
  "✅ Clipboard and action-only High CPA export contract retained."
);
console.log(
  "✅ Remaining Meta screen contract: PASS"
);
