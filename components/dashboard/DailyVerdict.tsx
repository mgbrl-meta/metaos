"use client";

import { useMemo } from "react";
import { useMetaStore } from "@/store/metaStore";
import { onlyCurrentlyDeliveringAds } from "@/lib/currentCreativeFilter";
import { onlyLiveRows } from "@/lib/liveFilter";
import { aggregateRows } from "@/lib/metrics";
import { GlassCard, MetaButton, MetricCard, MutedText, Surface, TonePill } from "@/components/cards/MetaCards";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

export function DailyVerdict() {
  const { performanceRows, settings } = useMetaStore();

  const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);

  const data = useMemo(() => {
    const ads = onlyCurrentlyDeliveringAds(aggregateRows(liveRows, "ad"), liveRows);

    const spend = liveRows.reduce((s, r) => s + r.spend, 0);
    const revenue = liveRows.reduce((s, r) => s + r.revenue, 0);
    const purchases = liveRows.reduce((s, r) => s + r.purchases, 0);

    const waste = ads.filter((r) => r.spend > 3000 && r.purchases === 0);
    const scale = ads.filter((r) => r.decision === "Scale");
    const reduce = ads.filter((r) => r.decision === "Reduce");
    const kill = ads.filter((r) => r.decision === "Kill" || (r.spend > 3000 && r.purchases === 0));
    const refresh = ads.filter((r) => r.decision === "Refresh Creative" || r.fatigueScore >= 70);

    const wastedSpend = waste.reduce((s, r) => s + r.spend, 0);

    const roas = safeDiv(revenue, spend);
    const cpa = safeDiv(spend, purchases);

    const status =
      waste.length > 0 || roas < settings.targetRoas * 0.75 || cpa > settings.targetCpa * 1.35
        ? "Red"
        : roas >= settings.targetRoas && cpa <= settings.targetCpa && scale.length > 0
        ? "Green"
        : "Yellow";

    const verdict =
      status === "Red"
        ? `Do not scale yet. First recover ${money(wastedSpend)} wasted spend from ${waste.length} ads, then recheck winners.`
        : status === "Green"
        ? `Scale is allowed. Increase ${scale.length} winner ads by 5–10% and monitor marginal ROAS tomorrow.`
        : `Hold aggressive scaling. Reduce weak ads, refresh ${refresh.length} creatives, and let test ads collect more signal.`;

    return {
      ads,
      spend,
      revenue,
      purchases,
      roas,
      cpa,
      waste,
      scale,
      reduce,
      kill,
      refresh,
      wastedSpend,
      status,
      verdict,
    };
  }, [performanceRows, settings]);

  const copyVerdict = async () => {
    const text = `Meta Daily Verdict

Status: ${data.status}
Verdict: ${data.verdict}

Spend: ${money(data.spend)}
Revenue: ${money(data.revenue)}
ROAS: ${num(data.roas)}
CPA: ${money(data.cpa)}
Purchases: ${num(data.purchases, 0)}

Pause/Kill: ${data.kill.length}
Reduce: ${data.reduce.length}
Scale: ${data.scale.length}
Refresh: ${data.refresh.length}
Wasted Spend: ${money(data.wastedSpend)}
`;

    await navigator.clipboard.writeText(text);
    alert("Daily verdict copied.");
  };

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Daily Verdict</h2>
        <MutedText className="mt-2">Upload Meta data first.</MutedText>
      </GlassCard>
    );
  }

  const tone = data.status === "Green" ? "green" : data.status === "Red" ? "red" : "yellow";

  return (
    <div className="grid gap-6">
      <GlassCard className="sticky top-4 z-20 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <TonePill tone={tone}>{data.status} Status</TonePill>
              <TonePill tone="neutral">Daily Command</TonePill>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight">{data.verdict}</h1>
          </div>

          <MetaButton variant="primary" onClick={copyVerdict}>
            Copy Verdict
          </MetaButton>
        </div>
      </GlassCard>

      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0A84FF]">
          Daily Verdict
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Account Decision Summary</h1>
        <MutedText className="mt-2">
          One-line operating decision before touching campaign budgets.
        </MutedText>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Pause / Kill" value={String(data.kill.length)} tone={data.kill.length ? "red" : "green"} />
        <MetricCard label="Reduce" value={String(data.reduce.length)} tone={data.reduce.length ? "red" : "green"} />
        <MetricCard label="Scale" value={String(data.scale.length)} tone={data.scale.length ? "green" : "yellow"} />
        <MetricCard label="Refresh" value={String(data.refresh.length)} tone={data.refresh.length ? "yellow" : "green"} />
        <MetricCard label="Spend" value={money(data.spend)} tone="neutral" />
        <MetricCard label="Revenue" value={money(data.revenue)} tone="green" />
        <MetricCard label="ROAS" value={num(data.roas)} tone={data.roas >= settings.targetRoas ? "green" : "red"} />
        <MetricCard label="CPA" value={money(data.cpa)} tone={data.cpa <= settings.targetCpa ? "green" : "red"} />
      </div>

      <GlassCard className="p-5">
        <h2 className="text-xl font-black">Action Bar</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <ActionBox tone="red" label="Pause Today" value={data.kill.length} />
          <ActionBox tone="red" label="Reduce Today" value={data.reduce.length} />
          <ActionBox tone="green" label="Scale Today" value={data.scale.length} />
          <ActionBox tone="yellow" label="Refresh" value={data.refresh.length} />
          <ActionBox tone="yellow" label="Waste Ads" value={data.waste.length} />
        </div>
      </GlassCard>
    </div>
  );
}

function ActionBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "red" | "yellow";
}) {
  return (
    <Surface className="p-4">
      <TonePill tone={tone}>{label}</TonePill>
      <p className="mt-4 text-3xl font-black">{value}</p>
    </Surface>
  );
}