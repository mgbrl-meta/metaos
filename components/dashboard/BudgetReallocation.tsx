"use client";

import { useMemo } from "react";

import { useMetaStore } from "@/store/metaStore";
import { onlyCurrentlyDeliveringAds } from "@/lib/currentCreativeFilter";
import { onlyLiveRows } from "@/lib/liveFilter";
import { GlassCard, MetricCard, MutedText, Surface, TonePill } from "@/components/cards/MetaCards";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);

export function BudgetReallocation() {
  const { performanceRows, settings } = useMetaStore();

  const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Budget Reallocation</h2>
        <MutedText className="mt-2">Upload Meta data first.</MutedText>
      </GlassCard>
    );
  }

  const cut = performanceRows.filter((r) => r.decision === "Kill" || r.decision === "Reduce");
  const scale = performanceRows.filter((r) => r.decision === "Scale");
  const test = performanceRows.filter((r) => r.decision === "Test More");

  const recoveredBudget = cut.reduce(
    (s, r) => s + r.spend * (r.decision === "Kill" ? 1 : settings.budgetReductionPct / 100),
    0
  );

  const expectedRevenue = scale.reduce((s, r) => s + r.spend * (settings.normalScaleIncreasePct / 100) * r.roas, 0);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0A84FF]">War Plan</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Budget Reallocation</h1>
        <MutedText className="mt-2">Cut red. Protect yellow. Scale green. Recheck marginal efficiency.</MutedText>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Recoverable Budget" value={money(recoveredBudget)} tone={recoveredBudget > 0 ? "yellow" : "neutral"} />
        <MetricCard label="Scale Candidates" value={String(scale.length)} tone="green" />
        <MetricCard label="Cut / Reduce" value={String(cut.length)} tone="red" />
        <MetricCard label="Expected Revenue Lift" value={money(expectedRevenue)} tone="green" />
      </div>

      <GlassCard className="p-5">
        <h2 className="text-xl font-black">Budget Moves</h2>
        <div className="mt-4 grid gap-3">
          {[...cut.slice(0, 8), ...scale.slice(0, 8), ...test.slice(0, 4)].map((r, i) => (
            <Surface key={`${r.adName}-${i}`} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-black">{r.adName}</p>
                <MutedText className="mt-1 text-sm">
                  Spend {money(r.spend)} · ROAS {num(r.roas)} · CPA {money(r.cpa)}
                </MutedText>
              </div>
              <TonePill tone={r.decision === "Scale" ? "green" : r.decision === "Kill" || r.decision === "Reduce" ? "red" : "yellow"}>
                {r.decision}
              </TonePill>
            </Surface>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}