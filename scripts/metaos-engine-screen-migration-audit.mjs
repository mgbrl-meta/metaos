import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  renderer:
    "components/metaos-ui/MetaOSModuleRenderer.tsx",

  commandCenter:
    "components/metaos-ui/modules/CommandCenterModule.tsx",

  dataQc:
    "components/metaos-ui/modules/DataQcModule.tsx",

  zeroPurchase:
    "components/metaos-ui/modules/ZeroPurchaseModule.tsx",

  funnel:
    "components/metaos-ui/modules/FunnelModule.tsx",

  css:
    "styles/metaos-ui/engine-screens.css",

  cssEntry:
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
    fail(
      `Missing migrated-screen file: ${relativePath}`
    );

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
    if (source[index] === "{") {
      depth += 1;
    }

    if (source[index] === "}") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function extractSelectors(source) {
  const css =
    removeComments(source);

  const selectors = [];

  let cursor = 0;

  while (cursor < css.length) {
    const opening =
      css.indexOf("{", cursor);

    if (opening < 0) {
      break;
    }

    const prelude = css
      .slice(cursor, opening)
      .trim();

    const closing =
      findClosingBrace(
        css,
        opening
      );

    if (closing < 0) {
      fail(
        `Unbalanced CSS near: ${prelude.slice(
          0,
          70
        )}`
      );

      break;
    }

    const block = css.slice(
      opening + 1,
      closing
    );

    const normalized =
      prelude.toLowerCase();

    if (
      normalized.startsWith(
        "@keyframes"
      )
    ) {
      cursor = closing + 1;
      continue;
    }

    if (
      normalized.startsWith(
        "@media"
      ) ||
      normalized.startsWith(
        "@supports"
      ) ||
      normalized.startsWith(
        "@container"
      ) ||
      normalized.startsWith(
        "@layer"
      )
    ) {
      selectors.push(
        ...extractSelectors(block)
      );

      cursor = closing + 1;
      continue;
    }

    if (
      normalized.startsWith("@")
    ) {
      cursor = closing + 1;
      continue;
    }

    selectors.push(
      ...prelude
        .split(",")
        .map((item) =>
          item.trim()
        )
        .filter(Boolean)
    );

    cursor = closing + 1;
  }

  return selectors;
}

const source = Object.fromEntries(
  Object.entries(files).map(
    ([key, relativePath]) => [
      key,
      read(relativePath),
    ]
  )
);

const rendererContracts = [
  {
    caseToken:
      'case "command_center":',
    componentToken:
      "<CommandCenterModule />",
  },
  {
    caseToken:
      'case "data_qc":',
    componentToken:
      "<DataQcModule />",
  },
  {
    caseToken:
      'case "zero_purchase":',
    componentToken:
      "<ZeroPurchaseModule />",
  },
  {
    caseToken:
      'case "funnel":',
    componentToken:
      "<FunnelModule />",
  },
];

for (const contract of rendererContracts) {
  if (
    !source.renderer.includes(
      contract.caseToken
    ) ||
    !source.renderer.includes(
      contract.componentToken
    )
  ) {
    fail(
      `Renderer migration is missing: ${contract.caseToken} → ${contract.componentToken}`
    );
  }
}

for (const forbidden of [
  "return <DataQCTab />",
  "return <ZeroPurchaseTabV2 />",
  "return <FunnelTabV2 />",
]) {
  if (
    source.renderer.includes(
      forbidden
    )
  ) {
    fail(
      `Renderer still uses a legacy engine screen: ${forbidden}`
    );
  }
}

for (const token of [
  "normalizeMetaV2Rows",
  "buildMetaV2CommandCenter",
  "PageHeader",
  "MetricCard",
]) {
  if (
    !source.commandCenter.includes(
      token
    )
  ) {
    fail(
      `Command Center migration lost required contract: ${token}`
    );
  }
}

for (const token of [
  "normalizeMetaV2Rows",
  "buildMetaV2DataQc",
  "metaQcSummary",
  "suspiciousRows",
  "exportQcRows",
  "DataTable",
  "TablePagination",
  "SegmentedControl",
]) {
  if (!source.dataQc.includes(token)) {
    fail(
      `Data QC migration lost required contract: ${token}`
    );
  }
}

for (const token of [
  "normalizeMetaV2Rows",
  "buildMetaV2ZeroPurchase",
  "threshold",
  "copyHandles",
  "copyFullNames",
  "DataTable",
  "TablePagination",
  "TableDensityControl",
  "renderExpandedRow",
]) {
  if (
    !source.zeroPurchase.includes(
      token
    )
  ) {
    fail(
      `Zero Purchase migration lost required contract: ${token}`
    );
  }
}

for (const token of [
  "normalizeMetaV2Rows",
  "buildMetaV2Funnel",
  "MetaV2FunnelRow",
  "expandedMonthIds",
  "expandAll",
  "collapseAll",
  "TableDensityControl",
  "DataTable",
  "lpvRate",
  "atcRate",
  "checkoutRate",
  "paymentRate",
  "purchaseRate",
]) {
  if (
    !source.funnel.includes(
      token
    )
  ) {
    fail(
      `Funnel migration lost required contract: ${token}`
    );
  }
}

for (const [
  screenName,
  screenSource,
] of Object.entries({
  CommandCenter:
    source.commandCenter,
  DataQc: source.dataQc,
  ZeroPurchase:
    source.zeroPurchase,
  Funnel: source.funnel,
})) {
  for (const forbiddenFormula of [
    "revenue / spend",
    "spend / purchases",
    "purchases / lpv",
    "atc / lpv",
    "checkout / atc",
    "payment / checkout",
  ]) {
    if (
      screenSource.includes(
        forbiddenFormula
      )
    ) {
      fail(
        `${screenName} contains duplicated backend formula: ${forbiddenFormula}`
      );
    }
  }
}

for (const forbidden of [
  "!important",
  "linear-gradient",
  "radial-gradient",
  "#0A84FF",
  "[class*=",
  "[class^=",
]) {
  if (source.css.includes(forbidden)) {
    fail(
      `Engine-screen CSS contains forbidden pattern: ${forbidden}`
    );
  }
}

const selectors =
  extractSelectors(source.css);

for (const selector of selectors) {
  if (
    !selector.startsWith(
      ".metaos-ui"
    )
  ) {
    fail(
      `Engine-screen selector is not scoped under .metaos-ui: ${selector}`
    );
  }
}

for (const selector of [
  ".metaos-ui .mos-funnel-stage-grid",
  ".metaos-ui .mos-funnel-period",
  ".metaos-ui .mos-funnel-highlight-grid",
  ".metaos-ui .mos-detail-layout",
  ".metaos-ui .mos-threshold-controls",
]) {
  if (!source.css.includes(selector)) {
    fail(
      `Engine-screen CSS selector is missing: ${selector}`
    );
  }
}

const importOrder = [
  '@import "./primitives.css";',
  '@import "./table.css";',
  '@import "./engine-screens.css";',
  '@import "./shell.css";',
];

let lastPosition = -1;

for (const token of importOrder) {
  const position =
    source.cssEntry.indexOf(
      token
    );

  if (position < 0) {
    fail(
      `Workspace CSS is missing: ${token}`
    );
  }

  if (position < lastPosition) {
    fail(
      "Engine-screen stylesheet import order is invalid."
    );
  }

  lastPosition = position;
}

if (process.exitCode) {
  console.error("");
  console.error(
    "MetaOS engine-screen migration audit failed."
  );

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Protected Engine Screen Migration Audit"
);
console.log(
  "=============================================="
);
console.log(
  "✅ Command Center uses the protected V2 command engine."
);
console.log(
  "✅ Data QC uses the protected V2 QC engine."
);
console.log(
  "✅ Data QC retains source-row flags and CSV export."
);
console.log(
  "✅ Zero Purchase uses the protected V2 waste engine."
);
console.log(
  "✅ Zero Purchase retains threshold and clipboard controls."
);
console.log(
  "✅ Funnel uses the protected V2 month/week engine."
);
console.log(
  "✅ Funnel retains month expansion and complete stage metrics."
);
console.log(
  "✅ All four protected screens use architecture-owned modules."
);
console.log(
  "✅ No duplicated backend formulas."
);
console.log(
  `✅ Scoped screen selectors inspected: ${selectors.length}`
);
console.log(
  "✅ No gradients, blue dependency, broad selectors or !important."
);
console.log(
  "✅ Protected engine-screen migration: PASS"
);
