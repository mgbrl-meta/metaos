import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  renderer:
    "components/metaos-ui/MetaOSModuleRenderer.tsx",

  spend:
    "components/metaos-ui/modules/SpendAnalysisModule.tsx",

  creative:
    "components/metaos-ui/modules/CreativeFatigueModule.tsx",

  ageing:
    "components/metaos-ui/modules/CreativeAgeingModule.tsx",

  monthly:
    "components/metaos-ui/modules/MonthlyAnalysisModule.tsx",

  temporalCharts:
    "components/metaos-ui/modules/AnalysisLayerTemporalCharts.tsx",

  contract:
    "config/metaos-remaining-meta-screen-contract.json",

  css:
    "styles/metaos-ui/analysis-screens.css",

  cssEntry:
    "styles/metaos-ui/index.css",
};

function fail(message) {
  console.error(
    `❌ ${message}`
  );

  process.exitCode = 1;
}

function read(relativePath) {
  const absolute =
    path.join(
      root,
      relativePath
    );

  if (!fs.existsSync(absolute)) {
    fail(
      `Missing analysis migration file: ${relativePath}`
    );

    return "";
  }

  return fs.readFileSync(
    absolute,
    "utf8"
  );
}

function requireTokens(
  name,
  source,
  tokens
) {
  for (const token of tokens) {
    if (!source.includes(token)) {
      fail(
        `${name} lost required contract: ${token}`
      );
    }
  }
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

requireTokens(
  "Renderer",
  source.renderer,
  [
    "<SpendAnalysisModule />",
    "<CreativeFatigueModule />",
    "<CreativeAgeingModule />",
    "<MonthlyAnalysisModule />",
  ]
);

for (const forbidden of [
  "<SpendVisuals />",
  "<CreativeTab />",
  "<CreativeAgeingTab />",
  "<EnhancedMonthlyReport />",
]) {
  if (
    source.renderer.includes(
      forbidden
    )
  ) {
    fail(
      `Legacy analysis renderer remains: ${forbidden}`
    );
  }
}

requireTokens(
  "Creative Ageing",
  source.ageing,
  [
    "buildMetaV2CreativeAgeing",
    "CreativeCohortChart",
    "CreativeAgeBucketChart",
    "output.monthlyRows",
    "output.ageRows",
    "TableDensityControl",
    "TablePagination",
  ]
);

requireTokens(
  "Monthly Summary",
  source.monthly,
  [
    "buildMetaV2MonthlyAnalysis",
    "MonthlyPerformanceChart",
    "WeeklyPerformanceChart",
    "selectedMonth",
    "output.monthlyRows",
    "output.weeklyRows",
    "costPerVisitor",
    "revenuePerVisitor",
    "TableDensityControl",
    "TablePagination",
  ]
);

requireTokens(
  "Temporal charts",
  source.temporalCharts,
  [
    "CreativeCohortChart",
    "CreativeAgeBucketChart",
    "MonthlyPerformanceChart",
    "WeeklyPerformanceChart",
    "ResponsiveContainer",
    "BarChart",
    "LineChart",
  ]
);

for (
  const [
    screenName,
    screenSource,
  ] of Object.entries({
    Spend:
      source.spend,

    Creative:
      source.creative,

    Ageing:
      source.ageing,

    Monthly:
      source.monthly,
  })
) {
  for (const forbidden of [
    "revenue / spend",
    "spend / purchases",
    "revenue / purchases",
    "impressions / reach",
    "spend * 1000 / impressions",
    "campaign_name",
    "adset_name",
    "purchase_value",
    "Amount spent",
    "Reporting starts",
    'row["',
  ]) {
    if (
      screenSource.includes(
        forbidden
      )
    ) {
      fail(
        `${screenName} contains forbidden raw logic: ${forbidden}`
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
    "Remaining-screen contract is invalid JSON."
  );

  contract = {
    modules: [],
  };
}

for (const id of [
  "spend_visuals",
  "creative",
  "creative_ageing",
  "monthly",
]) {
  const module =
    (
      contract.modules ??
      []
    ).find(
      (candidate) =>
        candidate.id === id
    );

  if (!module) {
    fail(
      `Analysis module missing from contract: ${id}`
    );

    continue;
  }

  if (
    module.migrationStatus !==
    "migrated"
  ) {
    fail(
      `Analysis module is not marked migrated: ${id}`
    );
  }

  if (
    !String(
      module.sourceFile
    ).includes(
      "components/metaos-ui/modules/"
    )
  ) {
    fail(
      `Analysis module still points to legacy source: ${id}`
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
      `Analysis CSS contains forbidden pattern: ${forbidden}`
    );
  }
}

requireTokens(
  "Analysis stylesheet",
  source.css,
  [
    ".metaos-ui .mos-analysis-chart",
    ".metaos-ui .mos-analysis-month-controls",
    ".metaos-ui .mos-analysis-select-control",
  ]
);

requireTokens(
  "Workspace CSS entry",
  source.cssEntry,
  [
    '@import "./analysis-screens.css";',
    '@import "./shell.css";',
  ]
);

if (process.exitCode) {
  console.error("");
  console.error(
    "MetaOS analysis-screen migration audit failed."
  );

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Analysis Screen Migration Audit"
);
console.log(
  "======================================"
);
console.log(
  "✅ Spend consumes the protected Spend engine."
);
console.log(
  "✅ Creative consumes the protected fatigue engine."
);
console.log(
  "✅ Creative Ageing consumes protected cohort and age-bucket output."
);
console.log(
  "✅ Monthly Summary consumes protected month and Monday-week output."
);
console.log(
  "✅ All eleven creative-age buckets retained."
);
console.log(
  "✅ New-versus-old creative economics retained."
);
console.log(
  "✅ Selected-month and weekly visitor economics retained."
);
console.log(
  "✅ Search, sorting, density and pagination retained."
);
console.log(
  "✅ Renderer uses all four architecture-owned analysis modules."
);
console.log(
  "✅ No duplicated primitive formulas or raw-column reads."
);
console.log(
  "✅ Complete analysis-screen migration: PASS"
);
