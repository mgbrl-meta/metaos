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

export function WastedSpend() {
  const { performanceRows } = useMetaStore();

  const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);

  const wastedAds = useMemo(() => {
    return aggregateRows(liveRows, "ad")
      .filter((row) => row.spend > 3000 && row.purchases === 0)
      .sort((a, b) => b.spend - a.spend);
  }, [liveRows]);

  const totalWastedSpend = wastedAds.reduce((sum, row) => sum + row.spend, 0);
  const totalClicks = wastedAds.reduce((sum, row) => sum + row.clicks, 0);
  const totalImpressions = wastedAds.reduce((sum, row) => sum + row.impressions, 0);

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Waste Monitor</h2>
        <MutedText className="mt-2">
          Upload Meta data first. Only latest-day live/spending ads will be analysed.
        </MutedText>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Waste Monitor"
        title="Live Ads Burning Spend"
        description="Only ads that spent or received impressions on the latest date are analysed. Rule: spend above ₹3,000 and zero purchases."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Waste Ads" value={String(wastedAds.length)} tone={wastedAds.length ? "red" : "green"} />
        <MetricCard label="Wasted Spend" value={money(totalWastedSpend)} tone={totalWastedSpend ? "red" : "green"} />
        <MetricCard label="Clicks Burned" value={num(totalClicks, 0)} tone="yellow" />
        <MetricCard label="Impressions Burned" value={num(totalImpressions, 0)} tone="yellow" />
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <TonePill tone={wastedAds.length ? "red" : "green"}>
            {wastedAds.length ? "Action Required" : "Clear"}
          </TonePill>
          <TonePill tone="blue">Live Ads Only</TonePill>
        </div>

        <h2 className="mt-4 text-2xl font-black">
          {wastedAds.length
            ? `Pause or reduce ${wastedAds.length} live ads before scaling.`
            : "No critical wasted spend detected in live ads."}
        </h2>

        <MutedText className="mt-2">
          This tab is designed for daily hygiene. Remove waste first, then reallocate only part of recovered budget to winners.
        </MutedText>
      </GlassCard>

      <div className="grid gap-4">
        {wastedAds.length ? (
          wastedAds.map((row, index) => (
            <GlassCard key={`${row.adId || row.adName}-${index}`} className="p-5">
              <div className="grid gap-5 xl:grid-cols-[1fr_260px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <TonePill tone="red">Pause / Reduce</TonePill>
                    <TonePill tone="neutral">0 Purchases</TonePill>
                  </div>

                  <h3 className="mt-4 text-lg font-black leading-7 whitespace-normal break-words">
                    {row.adName}
                  </h3>

                  <MutedText className="mt-2 text-sm leading-6">
                    Campaign: {row.campaignName}
                    <br />
                    Ad Set: {row.adSetName}
                  </MutedText>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <MiniStat label="Spend" value={money(row.spend)} tone="red" />
                    <MiniStat label="Purchases" value={num(row.purchases, 0)} tone="red" />
                    <MiniStat label="Clicks" value={num(row.clicks, 0)} />
                    <MiniStat label="CTR" value={`${num(row.ctr)}%`} />
                    <MiniStat label="LPV" value={num(row.landingPageViews, 0)} />
                  </div>
                </div>

                <Surface className="p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] opacity-45">Action</p>
                  <p className="mt-3 text-sm leading-6 opacity-80">
                    Pause or reduce today. Spend crossed ₹3,000 with zero purchases. If CTR is strong, audit PDP/offer before relaunch.
                  </p>
                </Surface>
              </div>
            </GlassCard>
          ))
        ) : (
          <GlassCard className="p-8">
            <h2 className="text-2xl font-black">No live waste detected</h2>
            <MutedText className="mt-2">
              No latest-day live ad has crossed ₹3,000 spend with zero purchases.
            </MutedText>
          </GlassCard>
        )}
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
