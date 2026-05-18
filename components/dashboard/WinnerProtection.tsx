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

export function WinnerProtection() {
  const { performanceRows, settings } = useMetaStore();

  const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);

  const winners = useMemo(() => {
    return aggregateRows(liveRows, "ad")
      .filter(
        (r) =>
          r.spend >= settings.minSpendForDecision &&
          r.purchases >= settings.minPurchasesForScale &&
          r.roas >= settings.targetRoas &&
          r.cpa <= settings.targetCpa
      )
      .sort((a, b) => b.revenue - a.revenue);
  }, [liveRows, settings]);

  const scaleSafe = winners.filter(
    (r) => r.frequency <= settings.maxHealthyFrequency && r.fatigueScore < 60
  );

  const watch = winners.filter(
    (r) => r.frequency > settings.maxHealthyFrequency || r.fatigueScore >= 60
  );

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Winners</h2>
        <MutedText className="mt-2">Upload Meta data first.</MutedText>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Winner Protection"
        title="Protect Live Ads That Are Working"
        description="Only currently live/spending ads are analysed. Winners should be scaled slowly and backed up with creative variants."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Live Winners" value={String(winners.length)} tone={winners.length ? "green" : "yellow"} />
        <MetricCard label="Scale Safe" value={String(scaleSafe.length)} tone={scaleSafe.length ? "green" : "yellow"} />
        <MetricCard label="Watch Winners" value={String(watch.length)} tone={watch.length ? "yellow" : "green"} />
        <MetricCard label="Target ROAS" value={String(settings.targetRoas)} tone="neutral" />
      </div>

      <div className="grid gap-4">
        {winners.length ? (
          winners.map((row, index) => {
            const safe =
              row.frequency <= settings.maxHealthyFrequency && row.fatigueScore < 60;

            return (
              <GlassCard key={`${row.adId || row.adName}-${index}`} className="p-5">
                <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <TonePill tone={safe ? "green" : "yellow"}>
                        {safe ? "Scale Safe" : "Protect / Watch"}
                      </TonePill>
                      <TonePill tone="neutral">Live Winner</TonePill>
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
                      <MiniStat label="Revenue" value={money(row.revenue)} tone="green" />
                      <MiniStat label="ROAS" value={num(row.roas)} tone="green" />
                      <MiniStat label="CPA" value={money(row.cpa)} />
                      <MiniStat label="Purchases" value={num(row.purchases, 0)} />
                      <MiniStat label="Frequency" value={num(row.frequency)} />
                    </div>
                  </div>

                  <Surface className="p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] opacity-45">Action</p>
                    <p className="mt-3 text-sm leading-6 opacity-80">
                      {safe
                        ? "Scale 5–10% only. Create 2–3 backup variants from the same hook, offer and proof."
                        : "Protect but do not scale aggressively. Prepare refresh because fatigue/frequency risk is rising."}
                    </p>
                  </Surface>
                </div>
              </GlassCard>
            );
          })
        ) : (
          <GlassCard className="p-8">
            <h2 className="text-2xl font-black">No live winner detected yet</h2>
            <MutedText className="mt-2">
              No currently live ad meets spend, purchase, ROAS and CPA winner conditions.
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
