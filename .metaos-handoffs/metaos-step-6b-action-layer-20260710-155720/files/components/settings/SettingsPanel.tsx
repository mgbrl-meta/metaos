"use client";

import { useMetaStore } from "@/store/metaStore";
import { GlassCard, MetaButton, MutedText, Surface } from "@/components/cards/MetaCards";

export function SettingsPanel() {
  const { settings, updateSettings, resetSettings } = useMetaStore();

  const updateNumber = (key: keyof typeof settings, value: string) => {
    updateSettings({ [key]: Number(value) });
  };

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0A84FF]">Settings</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">AI Brain Configuration</h1>
        <MutedText className="mt-2">Adjust targets, thresholds, fatigue rules and funnel benchmarks dynamically.</MutedText>
      </div>

      <Section title="Business Targets">
        <Field label="Target ROAS" value={settings.targetRoas} onChange={(v) => updateNumber("targetRoas", v)} />
        <Field label="Target CPA" value={settings.targetCpa} onChange={(v) => updateNumber("targetCpa", v)} />
        <Field label="Gross Margin %" value={settings.grossMarginPct} onChange={(v) => updateNumber("grossMarginPct", v)} />
        <Field label="Target Contribution Margin %" value={settings.targetContributionMarginPct} onChange={(v) => updateNumber("targetContributionMarginPct", v)} />
        <Field label="Target AOV" value={settings.targetAov} onChange={(v) => updateNumber("targetAov", v)} />
      </Section>

      <Section title="Decision Thresholds">
        <Field label="Minimum Spend for Decision" value={settings.minSpendForDecision} onChange={(v) => updateNumber("minSpendForDecision", v)} />
        <Field label="Minimum Purchases for Scale" value={settings.minPurchasesForScale} onChange={(v) => updateNumber("minPurchasesForScale", v)} />
        <Field label="Minimum Clicks for Analysis" value={settings.minClicksForAnalysis} onChange={(v) => updateNumber("minClicksForAnalysis", v)} />
        <Field label="Minimum Impressions for CTR Confidence" value={settings.minImpressionsForCtrConfidence} onChange={(v) => updateNumber("minImpressionsForCtrConfidence", v)} />
        <Field label="Kill Threshold CPA Multiple" value={settings.killThresholdCpaMultiple} onChange={(v) => updateNumber("killThresholdCpaMultiple", v)} />
        <Field label="Strong Scale ROAS Buffer %" value={settings.strongScaleRoasBufferPct} onChange={(v) => updateNumber("strongScaleRoasBufferPct", v)} />
      </Section>

      <Section title="Budget Rules">
        <Field label="Normal Scale Increase %" value={settings.normalScaleIncreasePct} onChange={(v) => updateNumber("normalScaleIncreasePct", v)} />
        <Field label="Strong Scale Increase %" value={settings.strongScaleIncreasePct} onChange={(v) => updateNumber("strongScaleIncreasePct", v)} />
        <Field label="Budget Reduction %" value={settings.budgetReductionPct} onChange={(v) => updateNumber("budgetReductionPct", v)} />
        <Field label="Max Daily Budget Increase %" value={settings.maxDailyBudgetIncreasePct} onChange={(v) => updateNumber("maxDailyBudgetIncreasePct", v)} />
        <Field label="Testing Budget Allocation %" value={settings.testingBudgetAllocationPct} onChange={(v) => updateNumber("testingBudgetAllocationPct", v)} />
        <Field label="Max Spend Per Test Ad" value={settings.maxSpendPerTestAd} onChange={(v) => updateNumber("maxSpendPerTestAd", v)} />
      </Section>

      <Section title="Creative Fatigue Rules">
        <Field label="Max Healthy Frequency" value={settings.maxHealthyFrequency} onChange={(v) => updateNumber("maxHealthyFrequency", v)} />
        <Field label="CTR Drop Threshold %" value={settings.ctrDropThresholdPct} onChange={(v) => updateNumber("ctrDropThresholdPct", v)} />
        <Field label="CPM Increase Threshold %" value={settings.cpmIncreaseThresholdPct} onChange={(v) => updateNumber("cpmIncreaseThresholdPct", v)} />
        <Field label="CPA Increase Threshold %" value={settings.cpaIncreaseThresholdPct} onChange={(v) => updateNumber("cpaIncreaseThresholdPct", v)} />
        <Field label="Fatigue Lookback Days" value={settings.fatigueLookbackDays} onChange={(v) => updateNumber("fatigueLookbackDays", v)} />
      </Section>

      <Section title="Funnel Benchmarks">
        <Field label="Target CTR %" value={settings.targetCtrPct} onChange={(v) => updateNumber("targetCtrPct", v)} />
        <Field label="Target Click to LPV Rate %" value={settings.targetClickToLpvRatePct} onChange={(v) => updateNumber("targetClickToLpvRatePct", v)} />
        <Field label="Target LPV to ATC Rate %" value={settings.targetLpvToAtcRatePct} onChange={(v) => updateNumber("targetLpvToAtcRatePct", v)} />
        <Field label="Target ATC to Checkout Rate %" value={settings.targetAtcToCheckoutRatePct} onChange={(v) => updateNumber("targetAtcToCheckoutRatePct", v)} />
        <Field label="Target Checkout to Purchase Rate %" value={settings.targetCheckoutToPurchaseRatePct} onChange={(v) => updateNumber("targetCheckoutToPurchaseRatePct", v)} />
      </Section>

      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black">Analysis Mode</h2>
            <MutedText className="mt-1 text-sm">Default: Incremental Efficiency Scale</MutedText>
          </div>

          <select
            className="h-10 rounded-2xl border border-current/10 bg-transparent px-4 text-sm outline-none"
            value={settings.analysisMode}
            onChange={(e) => updateSettings({ analysisMode: e.target.value as typeof settings.analysisMode })}
          >
            <option value="conservative">Conservative</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive_scale">Aggressive Scale</option>
            <option value="incremental_efficiency_scale">Incremental Efficiency Scale</option>
          </select>

          <MetaButton variant="secondary" onClick={resetSettings}>
            Reset Defaults
          </MetaButton>
        </div>
      </GlassCard>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassCard className="p-5">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">{children}</div>
    </GlassCard>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <Surface className="p-4">
      <label className="text-xs font-black uppercase tracking-[0.18em] opacity-45">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 h-10 w-full rounded-xl border border-current/10 bg-transparent px-3 text-sm outline-none"
      />
    </Surface>
  );
}
