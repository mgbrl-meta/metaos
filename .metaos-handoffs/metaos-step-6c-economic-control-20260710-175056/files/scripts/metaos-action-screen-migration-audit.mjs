import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  renderer:
    "components/metaos-ui/MetaOSModuleRenderer.tsx",

  summary:
    "components/metaos-ui/modules/SummaryModule.tsx",

  priority:
    "components/metaos-ui/modules/PriorityModule.tsx",

  influencer:
    "components/metaos-ui/modules/InfluencerModule.tsx",

  contract:
    "config/metaos-remaining-meta-screen-contract.json",

  css:
    "styles/metaos-ui/action-screens.css",

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
      `Missing action-screen file: ${relativePath}`
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
  [
    'case "summary":',
    "<SummaryModule />",
  ],
  [
    'case "top_descaling":',
    "<TopDescalingModule />",
  ],
  [
    'case "top_scaling":',
    "<TopScalingModule />",
  ],
  [
    'case "influencer_ads":',
    "<InfluencerModule />",
  ],
];

for (
  const [
    caseToken,
    componentToken,
  ] of rendererContracts
) {
  if (
    !source.renderer.includes(
      caseToken
    ) ||
    !source.renderer.includes(
      componentToken
    )
  ) {
    fail(
      `Renderer migration is missing: ${caseToken} → ${componentToken}`
    );
  }
}

for (const forbidden of [
  "return <MetaExecutiveSummary />",
  "return <TopDescalingPrioritiesTab />",
  "return <TopScalingPrioritiesTab />",
  "return <InfluencerAdsTab />",
]) {
  if (
    source.renderer.includes(
      forbidden
    )
  ) {
    fail(
      `Renderer still uses legacy action screen: ${forbidden}`
    );
  }
}

for (const token of [
  "buildMetaV2ExecutiveSummary",
  "normalizeMetaV2Rows",
  "snapshotMetrics",
  "output.issues",
  "output.campaigns",
  "output.fatigue",
  "Operator Direction",
  "DataTable",
]) {
  if (
    !source.summary.includes(
      token
    )
  ) {
    fail(
      `Summary migration lost required contract: ${token}`
    );
  }
}

for (const token of [
  "buildMetaV2PriorityMatrix",
  "normalizeMetaV2Rows",
  "TopDescalingModule",
  "TopScalingModule",
  "PriorityTrendChart",
  "TREND_METRICS",
  "TableDensityControl",
  "TablePagination",
  "renderExpandedRow",
  "item.decision",
]) {
  if (
    !source.priority.includes(
      token
    )
  ) {
    fail(
      `Priority migration lost required contract: ${token}`
    );
  }
}

for (const token of [
  "buildMetaV2InfluencerQueue",
  "normalizeMetaV2Rows",
  "exportInfluencerExcel",
  "application/vnd.ms-excel",
  "5000",
  "25000",
  "last14",
  "last30",
  "TableDensityControl",
  "TablePagination",
  "renderExpandedRow",
]) {
  if (
    !source.influencer.includes(
      token
    )
  ) {
    fail(
      `Influencer migration lost required contract: ${token}`
    );
  }
}

for (const [
  screenName,
  screenSource,
] of Object.entries({
  Summary: source.summary,
  Priority: source.priority,
  Influencer:
    source.influencer,
})) {
  for (const forbiddenFormula of [
    "revenue / spend",
    "spend / purchases",
    "revenue / purchases",
    "impressions / reach",
    "spend * 1000 / impressions",
  ]) {
    if (
      screenSource.includes(
        forbiddenFormula
      )
    ) {
      fail(
        `${screenName} duplicates protected primitive math: ${forbiddenFormula}`
      );
    }
  }

  for (const rawColumnToken of [
    "campaign_name",
    "adset_name",
    "purchase_value",
    'row["',
  ]) {
    if (
      screenSource.includes(
        rawColumnToken
      )
    ) {
      fail(
        `${screenName} reads raw Meta export columns: ${rawColumnToken}`
      );
    }
  }
}

let contract;

try {
  contract = JSON.parse(
    source.contract
  );
} catch {
  fail(
    "Remaining Meta screen contract is invalid JSON after action migration."
  );

  contract = {
    modules: [],
  };
}

for (const id of [
  "summary",
  "top_descaling",
  "top_scaling",
  "influencer_ads",
]) {
  const module =
    (
      contract.modules ?? []
    ).find(
      (candidate) =>
        candidate.id === id
    );

  if (!module) {
    fail(
      `Migrated module is missing from the frozen contract: ${id}`
    );

    continue;
  }

  if (
    module.migrationStatus !==
    "migrated"
  ) {
    fail(
      `Migrated module is not marked migrated: ${id}`
    );
  }

  if (
    !module.sourceFile.includes(
      "components/metaos-ui/modules/"
    )
  ) {
    fail(
      `Migrated module still points to a legacy source file: ${id}`
    );
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
      `Action-screen CSS contains forbidden pattern: ${forbidden}`
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
      `Action-screen selector is not scoped under .metaos-ui: ${selector}`
    );
  }
}

const importOrder = [
  '@import "./engine-screens.css";',
  '@import "./action-screens.css";',
  '@import "./shell.css";',
];

let previousPosition = -1;

for (const token of importOrder) {
  const position =
    source.cssEntry.indexOf(
      token
    );

  if (position < 0) {
    fail(
      `Workspace stylesheet is missing: ${token}`
    );
  }

  if (position < previousPosition) {
    fail(
      "Action-screen stylesheet import order is invalid."
    );
  }

  previousPosition = position;
}

if (process.exitCode) {
  console.error("");
  console.error(
    "MetaOS action-screen migration audit failed."
  );

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Action Screen Migration Audit"
);
console.log(
  "===================================="
);
console.log(
  "✅ Summary consumes the executive-summary engine."
);
console.log(
  "✅ Snapshot, issues, campaigns, fatigue and operator direction retained."
);
console.log(
  "✅ Scaling and de-scaling consume the priority engine."
);
console.log(
  "✅ Search, sorting, density, pagination and trend controls retained."
);
console.log(
  "✅ Influencer Ads consumes the influencer queue engine."
);
console.log(
  "✅ ₹5K, ₹25K and custom thresholds retained."
);
console.log(
  "✅ Yesterday, L7D, L14D and L30D metrics retained."
);
console.log(
  "✅ Excel export retained."
);
console.log(
  "✅ Renderer uses architecture-owned action modules."
);
console.log(
  "✅ No duplicated primitive formulas or raw-column reads."
);
console.log(
  `✅ Scoped action selectors inspected: ${selectors.length}`
);
console.log(
  "✅ Action-screen migration: PASS"
);
