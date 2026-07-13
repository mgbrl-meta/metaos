import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contractPath = path.join(
  root,
  "config",
  "metaos-frontend-contract.json"
);

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

if (!fs.existsSync(contractPath)) {
  console.error("❌ Missing config/metaos-frontend-contract.json");
  process.exit(1);
}

const contract = JSON.parse(
  fs.readFileSync(contractPath, "utf8")
);

const rootRoute = (contract.routes || []).find(
  (route) => route.path === "/"
);

if (!rootRoute) {
  fail("Root production route is missing from the frontend contract.");
}

const rootPage = rootRoute
  ? read(rootRoute.file)
  : "";
const v2Shell = read(
  "components/meta-v2/shell/MetaOSV2App.tsx"
);

const ids = new Set();

const counts = {
  meta: 0,
  google: 0,
  system: 0
};

for (const route of contract.routes || []) {
  if (!fs.existsSync(path.join(root, route.file))) {
    fail(`Missing route file: ${route.file}`);
  }
}

for (const [name, relativePath] of Object.entries(
  contract.infrastructure || {}
)) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    fail(
      `Missing infrastructure file (${name}): ${relativePath}`
    );
  }
}

for (const module of contract.modules || []) {
  const key = `${module.platform}:${module.id}`;

  if (ids.has(key)) {
    fail(`Duplicate module id: ${key}`);
  }

  ids.add(key);

  if (!(module.platform in counts)) {
    fail(
      `Unknown platform for ${key}: ${module.platform}`
    );
    continue;
  }

  counts[module.platform] += 1;

  if (!fs.existsSync(path.join(root, module.component))) {
    fail(
      `Missing component for ${key}: ${module.component}`
    );
  }

  if (!rootPage.includes(module.pageToken)) {
    fail(
      `Root route no longer renders ${key}. Missing token: ${module.pageToken}`
    );
  }

  if (
    module.variantToken &&
    !rootPage.includes(module.variantToken)
  ) {
    fail(
      `Root route lost variant for ${key}. Missing token: ${module.variantToken}`
    );
  }
}

for (const module of contract.engineBackedV2Modules || []) {
  if (!fs.existsSync(path.join(root, module.component))) {
    fail(
      `Missing engine-backed V2 component: ${module.component}`
    );
  }

  if (!v2Shell.includes(module.shellToken)) {
    fail(
      `V2 shell no longer renders ${module.id}. Missing token: ${module.shellToken}`
    );
  }
}

const expected = {
  meta: 14,
  google: 6,
  system: 1
};

for (const [platform, expectedCount] of Object.entries(
  expected
)) {
  if (counts[platform] !== expectedCount) {
    fail(
      `Expected ${expectedCount} ${platform} modules, found ${counts[platform]}.`
    );
  }
}

if (process.exitCode) {
  console.error("");
  console.error(
    "Frontend contract changed. Restore the missing module or intentionally update the contract after architectural review."
  );
  process.exit(1);
}

console.log("");
console.log("MetaOS Frontend Contract Audit");
console.log("==============================");
console.log(`✅ Meta modules retained: ${counts.meta}`);
console.log(`✅ Google modules retained: ${counts.google}`);
console.log(`✅ System modules retained: ${counts.system}`);
console.log(
  `✅ Engine-backed V2 modules retained: ${contract.engineBackedV2Modules.length}`
);
console.log(
  `✅ Routes retained: ${contract.routes
    .map((route) => route.path)
    .join(", ")}`
);
console.log("✅ Frontend contract: PASS");
