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

function fatigueLevel(score: number): "High" | "Medium" | "Low" {
  if (score >= 75) return "High";
  if (score >= 55) return "Medium";
  return "Low";
}

function tone(level: string): "green" | "yellow" | "red" {
  if (level === "High") return "red";
  if (level === "Medium") return "yellow";
  return "green";
}

function actionFor(row: any, level: string) {
  if (level === "High") {
    return "Do not scale. Prepare replacement creative immediately. Change hook, first frame, proof point or creator format.";
  }

  if (level === "Medium") {
    return "Monitor closely. Do not increase budget aggressively. Prepare backup creative before CPA rises.";
  }

  if (row.roas >= 1 && row.cpa > 0) {
    return "Creative is currently healthy. Keep running but monitor frequency and CTR daily.";
  }

  return "Low fatigue, but performance signal is weak. Judge by CPA, ROAS and purchase volume before scaling.";
}

export function FatigueRadar() {
  const { performanceRows, settings } = useMetaStore();

  const liveRows = useMemo(
    () => onlyLiveRows(performanceRows),
    [performanceRows]
  );

  const ads = useMemo(() => {
    return aggregateRows(liveRows, "ad")
      .filter((r) => r.spend >= settings.minSpendForDecision)
      .sort((a, b) => b.fatigueScore - a.fatigueScore);
  }, [liveRows, settings]);

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Fatigue Radar</h2>
        <MutedText className="mt-2">
          Upload Meta data first. Only ads with spend or impressions on the latest date will be analysed.
        </MutedText>
      </GlassCard>
    );
  }

  const high = ads.filter((r) => fatigueLevel(r.fatigueScore) === "High");
  const medium = ads.filter((r) => fatigueLevel(r.fatigueScore) === "Medium");
  const low = ads.filter((r) => fatigueLevel(r.fatigueScore) === "Low");

  const priorityAds = [...high, ...medium, ...low].slice(0, 40);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Fatigue Radar"
        title="Creative Fatigue Watchlist"
        description="Only currently live/spending ads are analysed. Use this to identify ads that should not receive more budget until refreshed."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="High Fatigue"
          value={String(high.length)}
          tone={high.length ? "red" : "green"}
        />
        <MetricCard
          label="Medium Fatigue"
          value={String(medium.length)}
          tone={medium.length ? "yellow" : "green"}
        />
        <MetricCard
          label="Healthy / Low"
          value={String(low.length)}
          tone="green"
        />
        <MetricCard
          label="Frequency Limit"
          value={String(settings.maxHealthyFrequency)}
          tone="neutral"
        />
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <TonePill tone={high.length ? "red" : medium.length ? "yellow" : "green"}>
            {high.length ? "Action Required" : medium.length ? "Watch Closely" : "Healthy"}
          </TonePill>
          <TonePill tone="blue">Live Ads Only</TonePill>
        </div>

        <h2 className="mt-4 text-2xl font-black">
          {high.length
            ? `${high.length} live creatives should not be scaled until refreshed.`
            : medium.length
            ? `${medium.length} creatives need monitoring before budget increase.`
            : "No major fatigue risk detected in currently live ads."}
        </h2>

        <MutedText className="mt-2">
          Fatigue should be read together with CPA, CTR, frequency and ROAS. A fatigued winner should be refreshed, not immediately killed.
        </MutedText>
      </GlassCard>

      <div className="grid gap-4">
        {priorityAds.length ? (
          priorityAds.map((row, index) => {
            const level = fatigueLevel(row.fatigueScore);

            return (
              <GlassCard key={`${row.adId || row.adName}-${index}`} className="p-5">
                <div className="grid gap-5 xl:grid-cols-[1fr_220px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <TonePill tone={tone(level)}>{level} Risk</TonePill>
                      <TonePill tone="neutral">Fatigue {row.fatigueScore}/100</TonePill>
                    </div>

                    <h3 className="mt-4 text-lg font-black leading-7">
                      {row.adName}
                    </h3>

                    <MutedText className="mt-2 text-sm leading-6">
                      Campaign: {row.campaignName}
                      <br />
                      Ad Set: {row.adSetName}
                    </MutedText>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <MiniStat label="Spend" value={money(row.spend)} />
                      <MiniStat label="ROAS" value={num(row.roas)} />
                      <MiniStat label="CPA" value={money(row.cpa)} />
                      <MiniStat label="CTR" value={`${num(row.ctr)}%`} />
                      <MiniStat label="Frequency" value={num(row.frequency)} />
                    </div>
                  </div>

                  <Surface className="p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] opacity-45">
                      Action
                    </p>
                    <p className="mt-3 text-sm leading-6 opacity-80">
                      {actionFor(row, level)}
                    </p>
                  </Surface>
                </div>
              </GlassCard>
            );
          })
        ) : (
          <GlassCard className="p-8">
            <h2 className="text-2xl font-black">No fatigue watchlist yet</h2>
            <MutedText className="mt-2">
              No live ad has enough spend to be evaluated for fatigue.
            </MutedText>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Surface className="p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">
        {label}
      </p>
      <p className="mt-2 text-base font-black">{value}</p>
    </Surface>
  );
}
