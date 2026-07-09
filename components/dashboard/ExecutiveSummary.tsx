"use client";

import { useMemo } from "react";
import { useMetaStore } from "@/store/metaStore";
import { GlassCard, MetricCard, MutedText, Surface, TonePill } from "@/components/cards/MetaCards";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

export function ExecutiveSummary() {
  const { performanceRows, settings } = useMetaStore();

  const data = useMemo(() => {
    const spend = performanceRows.reduce((s, r) => s + r.spend, 0);
    const revenue = performanceRows.reduce((s, r) => s + r.revenue, 0);
    const purchases = performanceRows.reduce((s, r) => s + r.purchases, 0);
    const contribution = performanceRows.reduce((s, r) => s + r.contributionAfterAds, 0);

    const scale = performanceRows.filter((r) => r.decision === "Scale");
    const reduce = performanceRows.filter((r) => r.decision === "Reduce");
    const kill = performanceRows.filter((r) => r.decision === "Kill");
    const refresh = performanceRows.filter((r) => r.decision === "Refresh Creative");

    const topWinner = [...performanceRows].sort((a, b) => b.scaleScore - a.scaleScore)[0];
    const topWaste = [...performanceRows].sort((a, b) => b.wasteScore - a.wasteScore)[0];
    const topFatigue = [...performanceRows].sort((a, b) => b.fatigueScore - a.fatigueScore)[0];

    return {
      spend,
      revenue,
      purchases,
      contribution,
      roas: safeDiv(revenue, spend),
      cpa: safeDiv(spend, purchases),
      aov: safeDiv(revenue, purchases),
      scale,
      reduce,
      kill,
      refresh,
      topWinner,
      topWaste,
      topFatigue,
    };
  }, [performanceRows]);

  if (!performanceRows.length) {
    return <EmptyState title="Executive Summary" />;
  }

  const roasTone = data.roas >= settings.targetRoas ? "green" : data.roas >= settings.targetRoas * 0.8 ? "yellow" : "red";
  const cpaTone = data.cpa <= settings.targetCpa ? "green" : data.cpa <= settings.targetCpa * 1.2 ? "yellow" : "red";

  const verdict =
    data.roas >= settings.targetRoas && data.contribution > 0
      ? "Account is scale-ready, but budget increases should remain controlled."
      : data.kill.length + data.reduce.length > data.scale.length
      ? "Account has more waste than scale pockets. Fix waste before increasing spend."
      : "Account is mixed. Protect winners, refresh creatives, and improve funnel depth.";

  return (
    <Screen title="Executive Summary" kicker="Board View" description="Top-line performance, risk, opportunity and next action.">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Spend" value={money(data.spend)} tone="neutral" />
        <MetricCard label="Revenue" value={money(data.revenue)} tone="green" />
        <MetricCard label="ROAS" value={num(data.roas)} tone={roasTone} note={`Target ${settings.targetRoas}`} />
        <MetricCard label="CPA" value={money(data.cpa)} tone={cpaTone} note={`Target ${money(settings.targetCpa)}`} />
        <MetricCard label="Purchases" value={num(data.purchases, 0)} tone="neutral" />
        <MetricCard label="AOV" value={money(data.aov)} tone="neutral" />
        <MetricCard label="Contribution" value={money(data.contribution)} tone={data.contribution > 0 ? "green" : "red"} />
        <MetricCard label="Creative Refresh" value={String(data.refresh.length)} tone={data.refresh.length ? "yellow" : "green"} />
      </div>

      <GlassCard className="p-6">
        <div className="flex flex-wrap gap-2">
          <TonePill tone={roasTone}>ROAS {num(data.roas)}</TonePill>
          <TonePill tone={cpaTone}>CPA {money(data.cpa)}</TonePill>
          <TonePill tone={data.kill.length ? "red" : "green"}>Kill {data.kill.length}</TonePill>
          <TonePill tone={data.scale.length ? "green" : "yellow"}>Scale {data.scale.length}</TonePill>
        </div>

        <h2 className="mt-5 text-2xl font-black tracking-tight">{verdict}</h2>

        <MutedText className="mt-3 max-w-5xl leading-7">
          The priority is to recover red-zone spend, improve yellow-zone assets, and scale green-zone winners
          with marginal ROAS and CPA discipline.
        </MutedText>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <InsightCard tone="green" label="Biggest Scale Opportunity" title={data.topWinner?.adName || "Not detected"} text={`Scale score ${data.topWinner?.scaleScore ?? 0}/100. ${data.topWinner?.action || "Upload more data."}`} />
        <InsightCard tone="red" label="Biggest Waste Risk" title={data.topWaste?.adName || "Not detected"} text={`Waste score ${data.topWaste?.wasteScore ?? 0}/100. ${data.topWaste?.action || "Upload more data."}`} />
        <InsightCard tone="yellow" label="Creative Fatigue Watch" title={data.topFatigue?.adName || "Not detected"} text={`Fatigue score ${data.topFatigue?.fatigueScore ?? 0}/100. Refresh before pushing more budget.`} />
      </div>

      <GlassCard className="p-6">
        <h2 className="text-xl font-black">Operator Key Points</h2>
        <div className="mt-4 grid gap-3">
          <Surface className="p-4"><b>Budget:</b> Recover waste first, then redeploy into scale candidates.</Surface>
          <Surface className="p-4"><b>Creative:</b> Do not scale fatigued ads. Build variants around winning hooks and offers.</Surface>
          <Surface className="p-4"><b>Efficiency:</b> Track marginal ROAS and marginal CPA after each budget move.</Surface>
          <Surface className="p-4"><b>Growth:</b> Scale should come from a portfolio of winners, not one hero ad.</Surface>
        </div>
      </GlassCard>
    </Screen>
  );
}

function InsightCard({ tone, label, title, text }: { tone: "green" | "red" | "yellow"; label: string; title: string; text: string }) {
  return (
    <Surface className="p-5">
      <TonePill tone={tone}>{label}</TonePill>
      <h3 className="mt-4 whitespace-normal break-words font-black">{title}</h3>
      <MutedText className="mt-2 text-sm leading-6">{text}</MutedText>
    </Surface>
  );
}

function Screen({ title, kicker, description, children }: { title: string; kicker: string; description: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0A84FF]">{kicker}</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">{title}</h1>
        <MutedText className="mt-2">{description}</MutedText>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <GlassCard className="p-8">
      <h2 className="text-2xl font-black">{title}</h2>
      <MutedText className="mt-2">Upload Meta data first to activate this screen.</MutedText>
    </GlassCard>
  );
}
