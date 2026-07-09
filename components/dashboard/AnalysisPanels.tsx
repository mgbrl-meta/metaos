"use client";

import { useMemo } from "react";
import { useMetaStore } from "@/store/metaStore";
import { aggregateRows } from "@/lib/metrics";
import { onlyLiveRows } from "@/lib/liveFilter";
import { PerformanceTable } from "@/components/tables/PerformanceTable";
import { GlassCard, MutedText } from "@/components/cards/MetaCards";

export function CampaignAnalysis() {
  const { performanceRows } = useMetaStore();

  const liveRows = useMemo(
    () => onlyLiveRows(performanceRows),
    [performanceRows]
  );

  const rows = useMemo(
    () => aggregateRows(liveRows, "campaign").sort((a, b) => b.spend - a.spend),
    [liveRows]
  );

  return (
    <Panel
      title="Campaign Analysis"
      kicker="Campaign Layer"
      description="Campaign-level budget, ROAS, CPA, scale and waste diagnosis. This uses live-status rows only."
      rows={rows}
      nameKey="campaignName"
    />
  );
}

export function AdSetAnalysis() {
  const { performanceRows } = useMetaStore();

  const liveRows = useMemo(
    () => onlyLiveRows(performanceRows),
    [performanceRows]
  );

  const rows = useMemo(
    () => aggregateRows(liveRows, "adset").sort((a, b) => b.spend - a.spend),
    [liveRows]
  );

  return (
    <Panel
      title="Ad Set Analysis"
      kicker="Ad Set Layer"
      description="Ad-set-level winners, weak pockets, scale candidates and budget movement. This uses live-status rows only."
      rows={rows}
      nameKey="adSetName"
    />
  );
}

function Panel({
  title,
  kicker,
  description,
  rows,
  nameKey,
}: {
  title: string;
  kicker: string;
  description: string;
  rows: any[];
  nameKey: "campaignName" | "adSetName";
}) {
  if (!rows.length) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">{title}</h2>
        <MutedText className="mt-2">Upload Meta data first to activate this screen.</MutedText>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#0A84FF]">
          {kicker}
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">{title}</h1>
        <MutedText className="mt-2">{description}</MutedText>
      </div>

      <PerformanceTable rows={rows} nameKey={nameKey} />
    </div>
  );
}
