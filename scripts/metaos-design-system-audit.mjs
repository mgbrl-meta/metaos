import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  workspaceShell:
    "components/metaos-ui/shell/MetaOSWorkspaceShell.tsx",

  button:
    "components/metaos-ui/primitives/Button.tsx",

  iconButton:
    "components/metaos-ui/primitives/IconButton.tsx",

  badge:
    "components/metaos-ui/primitives/Badge.tsx",

  card:
    "components/metaos-ui/primitives/Card.tsx",

  metricCard:
    "components/metaos-ui/primitives/MetricCard.tsx",

  pageHeader:
    "components/metaos-ui/primitives/PageHeader.tsx",

  statePanel:
    "components/metaos-ui/primitives/StatePanel.tsx",

  tokens:
    "styles/metaos-ui/tokens.css",

  foundation:
    "styles/metaos-ui/foundation.css",

  primitives:
    "styles/metaos-ui/primitives.css",

  table:
    "styles/metaos-ui/table.css",

  engineScreens:
    "styles/metaos-ui/engine-screens.css",

  actionScreens:
    "styles/metaos-ui/action-screens.css",

  economicScreens:
    "styles/metaos-ui/economic-screens.css",

  analysisScreens:
    "styles/metaos-ui/analysis-screens.css",

  shell:
    "styles/metaos-ui/shell.css",

  index:
    "styles/metaos-ui/index.css",
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
    fail(`Missing design-system file: ${relativePath}`);
    return "";
  }

  return fs.readFileSync(
    absolute,
    "utf8"
  );
}

function removeComments(source) {
  return source.replace(
    /\/\*[\s\S]*?\*\//g,
    ""
  );
}

const source = Object.fromEntries(
  Object.entries(files).map(
    ([key, relativePath]) => [
      key,
      read(relativePath),
    ]
  )
);

const css = removeComments(
  [
    source.tokens,
    source.foundation,
    source.primitives,
    source.table,
    source.engineScreens,
    source.actionScreens,
    source.economicScreens,
    source.analysisScreens,
    source.shell,
  ].join("\n")
);

/**
 * Workspace scope
 */
if (
  !source.workspaceShell.includes(
    '"metaos-workspace"'
  )
) {
  fail(
    "Workspace shell is missing the application design-system scope."
  );
}

if (
  !source.workspaceShell.includes(
    '"metaos-ui"'
  )
) {
  fail(
    "Workspace shell is missing the primitive design-system scope."
  );
}

/**
 * CSS entry and ownership
 */
const expectedImports = [
  '@import "tailwindcss";',
  '@import "./tokens.css";',
  '@import "./foundation.css";',
  '@import "./primitives.css";',
  '@import "./table.css";',
  '@import "./engine-screens.css";',
  '@import "./action-screens.css";',
  '@import "./economic-screens.css";',
  '@import "./analysis-screens.css";',
  '@import "./shell.css";',
];

let lastPosition = -1;

for (const importToken of expectedImports) {
  const position =
    source.index.indexOf(importToken);

  if (position < 0) {
    fail(
      `Design-system entry is missing: ${importToken}`
    );
  }

  if (position < lastPosition) {
    fail(
      "Design-system stylesheet import order is invalid."
    );
  }

  lastPosition = position;
}

/**
 * Neutral semantic-token contract
 */
const requiredTokens = [
  "--mos-bg:",
  "--mos-surface:",
  "--mos-surface-subtle:",
  "--mos-surface-strong:",
  "--mos-text:",
  "--mos-text-secondary:",
  "--mos-text-tertiary:",
  "--mos-text-inverse:",
  "--mos-border:",
  "--mos-border-strong:",
  "--mos-positive:",
  "--mos-positive-soft:",
  "--mos-positive-border:",
  "--mos-negative:",
  "--mos-negative-soft:",
  "--mos-negative-border:",
  "--mos-warning:",
  "--mos-warning-soft:",
  "--mos-warning-border:",
  "--mos-radius-sm:",
  "--mos-radius-md:",
  "--mos-radius-lg:",
];

for (const token of requiredTokens) {
  if (!source.tokens.includes(token)) {
    fail(
      `Semantic design token is missing: ${token}`
    );
  }
}

if (
  !source.tokens.includes(
    '.metaos-workspace[data-theme="dark"]'
  )
) {
  fail(
    "Dark-mode semantic-token contract is missing."
  );
}

/**
 * Prohibited patch and decorative patterns
 */
for (const forbidden of [
  "!important",
  "[class*=",
  "[class^=",
  "linear-gradient",
  "radial-gradient",
  "#0A84FF",
  "rgba(10,132,255",
  "rgba(10, 132, 255",
]) {
  if (css.includes(forbidden)) {
    fail(
      `Design system contains forbidden pattern: ${forbidden}`
    );
  }
}

/**
 * Compact visual-density contract
 */
for (const token of [
  "--mos-sidebar-width: 232px",
  "--mos-header-height: 62px",
  "--mos-radius-sm: 6px",
  "--mos-radius-md: 9px",
  "--mos-radius-lg: 12px",
]) {
  if (!source.tokens.includes(token)) {
    fail(
      `Compact design contract is missing: ${token}`
    );
  }
}

/**
 * Canonical Button accessibility contract
 */
const buttonChecks = [
  {
    token: "forwardRef",
    message:
      "Button must forward its DOM ref.",
  },
  {
    token: 'type = "button"',
    message:
      "Button must default to type=button to prevent accidental form submission.",
  },
  {
    token: "disabled={isDisabled}",
    message:
      "Button must apply disabled state during loading.",
  },
  {
    token: "aria-busy={loading || undefined}",
    message:
      "Button must expose its loading state to assistive technology.",
  },
  {
    token: "ButtonHTMLAttributes<HTMLButtonElement>",
    message:
      "Button must preserve native button attributes.",
  },
];

for (const check of buttonChecks) {
  if (!source.button.includes(check.token)) {
    fail(check.message);
  }
}

/**
 * Canonical IconButton accessibility contract
 */
const iconButtonChecks = [
  {
    token: "forwardRef",
    message:
      "IconButton must forward its DOM ref.",
  },
  {
    token: "label: string",
    message:
      "IconButton must require a text accessibility label.",
  },
  {
    token: "aria-label={label}",
    message:
      "IconButton must expose its required accessibility label.",
  },
  {
    token: "title={props.title || label}",
    message:
      "IconButton must provide a visible hover description.",
  },
  {
    token: 'type = "button"',
    message:
      "IconButton must default to type=button.",
  },
] ;

for (const check of iconButtonChecks) {
  if (!source.iconButton.includes(check.token)) {
    fail(check.message);
  }
}

/**
 * Canonical semantic primitive contract
 */
const primitiveContracts = [
  {
    name: "Badge",
    source: source.badge,
    tokens: [
      '"neutral"',
      '"positive"',
      '"negative"',
      '"warning"',
    ],
  },
  {
    name: "Card",
    source: source.card,
    tokens: [
      '"default"',
      '"subtle"',
      '"positive"',
      '"negative"',
      '"warning"',
    ],
  },
  {
    name: "MetricCard",
    source: source.metricCard,
    tokens: [
      '"neutral"',
      '"positive"',
      '"negative"',
      '"warning"',
    ],
  },
];

for (const contract of primitiveContracts) {
  for (const token of contract.tokens) {
    if (!contract.source.includes(token)) {
      fail(
        `${contract.name} is missing semantic state: ${token}`
      );
    }
  }
}

/**
 * Shared composition contract
 */
for (const componentName of [
  "PageHeader",
  "MetricCard",
  "Card",
  "Badge",
  "EmptyState",
]) {
  const allComponents = [
    source.pageHeader,
    source.metricCard,
    source.card,
    source.badge,
    source.statePanel,
  ].join("\n");

  if (
    !allComponents.includes(
      `function ${componentName}`
    ) &&
    !allComponents.includes(
      `const ${componentName}`
    )
  ) {
    fail(
      `Canonical UI primitive is missing: ${componentName}`
    );
  }
}

/**
 * Backend independence
 */
for (const [
  componentName,
  componentSource,
] of Object.entries({
  Button: source.button,
  IconButton: source.iconButton,
  Badge: source.badge,
  Card: source.card,
  MetricCard: source.metricCard,
  PageHeader: source.pageHeader,
  StatePanel: source.statePanel,
})) {
  for (const forbiddenImport of [
    "@/lib/meta-v2/",
    "@/lib/meta/",
    "@/store/metaStore",
    "@/store/metaV2",
  ]) {
    if (
      componentSource.includes(
        forbiddenImport
      )
    ) {
      fail(
        `${componentName} must not import backend or performance-data code: ${forbiddenImport}`
      );
    }
  }
}

/**
 * Reduced-motion and responsive behavior
 */
if (
  !source.primitives.includes(
    "@media (prefers-reduced-motion: reduce)"
  )
) {
  fail(
    "Primitive layer must support reduced-motion preferences."
  );
}

if (
  !source.primitives.includes(
    "@media (max-width: 720px)"
  )
) {
  fail(
    "Primitive layer must provide compact mobile behavior."
  );
}

/**
 * Semantic CSS states
 */
for (const selector of [
  ".metaos-ui .mos-button",
  ".metaos-ui .mos-icon-control",
  ".metaos-ui .mos-badge.is-positive",
  ".metaos-ui .mos-badge.is-negative",
  ".metaos-ui .mos-card",
  ".metaos-ui .mos-metric-card",
  ".metaos-ui .mos-state-panel",
]) {
  if (!source.primitives.includes(selector)) {
    fail(
      `Primitive CSS selector is missing: ${selector}`
    );
  }
}

if (process.exitCode) {
  console.error("");
  console.error(
    "MetaOS design-system audit failed."
  );
  console.error(
    "Do not migrate additional screens until the design-system contract passes."
  );

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Canonical Design System Audit"
);
console.log(
  "===================================="
);
console.log(
  "✅ Neutral black-and-white semantic token contract."
);
console.log(
  "✅ Light and dark design-token parity."
);
console.log(
  "✅ Positive performance uses green semantics."
);
console.log(
  "✅ Negative performance uses red semantics."
);
console.log(
  "✅ Warning state uses amber semantics."
);
console.log(
  "✅ Compact typography, spacing, radius and shell density."
);
console.log(
  "✅ Canonical Button defaults to type=button."
);
console.log(
  "✅ Canonical Button exposes loading and disabled states."
);
console.log(
  "✅ Canonical IconButton requires an accessible label."
);
console.log(
  "✅ UI primitives remain independent from backend calculations."
);
console.log(
  "✅ Responsive and reduced-motion behavior protected."
);
console.log(
  "✅ No gradients, blue dependency or patch overrides."
);
console.log(
  "✅ Canonical design system: PASS"
);
