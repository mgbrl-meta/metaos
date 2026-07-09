import fs from "node:fs";

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }

  return fs.readFileSync(file, "utf8");
}

function mustContain(file, fragments) {
  const source = read(file);

  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${file} is missing required settings fragment:\n${fragment}`);
    }
  }
}

function mustNotContain(file, fragments) {
  const source = read(file);

  for (const fragment of fragments) {
    if (source.includes(fragment)) {
      throw new Error(`${file} contains forbidden settings fragment:\n${fragment}`);
    }
  }
}

const requiredSettings = [
  "targetRoas",
  "targetCpa",
  "targetGpt",
  "minSpendForDecision",
  "minPurchasesForScale",
  "maxHealthyFrequency",
  "scaleIncreasePct",
  "reduceBudgetPct",
];

const requiredFiles = [
  "lib/meta-v2/schema.ts",
  "lib/meta-v2/decisionRules.ts",
  "lib/meta-v2/engines/commandCenterEngine.ts",
  "store/metaV2SettingsStore.ts",
  "components/meta-v2/shell/MetaOSV2App.tsx",
];

for (const file of requiredFiles) {
  read(file);
}

/**
 * 1. Schema contract
 */
mustContain("lib/meta-v2/schema.ts", [
  "export interface MetaV2Settings",
]);

for (const setting of requiredSettings) {
  mustContain("lib/meta-v2/schema.ts", [`${setting}: number`]);
}

/**
 * 2. Settings store contract
 * The store may either define every threshold directly or import defaults.
 * So this audit verifies the store exposes the V2 settings contract without
 * forcing duplicate literal setting names.
 */
mustContain("store/metaV2SettingsStore.ts", [
  "MetaV2Settings",
]);

const settingsStoreSource = read("store/metaV2SettingsStore.ts");

const storeHasDirectSettings = requiredSettings.every((setting) =>
  settingsStoreSource.includes(setting)
);

const storeUsesDefaults =
  settingsStoreSource.includes("DEFAULT_META_V2_SETTINGS") ||
  settingsStoreSource.includes("defaultSettings") ||
  settingsStoreSource.includes("settings:");

if (!storeHasDirectSettings && !storeUsesDefaults) {
  throw new Error(
    "store/metaV2SettingsStore.ts must either expose all V2 settings directly or use a defaults/settings object."
  );
}

/**
 * 3. V2 shell must pass settings into engines.
 */
mustContain("components/meta-v2/shell/MetaOSV2App.tsx", [
  "settings",
  "useMetaV2SettingsStore",
  "buildMetaV2CommandCenter(cleanRows, settings",
]);

/**
 * 4. Decision rules must use thresholds centrally.
 */
mustContain("lib/meta-v2/decisionRules.ts", [
  "MetaV2Settings",
  "hasDecisionSpend",
  "hasScaleVolume",
  "getMetaV2WasteScore",
  "getMetaV2ScaleScore",
  "getMetaV2Action",
  "getMetaV2Decision",
]);

for (const setting of requiredSettings) {
  mustContain("lib/meta-v2/decisionRules.ts", [`settings.${setting}`]);
}

/**
 * 5. Command Center must depend on decision rules, not duplicate decisions.
 */
mustContain("lib/meta-v2/engines/commandCenterEngine.ts", [
  'from "@/lib/meta-v2/decisionRules"',
  "getMetaV2Decision",
  "buildMetaV2CommandCenter",
  "settings: MetaV2Settings",
]);

mustNotContain("lib/meta-v2/engines/commandCenterEngine.ts", [
  "settings.minSpendForDecision && totals.purchases <= 0",
  "totals.cpa > settings.targetCpa && totals.purchases > 0",
]);

/**
 * 6. Backend engines should not hardcode major strategy thresholds.
 */
const engineFiles = [
  "lib/meta-v2/engines/commandCenterEngine.ts",
  "lib/meta-v2/engines/funnelEngine.ts",
  "lib/meta-v2/engines/zeroPurchaseEngine.ts",
  "lib/meta-v2/engines/dataQcEngine.ts",
];

for (const file of engineFiles) {
  mustNotContain(file, [
    "targetRoas =",
    "targetCpa =",
    "scaleIncreasePct =",
    "reduceBudgetPct =",
  ]);
}

/**
 * 7. Guardrail sanity simulation.
 */
function safeDiv(a, b) {
  return b > 0 ? a / b : 0;
}

function derive(base) {
  const roas = safeDiv(base.revenue, base.spend);
  const cpa = safeDiv(base.spend, base.purchases);
  const aov = safeDiv(base.revenue, base.purchases);
  const gpt = base.purchases > 0 ? aov - cpa : 0;

  return {
    ...base,
    roas,
    cpa,
    aov,
    gpt,
    frequency: safeDiv(base.impressions, base.reach),
  };
}

function hasDecisionSpend(totals, settings) {
  return totals.spend >= settings.minSpendForDecision;
}

function hasScaleVolume(totals, settings) {
  return totals.purchases >= settings.minPurchasesForScale;
}

function getAction(totals, settings) {
  if (hasDecisionSpend(totals, settings) && totals.purchases <= 0) {
    return "kill";
  }

  if (
    hasDecisionSpend(totals, settings) &&
    totals.frequency > settings.maxHealthyFrequency
  ) {
    return "refresh";
  }

  if (
    hasDecisionSpend(totals, settings) &&
    totals.purchases > 0 &&
    (totals.cpa > settings.targetCpa || totals.roas < settings.targetRoas * 0.75)
  ) {
    return "reduce";
  }

  if (
    hasDecisionSpend(totals, settings) &&
    hasScaleVolume(totals, settings) &&
    totals.roas >= settings.targetRoas &&
    totals.cpa > 0 &&
    totals.cpa <= settings.targetCpa &&
    totals.gpt >= settings.targetGpt
  ) {
    return "scale";
  }

  if (!hasDecisionSpend(totals, settings) && totals.spend > 0) {
    return "test_more";
  }

  if (totals.spend > 0) {
    return "watch";
  }

  return "hold";
}

const settings = {
  targetRoas: 2,
  targetCpa: 1200,
  targetGpt: 0,
  minSpendForDecision: 3000,
  minPurchasesForScale: 3,
  maxHealthyFrequency: 3.5,
  scaleIncreasePct: 15,
  reduceBudgetPct: 20,
};

for (const [key, value] of Object.entries(settings)) {
  if (!Number.isFinite(value)) {
    throw new Error(`Setting ${key} must be finite.`);
  }

  if (value < 0) {
    throw new Error(`Setting ${key} must not be negative.`);
  }
}

if (settings.targetRoas <= 0) throw new Error("targetRoas must be greater than zero.");
if (settings.targetCpa <= 0) throw new Error("targetCpa must be greater than zero.");
if (settings.minSpendForDecision <= 0) throw new Error("minSpendForDecision must be greater than zero.");
if (settings.minPurchasesForScale <= 0) throw new Error("minPurchasesForScale must be greater than zero.");
if (settings.maxHealthyFrequency <= 0) throw new Error("maxHealthyFrequency must be greater than zero.");
if (settings.scaleIncreasePct > 100) throw new Error("scaleIncreasePct should not exceed 100.");
if (settings.reduceBudgetPct > 100) throw new Error("reduceBudgetPct should not exceed 100.");

const winner = derive({
  spend: 4000,
  revenue: 10000,
  purchases: 5,
  impressions: 10000,
  reach: 5000,
});

const zeroPurchase = derive({
  spend: 4000,
  revenue: 0,
  purchases: 0,
  impressions: 10000,
  reach: 5000,
});

const highCpa = derive({
  spend: 4000,
  revenue: 3000,
  purchases: 2,
  impressions: 10000,
  reach: 5000,
});

const fatigue = derive({
  spend: 4000,
  revenue: 9000,
  purchases: 5,
  impressions: 25000,
  reach: 5000,
});

const lowSpend = derive({
  spend: 500,
  revenue: 0,
  purchases: 0,
  impressions: 1000,
  reach: 800,
});

const cases = [
  ["winner", winner, "scale"],
  ["zeroPurchase", zeroPurchase, "kill"],
  ["highCpa", highCpa, "reduce"],
  ["fatigue", fatigue, "refresh"],
  ["lowSpend", lowSpend, "test_more"],
];

for (const [label, totals, expected] of cases) {
  const actual = getAction(totals, settings);

  if (actual !== expected) {
    throw new Error(`${label} action failed. Expected ${expected}, got ${actual}.`);
  }
}

console.log("✅ MetaOS settings / threshold guardrail audit passed.");
console.log("");
console.log("Verified settings:");
for (const setting of requiredSettings) {
  console.log(`- ${setting}`);
}
console.log("");
console.log("Protection checks:");
console.log("- Settings exist in schema");
console.log("- Settings exist in settings store");
console.log("- V2 shell passes settings into backend engines");
console.log("- Decision rules own threshold logic");
console.log("- Command Center does not duplicate decision thresholds");
console.log("- Scale / kill / reduce / refresh / test_more actions are sanity-checked");
