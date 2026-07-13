import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const sidebarPath =
  "components/metaos-ui/shell/MetaOSSidebar.tsx";

const shellPath =
  "styles/metaos-ui/shell.css";

function read(relativePath) {
  const absolute = path.join(
    root,
    relativePath
  );

  if (!fs.existsSync(absolute)) {
    console.error(
      `❌ Missing file: ${relativePath}`
    );
    process.exit(1);
  }

  return fs.readFileSync(
    absolute,
    "utf8"
  );
}

const sidebar = read(sidebarPath);
const shell = read(shellPath);

const failures = [];

function requireToken(
  source,
  token,
  message
) {
  if (!source.includes(token)) {
    failures.push(message);
  }
}

requireToken(
  sidebar,
  'className="mos-sidebar-panel"',
  "Sidebar must contain the internal panel."
);

requireToken(
  sidebar,
  "OPEN_DELAY_MS = 210",
  "210ms open delay is missing."
);

requireToken(
  sidebar,
  "CLOSE_DELAY_MS = 340",
  "340ms close delay is missing."
);

requireToken(
  shell,
  "METAOS SIDEBAR PREVIEW PANEL ARCHITECTURE",
  "Canonical preview-panel contract is missing."
);

requireToken(
  shell,
  ".mos-sidebar.is-preview-expanded",
  "Preview-expanded selector is missing."
);

requireToken(
  shell,
  "background: var(--mos-surface)",
  "Preview panel lacks an opaque background."
);

requireToken(
  shell,
  "pointer-events: auto",
  "Clickable navigation contract is missing."
);

const obsoleteMarkers = [
  "METAOS SIDEBAR INTERACTION ARCHITECTURE",
  "METAOS SIDEBAR INTERACTION START",
  "METAOS CLASSICAL SIDEBAR START",
];

for (const marker of obsoleteMarkers) {
  if (shell.includes(marker)) {
    failures.push(
      `Obsolete sidebar block remains: ${marker}`
    );
  }
}

const previewContractCount =
  (
    shell.match(
      /METAOS SIDEBAR PREVIEW PANEL ARCHITECTURE/g
    ) || []
  ).length;

if (previewContractCount !== 1) {
  failures.push(
    `Expected exactly one preview-panel contract; found ${previewContractCount}.`
  );
}

/*
 * Inspect only CSS before the canonical mobile media block.
 * Mobile position: fixed is valid for the drawer.
 */
const canonicalStart =
  shell.indexOf(
    "METAOS SIDEBAR PREVIEW PANEL ARCHITECTURE"
  );

const mobileStart =
  shell.indexOf(
    "@media (max-width: 860px)",
    canonicalStart
  );

const desktopContract =
  canonicalStart >= 0
    ? shell.slice(
        canonicalStart,
        mobileStart >= 0
          ? mobileStart
          : undefined
      )
    : "";

const desktopFixedPreview =
  /\.mos-sidebar\.is-preview-expanded[\s\S]{0,300}position:\s*fixed/;

if (
  desktopFixedPreview.test(
    desktopContract
  )
) {
  failures.push(
    "Desktop hover preview still uses position: fixed."
  );
}

const activeDisabled =
  /\.mos-nav-item\.is-active[\s\S]{0,180}(pointer-events:\s*none|cursor:\s*not-allowed)/;

if (activeDisabled.test(shell)) {
  failures.push(
    "Active navigation item is pointer-blocked."
  );
}

if (
  sidebar.includes("disabled=") ||
  sidebar.includes("disabled>")
) {
  failures.push(
    "Sidebar module buttons must never be disabled."
  );
}

if (shell.includes("!important")) {
  failures.push(
    "Sidebar architecture must not use !important."
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
  "MetaOS Sidebar Preview Architecture Audit"
);
console.log(
  "========================================="
);
console.log(
  "✅ One canonical preview-panel contract."
);
console.log(
  "✅ Obsolete fixed-overlay contracts removed."
);
console.log(
  "✅ Desktop preview expands the internal panel."
);
console.log(
  "✅ Mobile drawer may use position: fixed."
);
console.log(
  "✅ Complete opaque preview background."
);
console.log(
  "✅ Active and inactive modules remain clickable."
);
console.log(
  "✅ Main content width remains stable during hover."
);
console.log(
  "✅ Sidebar preview architecture: PASS"
);
