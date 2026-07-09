"use client";

import { useMemo } from "react";

import { useMetaStore } from "@/store/metaStore";
import { onlyLiveRows } from "@/lib/liveFilter";
import { GlassCard, MutedText, Surface, TonePill } from "@/components/cards/MetaCards";

const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function rateTone(rate: number, good: number): "green" | "yellow" | "red" {
  if (rate >= good) return "green";
  if (rate >= good * 0.7) return "yellow";
  return "red";
}

export function FunnelDoctor() {
  const { performanceRows, settings } = useMetaStore();

  const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Funnel Doctor</h2>
        <MutedText className="mt-2">Upload Meta data first.</MutedText>
      </GlassCard>
    );
  }

  const impressions = liveRows.reduce((s, r) => s + r.impressions, 0);
  const clicks = liveRows.reduce((s, r) => s + r.clicks, 0);
  const lpv = liveRows.reduce((s, r) => s + r.landingPageViews, 0);
  const atc = liveRows.reduce((s, r) => s + r.addToCart, 0);
  const checkout = liveRows.reduce((s, r) => s + r.checkoutInitiated, 0);
  const purchase = liveRows.reduce((s, r) => s + r.purchases, 0);

  const stages = [
    ["Impression → Click", safeDiv(clicks, impressions) * 100, settings.targetCtrPct, "Creative / hook strength"],
    ["Click → LPV", safeDiv(lpv, clicks) * 100, settings.targetClickToLpvRatePct, "Traffic quality / site speed"],
    ["LPV → ATC", safeDiv(atc, lpv) * 100, settings.targetLpvToAtcRatePct, "PDP / offer / product fit"],
    ["ATC → Checkout", safeDiv(checkout, atc) * 100, settings.targetAtcToCheckoutRatePct, "Trust / pricing / shipping"],
    ["Checkout → Purchase", safeDiv(purchase, checkout) * 100, settings.targetCheckoutToPurchaseRatePct, "Payment friction / final price shock"],
  ] as const;

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0A84FF]">Funnel Doctor</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Gap Analysis</h1>
        <MutedText className="mt-2">Identify whether the issue is creative, traffic, PDP, checkout or payment.</MutedText>
      </div>

      <GlassCard className="p-5">
        <div className="grid gap-3">
          {stages.map(([stage, rate, target, issue]) => (
            <Surface key={stage} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-black">{stage}</p>
                <MutedText className="mt-1 text-sm">{issue}</MutedText>
              </div>
              <div className="flex items-center gap-3">
                <TonePill tone={rateTone(rate, target)}>{pct(rate)}</TonePill>
                <span className="text-xs opacity-45">Target {pct(target)}</span>
              </div>
            </Surface>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}