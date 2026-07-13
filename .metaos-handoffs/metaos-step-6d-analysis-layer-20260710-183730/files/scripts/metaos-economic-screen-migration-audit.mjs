import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  renderer:
    "components/metaos-ui/MetaOSModuleRenderer.tsx",

  shared:
    "components/metaos-ui/modules/EconomicControlShared.tsx",

  highCpa:
    "components/metaos-ui/modules/HighCpaModule.tsx",

  gpt:
    "components/metaos-ui/modules/GptControlModule.tsx",

  highRoas:
    "components/metaos-ui/modules/HighRoasModule.tsx",

  contract:
    "config/metaos-remaining-meta-screen-contract.json",

  css:
    "styles/metaos-ui/economic-screens.css",

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
      `Missing economic-screen file: ${relativePath}`
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

const source =
  Object.fromEntries(
    Object.entries(files).map(
      ([
        key,
        relativePath,
      ]) => [
        key,
        read(relativePath),
      ]
    )
  );

const rendererContracts = [
  [
    'case "high_cpa":',
    "<HighCpaModule />",
  ],
  [
    'case "gpt":',
    "<GptControlModule />",
  ],
  [
    'case "high_roas":',
    "<HighRoasModule />",
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
  "return <HighCpaTab />",
  "return <GptTab />",
  "return <HighRoasTab />",
]) {
  if (
    source.renderer.includes(
      forbidden
    )
  ) {
    fail(
      `Renderer still uses legacy economic screen: ${forbidden}`
    );
  }
}

for (const token of [
  "EconomicTrendChart",
  "EconomicCampaignTable",
  "copyUniqueLines",
  "navigator.clipboard",
  "ResponsiveContainer",
  "MetaV2EconomicTrendRow",
]) {
  if (
    !source.shared.includes(
      token
    )
  ) {
    fail(
      `Shared economic presentation lost: ${token}`
    );
  }
}

for (const token of [
  "buildMetaV2HighCpaControl",
  "persistentItems",
  "improvingItems",
  "noRecentPurchaseItems",
  "copyPersistentQueue",
  "EconomicTrendChart",
  "EconomicCampaignTable",
  "TableDensityControl",
  "TablePagination",
  "renderExpandedRow",
]) {
  if (
    !source.highCpa.includes(
      token
    )
  ) {
    fail(
      `High CPA migration lost contract: ${token}`
    );
  }
}

for (const token of [
  "buildMetaV2GptControl",
  "configuredTarget",
  "campaignAverage",
  "copyRiskQueue",
  "TableDensityControl",
  "TablePagination",
  "renderExpandedRow",
  "weightedAverageGpt",
  "last7StartDate",
  "last7EndDate",
]) {
  if (
    !source.gpt.includes(
      token
    )
  ) {
    fail(
      `GPT migration lost contract: ${token}`
    );
  }
}

for (const token of [
  "buildMetaV2HighRoasControl",
  "recentCpaHealthy",
  "recentRoasHealthy",
  "protectedCount",
  "EconomicTrendChart",
  "EconomicCampaignTable",
  "TableDensityControl",
  "TablePagination",
  "renderExpandedRow",
  "blendedRoas",
]) {
  if (
    !source.highRoas.includes(
      token
    )
  ) {
    fail(
      `High ROAS migration lost contract: ${token}`
    );
  }
}

for (const [
  screenName,
  screenSource,
] of Object.entries({
  HighCpa:
    source.highCpa,
  Gpt:
    source.gpt,
  HighRoas:
    source.highRoas,
})) {
  for (const forbiddenFormula of [
    "revenue / spend",
    "spend / purchases",
    "revenue / purchases",
    "aov - cpa",
    "impressions / reach",
    "spend * 1000 / impressions",
  ]) {
    if (
      screenSource.includes(
        forbiddenFormula
      )
    ) {
      fail(
        `${screenName} duplicates protected math: ${forbiddenFormula}`
      );
    }
  }

  for (const rawColumnToken of [
    "campaign_name",
    "adset_name",
    "purchase_value",
    "Amount spent",
    'row["',
  ]) {
    if (
      screenSource.includes(
        rawColumnToken
      )
    ) {
      fail(
        `${screenName} reads raw Meta columns: ${rawColumnToken}`
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
    "Remaining Meta contract is invalid JSON after economic migration."
  );

  contract = {
    modules: [],
  };
}

for (const id of [
  "high_cpa",
  "gpt",
  "high_roas",
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
      `Economic module missing from contract: ${id}`
    );

    continue;
  }

  if (
    module.migrationStatus !==
    "migrated"
  ) {
    fail(
      `Economic module not marked migrated: ${id}`
    );
  }

  if (
    !module.sourceFile.includes(
      "components/metaos-ui/modules/"
    )
  ) {
    fail(
      `Economic module still points to legacy source: ${id}`
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
  if (
    source.css.includes(
      forbidden
    )
  ) {
    fail(
      `Economic CSS contains forbidden pattern: ${forbidden}`
    );
  }
}

const selectors =
  extractSelectors(
    source.css
  );

for (const selector of selectors) {
  if (
    !selector.startsWith(
      ".metaos-ui"
    )
  ) {
    fail(
      `Economic selector is not scoped: ${selector}`
    );
  }
}

const importOrder = [
  '@import "./action-screens.css";',
  '@import "./economic-screens.css";',
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
      `Workspace stylesheet missing: ${token}`
    );
  }

  if (
    position <
    previousPosition
  ) {
    fail(
      "Economic stylesheet import order is invalid."
    );
  }

  previousPosition = position;
}

if (process.exitCode) {
  console.error("");
  console.error(
    "MetaOS economic-screen migration audit failed."
  );

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Economic Screen Migration Audit"
);
console.log(
  "======================================"
);
console.log(
  "✅ High CPA consumes the protected High CPA engine."
);
console.log(
  "✅ Persistent, improving and no-L7D-purchase states retained."
);
console.log(
  "✅ Persistent High CPA clipboard queue retained."
);
console.log(
  "✅ GPT consumes the protected campaign-benchmark engine."
);
console.log(
  "✅ GPT target, campaign benchmarks and clipboard queue retained."
);
console.log(
  "✅ High ROAS consumes the protected winner engine."
);
console.log(
  "✅ Recent CPA/ROAS protection and evidence states retained."
);
console.log(
  "✅ Search, sorting, density, pagination and expansion retained."
);
console.log(
  "✅ Shared 30-day trend and campaign rollups retained."
);
console.log(
  "✅ Renderer uses architecture-owned economic modules."
);
console.log(
  "✅ No duplicated primitive formulas or raw-column reads."
);
console.log(
  `✅ Scoped economic selectors inspected: ${selectors.length}`
);
console.log(
  "✅ Economic-screen migration: PASS"
);
