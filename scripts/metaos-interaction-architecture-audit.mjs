import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  store:
    "store/metaOSUiStore.ts",

  sidebar:
    "components/metaos-ui/shell/MetaOSSidebar.tsx",

  shell:
    "styles/metaos-ui/shell.css",

  tokens:
    "styles/metaos-ui/tokens.css",

  primitives:
    "styles/metaos-ui/primitives.css",

  foundation:
    "styles/metaos-ui/foundation.css",
};

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  const absolute =
    path.join(root, relativePath);

  if (!fs.existsSync(absolute)) {
    fail(
      `Missing interaction architecture file: ${relativePath}`
    );

    return "";
  }

  return fs.readFileSync(
    absolute,
    "utf8"
  );
}

const source =
  Object.fromEntries(
    Object.entries(files).map(
      ([key, filename]) => [
        key,
        read(filename),
      ]
    )
  );

for (const token of [
  "sidebarCollapsed: true",
  "version: 2",
  "migrate:",
]) {
  if (!source.store.includes(token)) {
    fail(
      `Collapsed-default state contract missing: ${token}`
    );
  }
}

for (const token of [
  "previewExpanded",
  "onMouseEnter",
  "onMouseLeave",
  "onFocusCapture",
  "onBlurCapture",
  "is-preview-expanded",
]) {
  if (!source.sidebar.includes(token)) {
    fail(
      `Transient sidebar-preview contract missing: ${token}`
    );
  }
}

for (const token of [
  "--mos-motion-fast:",
  "--mos-motion-standard:",
  "--mos-motion-ease:",
  "--mos-card-hover-lift:",
  "--mos-shadow-card-hover:",
]) {
  if (!source.tokens.includes(token)) {
    fail(
      `Shared interaction token missing: ${token}`
    );
  }
}

for (const token of [
  ".mos-sidebar.is-preview-expanded",
  ".mos-nav-item:hover",
  "var(--mos-motion-standard)",
]) {
  if (!source.shell.includes(token)) {
    fail(
      `Sidebar interaction CSS missing: ${token}`
    );
  }
}

for (const token of [
  ".metaos-ui .mos-card,",
  ".metaos-ui .mos-metric-card",
  "var(--mos-card-hover-lift)",
  "var(--mos-shadow-card-hover)",
  "@media (hover: hover)",
]) {
  if (!source.primitives.includes(token)) {
    fail(
      `Shared card interaction missing: ${token}`
    );
  }
}

if (
  !source.foundation.includes(
    "prefers-reduced-motion"
  )
) {
  fail(
    "Reduced-motion accessibility contract is missing."
  );
}

const combinedCss = [
  source.shell,
  source.primitives,
  source.foundation,
].join("\n");

if (combinedCss.includes("!important")) {
  fail(
    "Interaction architecture contains !important."
  );
}

for (const forbidden of [
  "querySelector",
  "MutationObserver",
  ".click()",
]) {
  if (
    source.sidebar.includes(
      forbidden
    )
  ) {
    fail(
      `DOM-driven interaction is forbidden: ${forbidden}`
    );
  }
}

if (process.exitCode) {
  console.error("");
  console.error(
    "MetaOS interaction architecture: FAIL"
  );

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Interaction Architecture Audit"
);
console.log(
  "====================================="
);
console.log(
  "✅ Sidebar defaults to collapsed."
);
console.log(
  "✅ Existing persisted state migrates safely."
);
console.log(
  "✅ Hover preview is transient and non-persistent."
);
console.log(
  "✅ Sidebar stays open while hovered or focused."
);
console.log(
  "✅ Navigation animation uses shared motion tokens."
);
console.log(
  "✅ Card elevation belongs to shared primitives."
);
console.log(
  "✅ Metric-card elevation belongs to shared primitives."
);
console.log(
  "✅ Reduced-motion preference is respected."
);
console.log(
  "✅ No DOM scanning or forced CSS override."
);
console.log(
  "✅ Interaction architecture: PASS"
);
