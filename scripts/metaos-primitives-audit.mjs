import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "lib/metaos-ui/cx.ts",
  "components/metaos-ui/primitives/Button.tsx",
  "components/metaos-ui/primitives/IconButton.tsx",
  "components/metaos-ui/primitives/Badge.tsx",
  "components/metaos-ui/primitives/Card.tsx",
  "components/metaos-ui/primitives/PageHeader.tsx",
  "components/metaos-ui/primitives/MetricCard.tsx",
  "components/metaos-ui/primitives/FilterBar.tsx",
  "components/metaos-ui/primitives/SegmentedControl.tsx",
  "components/metaos-ui/primitives/StatePanel.tsx",
  "components/metaos-ui/primitives/index.ts",
  "styles/metaos-ui/primitives.css",
];

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
    fail(
      `Missing primitive file: ${relativePath}`
    );

    return "";
  }

  return fs.readFileSync(
    absolute,
    "utf8"
  );
}

function removeCssComments(source) {
  return source.replace(
    /\/\*[\s\S]*?\*\//g,
    ""
  );
}

function findClosingBrace(
  source,
  openingIndex
) {
  let depth = 0;

  for (
    let index = openingIndex;
    index < source.length;
    index += 1
  ) {
    const character = source[index];

    if (character === "{") {
      depth += 1;
    }

    if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

/**
 * Extract normal CSS selectors while:
 *
 * - Recursively inspecting @media, @supports,
 *   @container and @layer blocks.
 * - Ignoring @keyframes blocks.
 * - Ignoring other declaration at-rules.
 *
 * This prevents `from`, `to`, and percentage keyframe
 * positions from being interpreted as CSS selectors.
 */
function extractCssSelectors(source) {
  const selectors = [];
  const css = removeCssComments(source);

  let cursor = 0;

  while (cursor < css.length) {
    const openingBrace =
      css.indexOf("{", cursor);

    if (openingBrace < 0) {
      break;
    }

    const prelude = css
      .slice(cursor, openingBrace)
      .trim();

    const closingBrace =
      findClosingBrace(
        css,
        openingBrace
      );

    if (closingBrace < 0) {
      fail(
        `Unbalanced CSS block detected near: ${prelude.slice(
          0,
          80
        )}`
      );

      break;
    }

    const block = css.slice(
      openingBrace + 1,
      closingBrace
    );

    const normalizedPrelude =
      prelude.toLowerCase();

    if (
      normalizedPrelude.startsWith(
        "@keyframes"
      ) ||
      normalizedPrelude.startsWith(
        "@-webkit-keyframes"
      )
    ) {
      cursor = closingBrace + 1;
      continue;
    }

    if (
      normalizedPrelude.startsWith(
        "@media"
      ) ||
      normalizedPrelude.startsWith(
        "@supports"
      ) ||
      normalizedPrelude.startsWith(
        "@container"
      ) ||
      normalizedPrelude.startsWith(
        "@layer"
      )
    ) {
      selectors.push(
        ...extractCssSelectors(block)
      );

      cursor = closingBrace + 1;
      continue;
    }

    if (
      normalizedPrelude.startsWith("@")
    ) {
      cursor = closingBrace + 1;
      continue;
    }

    for (
      const selector of prelude.split(",")
    ) {
      const cleaned = selector.trim();

      if (cleaned) {
        selectors.push(cleaned);
      }
    }

    cursor = closingBrace + 1;
  }

  return selectors;
}

const sources = Object.fromEntries(
  requiredFiles.map(
    (file) => [file, read(file)]
  )
);

const primitiveCss =
  sources[
    "styles/metaos-ui/primitives.css"
  ];

const indexCss = read(
  "styles/metaos-ui/index.css"
);

const workspaceShell = read(
  "components/metaos-ui/shell/MetaOSWorkspaceShell.tsx"
);

const commandCenter = read(
  "components/metaos-ui/modules/CommandCenterModule.tsx"
);

if (
  !workspaceShell.includes(
    '"metaos-ui"'
  )
) {
  fail(
    "Workspace shell is missing the design-system root scope."
  );
}

const importOrder = [
  '@import "tailwindcss";',
  '@import "./tokens.css";',
  '@import "./foundation.css";',
  '@import "./primitives.css";',
  '@import "./shell.css";',
];

let previousIndex = -1;

for (const importToken of importOrder) {
  const currentIndex =
    indexCss.indexOf(importToken);

  if (currentIndex < 0) {
    fail(
      `Workspace CSS entry is missing: ${importToken}`
    );
  }

  if (currentIndex < previousIndex) {
    fail(
      "Workspace primitive CSS import order is incorrect."
    );
  }

  previousIndex = currentIndex;
}

for (const forbidden of [
  "!important",
  "linear-gradient",
  "radial-gradient",
  "#0A84FF",
  "[class*=",
  "[class^=",
]) {
  if (
    primitiveCss.includes(forbidden)
  ) {
    fail(
      `Primitive CSS contains forbidden pattern: ${forbidden}`
    );
  }
}

const selectors =
  extractCssSelectors(primitiveCss);

for (const selector of selectors) {
  if (
    !selector.startsWith(
      ".metaos-ui"
    )
  ) {
    fail(
      `Primitive selector is not scoped under .metaos-ui: ${selector}`
    );
  }
}

const buttonSource =
  sources[
    "components/metaos-ui/primitives/Button.tsx"
  ];

for (const token of [
  'type = "button"',
  "aria-busy",
  "disabled={isDisabled}",
  "forwardRef",
]) {
  if (!buttonSource.includes(token)) {
    fail(
      `Button accessibility contract is missing: ${token}`
    );
  }
}

const iconButtonSource =
  sources[
    "components/metaos-ui/primitives/IconButton.tsx"
  ];

for (const token of [
  "label: string",
  "aria-label={label}",
  "title={props.title || label}",
]) {
  if (
    !iconButtonSource.includes(token)
  ) {
    fail(
      `IconButton accessibility contract is missing: ${token}`
    );
  }
}

for (const component of [
  "PageHeader",
  "MetricCard",
  "Card",
  "Badge",
  "EmptyState",
]) {
  if (
    !commandCenter.includes(component)
  ) {
    fail(
      `Command Center has not adopted primitive: ${component}`
    );
  }
}

if (
  commandCenter.includes(
    "function Metric("
  )
) {
  fail(
    "Command Center still owns a duplicate metric component."
  );
}

const primitiveFiles =
  requiredFiles.filter(
    (file) =>
      file.includes("/primitives/")
  );

for (const file of primitiveFiles) {
  const source = sources[file];

  if (
    source.includes(
      "@/lib/meta-v2/"
    ) ||
    source.includes(
      "@/store/metaStore"
    )
  ) {
    fail(
      `UI primitive imports backend or data-store code: ${file}`
    );
  }
}

if (process.exitCode) {
  console.error("");
  console.error(
    "MetaOS primitive architecture audit failed."
  );

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS UI Primitive Architecture Audit"
);
console.log(
  "======================================"
);
console.log(
  `✅ Primitive files protected: ${requiredFiles.length}`
);
console.log(
  `✅ Scoped CSS selectors inspected: ${selectors.length}`
);
console.log(
  "✅ Nested responsive CSS blocks inspected."
);
console.log(
  "✅ Keyframe steps excluded from selector analysis."
);
console.log(
  "✅ Workspace design-system scope installed."
);
console.log(
  "✅ Primitive CSS import order protected."
);
console.log(
  "✅ All primitive selectors scoped under .metaos-ui."
);
console.log(
  "✅ No gradients, blue dependency or !important."
);
console.log(
  "✅ Accessible button and icon-button contracts."
);
console.log(
  "✅ Primitives remain independent from backend and data stores."
);
console.log(
  "✅ Command Center migrated to reusable primitives."
);
console.log(
  "✅ UI primitive architecture: PASS"
);
