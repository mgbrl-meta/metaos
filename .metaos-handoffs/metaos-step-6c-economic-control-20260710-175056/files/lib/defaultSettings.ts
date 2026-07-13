import { MetaSettings } from "@/types/meta";

export const defaultMetaSettings: MetaSettings = {
  targetRoas: 2.5,
  targetCpa: 500,
  grossMarginPct: 65,
  targetContributionMarginPct: 20,
  targetAov: 1200,

  minSpendForDecision: 1500,
  minPurchasesForScale: 3,
  minClicksForAnalysis: 100,
  minImpressionsForCtrConfidence: 5000,

  killThresholdCpaMultiple: 1.5,
  strongScaleRoasBufferPct: 20,

  normalScaleIncreasePct: 10,
  strongScaleIncreasePct: 20,
  budgetReductionPct: 20,
  maxDailyBudgetIncreasePct: 25,
  testingBudgetAllocationPct: 15,
  maxSpendPerTestAd: 2000,

  maxHealthyFrequency: 3.5,
  ctrDropThresholdPct: 25,
  cpmIncreaseThresholdPct: 30,
  cpaIncreaseThresholdPct: 25,
  fatigueLookbackDays: 7,

  targetCtrPct: 1.5,
  targetClickToLpvRatePct: 70,
  targetLpvToAtcRatePct: 8,
  targetAtcToCheckoutRatePct: 40,
  targetCheckoutToPurchaseRatePct: 35,

  analysisMode: "incremental_efficiency_scale",
};