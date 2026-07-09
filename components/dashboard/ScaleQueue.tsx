"use client";

import { useMemo } from "react";
import { useMetaStore } from "@/store/metaStore";
import { aggregateRows } from "@/lib/metrics";
import { onlyLiveRows } from "@/lib/liveFilter";
import {
  GlassCard,
  MetricCard,
  MutedText,
  PageHeader,
  Surface,
  TonePill,
} from "@/components/cards/MetaCards";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);

function queueType(row: any): "Scale Today" | "Hold" | "Reduce" | "Kill" | "Refresh" | "Test More" {
  if (row.spend > 3000 && row.purchases === 0) return "Kill";
  if (row.decision === "Scale") return "Scale Today";
  if (row.decision === "Reduce") return "Reduce";
  if (row.decision === "Kill") return "Kill";
  if (row.decision === "Refresh Creative") return "Refresh";
  if (row.decision === "Test More") return "Test More";
  return "Hold";
}

function toneForQueue(q: string): "green" | "yellow" | "red" | "neutral" {
  if (q === "Scale Today") return "green";
  if (q === "Kill" || q === "Reduce") return "red";
  if (q === "Refresh" || q === "Test More") return "yellow";
  return "neutral";
}

function actionFor(q: string, adName: string) {
  if (q === "Scale Today") return `${adName}: Increase budget 5–10% only. Recheck marginal ROAS tomorrow.`;
  if (q === "Kill") return `${adName}: Pause today or cut spend immediately.`;
  if (q === "Reduce") return `${adName}: Reduce budget. Do not scale until CPA/ROAS recover.`;
  if (q === "Refresh") return `${adName}: Keep learning but create replacement creative.`;
  if (q === "Test More") return `${adName}: Allow more spend before final decision.`;
  return `${adName}: Hold budget stable. No aggressive action today.`;
}

export function ScaleQueue() {
  const { performanceRows } = useMetaStore();

  const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);

  const rows = useMemo(() => {
    return aggregateRows(liveRows, "ad")
      .map((row) => ({ ...row, queue: queueType(row) }))
      .sort((a, b) => {
        const priority = (q: string) => {
          if (q === "Kill") return 1;
          if (q === "Scale Today") return 2;
          if (q === "Reduce") return 3;
          if (q === "Refresh") return 4;
          if (q === "Test More") return 5;
          return 6;
        };
        return priority(a.queue) - priority(b.queue) || b.spend - a.spend;
      });
  }, [liveRows]);

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Scale Queue</h2>
        <MutedText className="mt-2">Upload Meta data first.</MutedText>
      </GlassCard>
    );
  }

  const scale = rows.filter((r) => r.queue === "Scale Today");
  const kill = rows.filter((r) => r.queue === "Kill");
  const reduce = rows.filter((r) => r.queue === "Reduce");
  const refresh = rows.filter((r) => r.queue === "Refresh");

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Scale Queue"
        title="Daily Action Queue"
        description="Only currently live/spending ads are included. Use this as the decision board before touching budgets."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Scale Today" value={String(scale.length)} tone="green" />
        <MetricCard label="Kill Today" value={String(kill.length)} tone={kill.length ? "red" : "green"} />
        <MetricCard label="Reduce" value={String(reduce.length)} tone={reduce.length ? "red" : "green"} />
        <MetricCard label="Refresh" value={String(refresh.length)} tone={refresh.length ? "yellow" : "green"} />
      </div>

      <div className="grid gap-4">
        {rows.slice(0, 60).map((row, index) => (
          <GlassCard key={`${row.adId || row.adName}-${index}`} className="p-5">
            <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <TonePill tone={toneForQueue(row.queue)}>{row.queue}</TonePill>
                  <TonePill tone="neutral">Live Ad</TonePill>
                </div>

                <h3 className="mt-4 text-lg font-black leading-7 whitespace-normal break-words">
                  {row.adName}
                </h3>

                <MutedText className="mt-2 text-sm leading-6">
                  Campaign: {row.campaignName}
                  <br />
                  Ad Set: {row.adSetName}
                </MutedText>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <MiniStat label="Spend" value={money(row.spend)} />
                  <MiniStat label="Revenue" value={money(row.revenue)} />
                  <MiniStat label="ROAS" value={num(row.roas)} />
                  <MiniStat label="CPA" value={money(row.cpa)} />
                  <MiniStat label="Purchases" value={num(row.purchases, 0)} />
                  <MiniStat label="Waste Score" value={String(row.wasteScore)} tone="red" />
                </div>
              </div>

              <Surface className="p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] opacity-45">Today’s Action</p>
                <p className="mt-3 text-sm leading-6 opacity-80">{actionFor(row.queue, row.adName)}</p>
              </Surface>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "red" | "green" | "yellow" | "neutral";
}) {
  const color =
    tone === "red"
      ? "text-red-400"
      : tone === "green"
      ? "text-emerald-400"
      : tone === "yellow"
      ? "text-amber-400"
      : "";

  return (
    <Surface className="p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">{label}</p>
      <p className={`mt-2 text-base font-black ${color}`}>{value}</p>
    </Surface>
  );
}
