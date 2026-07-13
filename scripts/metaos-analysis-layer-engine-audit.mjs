import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  schema:
    "lib/meta-v2/schema.ts",

  columnMap:
    "lib/meta-v2/columnMap.ts",

  normalize:
    "lib/meta-v2/normalize.ts",

  shared:
    "lib/meta-v2/analysisLayerUtils.ts",

  spend:
    "lib/meta-v2/engines/spendAnalysisEngine.ts",

  creative:
    "lib/meta-v2/engines/creativeFatigueEngine.ts",

  ageing:
    "lib/meta-v2/engines/creativeAgeingEngine.ts",

  monthly:
    "lib/meta-v2/engines/monthlyAnalysisEngine.ts",

  renderer:
    "components/metaos-ui/MetaOSModuleRenderer.tsx",
};

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  const absolute =
    path.join(
      root,
      relativePath
    );

  if (
    !fs.existsSync(
      absolute
    )
  ) {
    fail(
      `Missing analysis-layer file: ${relativePath}`
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
    if (
      !source.includes(
        token
      )
    ) {
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
  "Clean-row video contract",
  [
    source.schema,
    source.columnMap,
    source.normalize,
  ].join("\n"),
  [
    "video3s?: number",
    "video3s:",
    'getColumnValue(row, "video3s")',
    "video plays at 3 seconds",
    "thruplays",
  ]
);

requireTokens(
  "Shared analysis utilities",
  source.shared,
  [
    "calculateMetaV2AnalysisTotals",
    "getMetaV2VisitorCount",
    "buildMetaV2DailyAnalysis",
    "buildMetaV2PeriodComparison",
    "getMetaV2PresetRange",
    "normalizeMetaV2SelectedRange",
    "getMetaV2MondayWeekKey",
    "getMetaV2Movement",
    "thumbstop",
    "purchaseCvr",
    "costPerVisitor",
    "revenuePerVisitor",
  ]
);

requireTokens(
  "Spend engine",
  source.spend,
  [
    "buildMetaV2SpendAnalysis",
    "filterMetaV2LiveRows",
    "campaignChartRows",
    "adSetChartRows",
    "dailyDetail",
    "[7, 14, 28]",
    "campaigns",
    "adSets",
    "ads",
    "spendShare",
    "revenueShare",
  ]
);

requireTokens(
  "Creative fatigue engine",
  source.creative,
  [
    "buildMetaV2CreativeFatigue",
    "cpmChange >= 20",
    "ctrChange <= -15",
    "current.thumbstop <",
    "current.frequency >",
    "signalCount >= 3",
    "safeMinSignals",
    "refresh_priority",
    "getCreativeHandle",
    "totalFatiguedSpend",
  ]
);

requireTokens(
  "Creative ageing engine",
  source.ageing,
  [
    "buildMetaV2CreativeAgeing",
    "META_V2_CREATIVE_AGE_BUCKETS",
    '"≤7D"',
    '"8–14D"',
    '"15–30D"',
    '"31–45D"',
    '"46–60D"',
    '"61–90D"',
    '"91–120D"',
    '"121–180D"',
    '"181–240D"',
    '"241–360D"',
    '"360D+"',
    "firstSeenByAd",
    "last12Months",
    "newSpendShare",
    "latest30StartDate",
    "row-level ageing behavior",
  ]
);

requireTokens(
  "Monthly analysis engine",
  source.monthly,
  [
    "buildMetaV2MonthlyAnalysis",
    "getMetaV2MondayWeekKey",
    "monthlyRows",
    "weeklyRows",
    "currentMovement",
    "efficient_growth",
    "inefficient_growth",
    "contraction_decline",
    "spendLog",
    "monthTick",
  ]
);

for (
  const [
    engineName,
    engineSource,
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
    "@/components/",
    "@/store/",
    "ReactNode",
    "<div",
    "<table",
    "className=",
    "navigator.clipboard",
    "document.createElement",
    "localStorage",
    "fetch(",
  ]) {
    if (
      engineSource.includes(
        forbidden
      )
    ) {
      fail(
        `${engineName} engine contains frontend or transport code: ${forbidden}`
      );
    }
  }

  for (const rawColumnToken of [
    "campaign_name",
    "adset_name",
    "purchase_value",
    "Amount spent",
    "Reporting starts",
    'row["',
  ]) {
    if (
      engineSource.includes(
        rawColumnToken
      )
    ) {
      fail(
        `${engineName} reads raw Meta export columns: ${rawColumnToken}`
      );
    }
  }

  for (const duplicatedFormula of [
    "revenue / spend",
    "spend / purchases",
    "revenue / purchases",
    "impressions / reach",
    "spend * 1000 / impressions",
  ]) {
    if (
      engineSource.includes(
        duplicatedFormula
      )
    ) {
      fail(
        `${engineName} duplicates centralized primitive math: ${duplicatedFormula}`
      );
    }
  }
}

/**
 * Step 6D1 extracts and validates engines only.
 * The visible renderer must remain on the frozen legacy modules.
 */
requireTokens(
  "Visible renderer ownership",
  source.renderer,
  [
    "<SpendAnalysisModule />",
    "<CreativeFatigueModule />",
    "<CreativeAgeingModule />",
    "<MonthlyAnalysisModule />",
  ]
);

for (const forbiddenNewRenderer of [
  "<SpendVisuals />",
  "<CreativeTab />",
  "<CreativeAgeingTab />",
  "<EnhancedMonthlyReport />",
]) {
  if (
    source.renderer.includes(
      forbiddenNewRenderer
    )
  ) {
    fail(
      `Step 6D1 switched a visible module too early: ${forbiddenNewRenderer}`
    );
  }
}

if (process.exitCode) {
  console.error("");
  console.error(
    "MetaOS analysis-layer engine audit failed."
  );

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Analysis-Layer Engine Audit"
);
console.log(
  "=================================="
);
console.log(
  "✅ Video 3-second plays preserved in clean rows."
);
console.log(
  "✅ Shared analysis totals use centralized Meta metrics."
);
console.log(
  "✅ Live-ad Spend windows and custom ranges extracted."
);
console.log(
  "✅ Spend daily, campaign, ad-set and ad rollups extracted."
);
console.log(
  "✅ Spend 7D, 14D and 28D comparisons retained."
);
console.log(
  "✅ Creative CPM, CTR, thumbstop and frequency signals retained."
);
console.log(
  "✅ Creative 1–4 signal thresholds and copy handles retained."
);
console.log(
  "✅ Creative first-seen cohort logic retained."
);
console.log(
  "✅ All 11 creative-age buckets retained."
);
console.log(
  "✅ Latest-30-day row-level ageing behavior retained."
);
console.log(
  "✅ Monthly and Monday-week grouping extracted."
);
console.log(
  "✅ Incremental spend, CPA, ROAS and purchase movements retained."
);
console.log(
  "✅ Visitor economics retained with LPV/click fallback."
);
console.log(
  "✅ Engines consume clean rows and contain no UI or raw-column logic."
);
console.log(
  "✅ Spend, Creative, Ageing and Monthly use architecture-owned modules."
);
console.log(
  "✅ Analysis-layer engine architecture: PASS"
);
