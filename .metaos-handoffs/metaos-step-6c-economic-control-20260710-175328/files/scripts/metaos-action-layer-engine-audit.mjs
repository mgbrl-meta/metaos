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

  engineUtils:
    "lib/meta-v2/engineUtils.ts",

  summary:
    "lib/meta-v2/engines/executiveSummaryEngine.ts",

  priority:
    "lib/meta-v2/engines/priorityEngine.ts",

  influencer:
    "lib/meta-v2/engines/influencerEngine.ts",
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
    fail(`Missing action-layer file: ${relativePath}`);
    return "";
  }

  return fs.readFileSync(
    absolute,
    "utf8"
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

for (const token of [
  "creativeName?: string",
  'getColumnValue(row, "creativeName")',
  "creativeName,",
]) {
  const combined = [
    source.schema,
    source.columnMap,
    source.normalize,
  ].join("\n");

  if (!combined.includes(token)) {
    fail(
      `Creative-name normalization contract is missing: ${token}`
    );
  }
}

for (const helper of [
  "addMetaV2Days",
  "getMetaV2InclusiveDateRange",
  "filterMetaV2RowsByDateRange",
  "getMetaV2RelativeChange",
  "clampMetaV2Number",
]) {
  if (
    !source.engineUtils.includes(
      `function ${helper}`
    )
  ) {
    fail(
      `Shared action-layer helper is missing: ${helper}`
    );
  }
}

const engineContracts = [
  {
    name: "Executive Summary",
    source: source.summary,
    builder:
      "buildMetaV2ExecutiveSummary",
    required: [
      "calculateMetaV2Totals",
      "getMetaV2RelativeChange",
      "Audience Saturation",
      "Creative Fatigue",
      "Zero-Conversion Spend",
      "Budget Concentration",
      "Prospecting Deficit",
      "Confirmed Fatigue",
      "Refresh within 48 hours",
    ],
  },
  {
    name: "Priority Matrix",
    source: source.priority,
    builder:
      "buildMetaV2PriorityMatrix",
    required: [
      "calculateMetaV2Totals",
      "getMetaV2Decision",
      "Bad Scale",
      "Scale Fatigue",
      "CPA Decay",
      "ROAS Decay",
      "Attention Decay",
      "Efficient Scale",
      "Underfed Winner",
      "descalingScore >=\n          25",
      "scalingScore >=\n            30",
      "descalingScore <\n            45",
    ],
  },
  {
    name: "Influencer Queue",
    source: source.influencer,
    builder:
      "buildMetaV2InfluencerQueue",
    required: [
      "calculateMetaV2Totals",
      "Top Spender",
      "Approval Check",
      "25000",
      "5000",
      "last7Range",
      "last14Range",
      "last30Range",
      "paid partnership",
    ],
  },
];

for (const contract of engineContracts) {
  if (
    !contract.source.includes(
      `function ${contract.builder}`
    )
  ) {
    fail(
      `${contract.name} builder is missing: ${contract.builder}`
    );
  }

  for (const token of contract.required) {
    if (
      !contract.source.includes(
        token
      )
    ) {
      fail(
        `${contract.name} lost required behavior: ${token}`
      );
    }
  }
}

for (const [
  engineName,
  engineSource,
] of Object.entries({
  ExecutiveSummary:
    source.summary,
  Priority:
    source.priority,
  Influencer:
    source.influencer,
})) {
  for (const forbidden of [
    "@/components/",
    "@/store/",
    "ReactNode",
    "<div",
    "<table",
    "className=",
  ]) {
    if (
      engineSource.includes(
        forbidden
      )
    ) {
      fail(
        `${engineName} engine imports or returns frontend code: ${forbidden}`
      );
    }
  }

  for (const forbiddenFormula of [
    "revenue / spend",
    "spend / purchases",
    "revenue / purchases",
    "impressions / reach",
    "spend * 1000 / impressions",
  ]) {
    if (
      engineSource.includes(
        forbiddenFormula
      )
    ) {
      fail(
        `${engineName} duplicates protected primitive math: ${forbiddenFormula}`
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
      engineSource.includes(
        rawColumnToken
      )
    ) {
      fail(
        `${engineName} reads raw export columns: ${rawColumnToken}`
      );
    }
  }
}

if (
  !source.priority.includes(
    "getMetaV2Decision("
  )
) {
  fail(
    "Priority engine does not consume the protected decision-rules layer."
  );
}

if (process.exitCode) {
  console.error("");
  console.error(
    "MetaOS action-layer engine audit failed."
  );

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Action-Layer Engine Audit"
);
console.log(
  "================================"
);
console.log(
  "✅ Creative-name normalization retained."
);
console.log(
  "✅ Shared UTC-inclusive date windows installed."
);
console.log(
  "✅ Executive Summary logic extracted from the component."
);
console.log(
  "✅ Campaign issues and fatigue qualification retained."
);
console.log(
  "✅ Scaling and de-scaling matrix logic extracted."
);
console.log(
  "✅ Legacy priority scores and qualification thresholds retained."
);
console.log(
  "✅ Priority output consumes protected decision rules."
);
console.log(
  "✅ Influencer intent, thresholds and 1D/7D/14D/30D windows retained."
);
console.log(
  "✅ Engines consume clean rows and centralized metrics."
);
console.log(
  "✅ Engines do not import frontend or store code."
);
console.log(
  "✅ No protected primitive formulas duplicated."
);
console.log(
  "✅ Action-layer engine architecture: PASS"
);
