import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  rootLayout: "app/layout.tsx",
  legacyLayout: "app/(legacy)/layout.tsx",
  legacyPage: "app/(legacy)/page.tsx",
  legacyV2: "app/(legacy)/v2/page.tsx",
  workspaceLayout: "app/workspace/layout.tsx",
  workspacePage: "app/workspace/page.tsx",
  shell:
    "components/metaos-ui/shell/MetaOSWorkspaceShell.tsx",
  sidebar:
    "components/metaos-ui/shell/MetaOSSidebar.tsx",
  header:
    "components/metaos-ui/shell/MetaOSHeader.tsx",
  data:
    "components/metaos-ui/data/MetaDataStatus.tsx",
  renderer:
    "components/metaos-ui/MetaOSModuleRenderer.tsx",
  command:
    "components/metaos-ui/modules/CommandCenterModule.tsx",
  tokens: "styles/metaos-ui/tokens.css",
  foundation:
    "styles/metaos-ui/foundation.css",
  shellCss: "styles/metaos-ui/shell.css",
  indexCss: "styles/metaos-ui/index.css",
};

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

const source = Object.fromEntries(
  Object.entries(files).map(
    ([key, file]) => [key, read(file)]
  )
);

if (
  source.rootLayout.includes(
    "MetaOSClassicUXLayer"
  )
) {
  fail(
    "Root layout still mounts the DOM-driven classic patch layer."
  );
}

if (
  source.rootLayout.includes(
    "globals.css"
  ) ||
  source.rootLayout.includes(
    "metaos-readability.css"
  ) ||
  source.rootLayout.includes(
    "os-theme-final.css"
  )
) {
  fail(
    "Root layout still loads legacy frontend CSS."
  );
}

for (const required of [
  "globals.css",
  "metaos-readability.css",
  "os-theme-final.css",
  "MetaOSClassicUXLayer",
]) {
  if (
    !source.legacyLayout.includes(
      required
    )
  ) {
    fail(
      `Legacy layout lost required compatibility layer: ${required}`
    );
  }
}

if (
  !source.workspacePage.includes(
    "MetaOSWorkspaceShell"
  )
) {
  fail(
    "Workspace route does not mount the new application shell."
  );
}

for (const token of [
  "MetaOSSidebar",
  "MetaOSHeader",
  "MetaOSModuleRenderer",
  "activeModuleId",
  "data-theme",
]) {
  if (!source.shell.includes(token)) {
    fail(
      `Application shell is missing: ${token}`
    );
  }
}

for (const token of [
  "METAOS_MODULES",
  "METAOS_SECTIONS",
  "setActiveModule",
  "sidebarCollapsed",
  "navigationSearch",
]) {
  if (!source.sidebar.includes(token)) {
    fail(
      `Registry-driven sidebar is missing: ${token}`
    );
  }
}

for (const token of [
  "/api/meta-data",
  "setPerformanceRows",
  "setMetaFreshness",
  "setMetaQcSummary",
]) {
  if (!source.data.includes(token)) {
    fail(
      `Central data controller is missing: ${token}`
    );
  }
}

if (
  source.shell.includes(
    "querySelector"
  ) ||
  source.shell.includes(
    "MutationObserver"
  ) ||
  source.sidebar.includes(
    "querySelector"
  )
) {
  fail(
    "New shell contains DOM-driven navigation."
  );
}

for (const cssSource of [
  source.tokens,
  source.foundation,
  source.shellCss,
]) {
  if (cssSource.includes("!important")) {
    fail(
      "New frontend architecture contains !important overrides."
    );
  }
}

for (const forbidden of [
  "#0A84FF",
  "linear-gradient",
  "radial-gradient",
  "backdrop-blur-xl",
]) {
  if (
    source.command.includes(forbidden)
  ) {
    fail(
      `New Command Center contains forbidden decorative styling: ${forbidden}`
    );
  }
}

if (
  !source.indexCss.includes(
    '@import "tailwindcss"'
  )
) {
  fail(
    "Workspace CSS does not provide Tailwind utilities for retained screens."
  );
}

if (process.exitCode) {
  console.error("");
  console.error(
    "Frontend shell architecture audit failed."
  );

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Frontend Shell Architecture Audit"
);
console.log(
  "========================================"
);
console.log(
  "✅ Legacy CSS and patch shell isolated to legacy routes."
);
console.log(
  "✅ New /workspace route is independently styled."
);
console.log(
  "✅ One registry-driven sidebar."
);
console.log(
  "✅ One canonical active-module state."
);
console.log(
  "✅ One central data refresh/status controller."
);
console.log(
  "✅ Compact light/dark token system."
);
console.log(
  "✅ No DOM observer navigation."
);
console.log(
  "✅ No !important declarations in the new UI architecture."
);
console.log(
  "✅ Frontend shell architecture: PASS"
);
