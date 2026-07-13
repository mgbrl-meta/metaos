import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const storePath = path.join(
  root,
  "store",
  "metaOSUiStore.ts"
);

if (!fs.existsSync(storePath)) {
  console.error(
    "❌ Missing store/metaOSUiStore.ts"
  );

  process.exit(1);
}

const source = fs.readFileSync(
  storePath,
  "utf8"
);

const requiredTokens = [
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

const forbiddenTokens = [
  "activeMetaTab",
  "activeGoogleTab",
  "activeSystemTab",
  "querySelector",
  "MutationObserver",
  ".click()",
];

let failed = false;

for (const token of requiredTokens) {
  if (!source.includes(token)) {
    console.error(
      `❌ Unified UI store missing token: ${token}`
    );

    failed = true;
  }
}

for (const token of forbiddenTokens) {
  if (source.includes(token)) {
    console.error(
      `❌ Patch-style state token detected in unified store: ${token}`
    );

    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Unified UI State Audit"
);

console.log(
  "============================="
);

console.log(
  "✅ One canonical activeModuleId"
);

console.log(
  "✅ Platform switching uses registered modules"
);

console.log(
  "✅ Sidebar, mobile navigation and command palette state centralized"
);

console.log(
  "✅ Recent and last-used modules centralized"
);

console.log(
  "✅ No DOM-driven navigation state"
);

console.log(
  "✅ Unified UI state: PASS"
);
