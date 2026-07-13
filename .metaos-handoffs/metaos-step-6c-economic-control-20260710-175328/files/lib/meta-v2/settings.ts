import type { MetaV2Settings } from "@/lib/meta-v2/schema";

export const defaultMetaV2Settings: MetaV2Settings = {
  targetRoas: 2,
  targetCpa: 1200,
  targetGpt: 0,
  grossMarginPct: 65,
  minSpendForDecision: 3000,
  minPurchasesForScale: 3,
  maxHealthyFrequency: 3.5,
  scaleIncreasePct: 15,
  reduceBudgetPct: 20,
};
