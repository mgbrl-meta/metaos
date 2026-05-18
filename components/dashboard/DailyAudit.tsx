"use client";

import { useMemo } from "react";
import { useMetaStore } from "@/store/metaStore";
import { onlyCurrentlyDeliveringAds } from "@/lib/currentCreativeFilter";
import { onlyLiveRows } from "@/lib/liveFilter";
import { aggregateRows } from "@/lib/metrics";
import { GlassCard, MetricCard, MutedText, Surface, TonePill } from "@/components/cards/MetaCards";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

export function DailyAudit() {
  const { performanceRows, settings } = useMetaStore();

  const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);

  const data = useMemo(() => {
    const ads = onlyCurrentlyDeliveringAds(aggregateRows(liveRows, "ad"), liveRows);

    const spend = liveRows.reduce((s, r) => s + r.spend, 0);
    const revenue = liveRows.reduce((s, r) => s + r.revenue, 0);
    const purchases = liveRows.reduce((s, r) => s + r.purchases, 0);
    const contribution = liveRows.reduce((s, r) => s + r.contributionAfterAds, 0);

    const wasted = ads.filter((r) => r.spend > 3000 && r.purchases === 0);
    const winners = ads.filter(
      (r) =>
        r.spend >= settings.minSpendForDecision &&
        r.purchases >= settings.minPurchasesForScale &&
        r.roas >= settings.targetRoas &&
        r.cpa <= settings.targetCpa
    );
    const fatigue = ads.filter((r) => r.fatigueScore >= 70);
    const scale = ads.filter((r) => r.decision === "Scale");
    const reduce = ads.filter((r) => r.decision === "Reduce");
    const kill = ads.filter((r) => r.decision === "Kill");

    const topAdSpend = ads.length ? Math.max(...ads.map((r) => r.spend)) : 0;
    const topAdSpendShare = safeDiv(topAdSpend, spend) * 100;

    const healthScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          (safeDiv(revenue, spend) >= settings.targetRoas ? 25 : 10) +
            (safeDiv(spend, purchases) <= settings.targetCpa && purchases > 0 ? 20 : 8) +
            (contribution > 0 ? 20 : 5) +
            (wasted.length === 0 ? 15 : 5) +
            (fatigue.length === 0 ? 10 : 3) +
            (winners.length > 0 ? 10 : 3)
        )
      )
    );

    return {
      ads,
      spend,
      revenue,
      purchases,
      contribution,
      roas: safeDiv(revenue, spend),
      cpa: safeDiv(spend, purchases),
      wasted,
      winners,
      fatigue,
      scale,
      reduce,
      kill,
      topAdSpendShare,
      healthScore,
    };
  }, [performanceRows, settings]);

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Daily Audit</h2>
        <MutedText className="mt-2">Upload Meta data first.</MutedText>
      </GlassCard>
    );
  }

  const healthTone =
    data.healthScore >= 75 ? "green" : data.healthScore >= 55 ? "yellow" : "red";

  const checklist = [
    {
      title: "Check critical waste",
      status: data.wasted.length === 0 ? "Clear" : `${data.wasted.length} ads need action`,
      tone: data.wasted.length === 0 ? "green" : "red",
      action:
        data.wasted.length === 0
          ? "No ad has crossed ₹3,000 spend with zero purchases."
          : "Open Waste tab and pause/reduce these ads before scaling.",
    },
    {
      title: "Check winner stability",
      status: `${data.winners.length} stable winners`,
      tone: data.winners.length > 0 ? "green" : "yellow",
      action:
        data.winners.length > 0
          ? "Protect winners. Scale only gradually and create creative variants."
          : "No stable winners yet. Do not increase budget aggressively.",
    },
    {
      title: "Check fatigue",
      status: `${data.fatigue.length} fatigue alerts`,
      tone: data.fatigue.length === 0 ? "green" : "yellow",
      action:
        data.fatigue.length === 0
          ? "No major fatigue detected."
          : "Prepare replacement creatives before performance drops further.",
    },
    {
      title: "Check budget concentration",
      status: `${num(data.topAdSpendShare, 1)}% spend in top ad`,
      tone: data.topAdSpendShare > 45 ? "red" : data.topAdSpendShare > 30 ? "yellow" : "green",
      action:
        data.topAdSpendShare > 45
          ? "High dependency risk. Build backup winners immediately."
          : "Spend concentration is manageable.",
    },
    {
      title: "Check scale queue",
      status: `${data.scale.length} scale candidates`,
      tone: data.scale.length > 0 ? "green" : "yellow",
      action:
        data.scale.length > 0
          ? "Scale green-zone ads gradually. Watch marginal ROAS."
          : "No safe scale queue yet.",
    },
  ];

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0A84FF]">
          Daily Account Audit
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Morning Command Checklist</h1>
        <MutedText className="mt-2">
          Use this screen every day before making budget or creative decisions.
        </MutedText>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Account Health" value={`${data.healthScore}/100`} tone={healthTone} />
        <MetricCard label="Spend" value={money(data.spend)} tone="neutral" />
        <MetricCard label="ROAS" value={num(data.roas)} tone={data.roas >= settings.targetRoas ? "green" : "red"} />
        <MetricCard label="CPA" value={money(data.cpa)} tone={data.cpa <= settings.targetCpa ? "green" : "red"} />
      </div>

      <GlassCard className="p-5">
        <h2 className="text-xl font-black">Today’s Audit Queue</h2>
        <div className="mt-4 grid gap-3">
          {checklist.map((item) => (
            <Surface key={item.title} className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-black">{item.title}</p>
                  <MutedText className="mt-1 text-sm">{item.action}</MutedText>
                </div>
                <TonePill tone={item.tone as "green" | "yellow" | "red"}>{item.status}</TonePill>
              </div>
            </Surface>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h2 className="text-xl font-black">Today’s Operating Decision</h2>
        <MutedText className="mt-3 leading-7">
          {data.wasted.length > 0
            ? "Do not scale first. Remove wasted spend, then reallocate into protected winners."
            : data.scale.length > 0
            ? "Account has scale candidates. Increase gradually and monitor marginal ROAS / CPA."
            : "No strong scale signal yet. Keep budget stable and focus on creative testing."}
        </MutedText>
      </GlassCard>
    </div>
  );
}