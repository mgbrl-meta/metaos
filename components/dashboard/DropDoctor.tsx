"use client";

import { useMemo } from "react";
import { useMetaStore } from "@/store/metaStore";
import { onlyLiveRows } from "@/lib/liveFilter";
import { aggregateRows } from "@/lib/metrics";
import { GlassCard, MetricCard, MutedText, Surface, TonePill } from "@/components/cards/MetaCards";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

export function DropDoctor() {
  const { performanceRows, settings } = useMetaStore();

  const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);

  const data = useMemo(() => {
    const ads = aggregateRows(liveRows, "ad");

    const spend = liveRows.reduce((s, r) => s + r.spend, 0);
    const revenue = liveRows.reduce((s, r) => s + r.revenue, 0);
    const purchases = liveRows.reduce((s, r) => s + r.purchases, 0);
    const impressions = liveRows.reduce((s, r) => s + r.impressions, 0);
    const clicks = liveRows.reduce((s, r) => s + r.clicks, 0);
    const lpv = liveRows.reduce((s, r) => s + r.landingPageViews, 0);
    const atc = liveRows.reduce((s, r) => s + r.addToCart, 0);
    const checkout = liveRows.reduce((s, r) => s + r.checkoutInitiated, 0);

    const roas = safeDiv(revenue, spend);
    const cpa = safeDiv(spend, purchases);
    const ctr = safeDiv(clicks, impressions) * 100;
    const lpvRate = safeDiv(lpv, clicks) * 100;
    const atcRate = safeDiv(atc, lpv) * 100;
    const checkoutRate = safeDiv(checkout, atc) * 100;
    const purchaseCvr = safeDiv(purchases, checkout) * 100;

    const weakCtr = ctr < settings.targetCtrPct;
    const weakLpv = lpvRate < settings.targetClickToLpvRatePct;
    const weakAtc = atcRate < settings.targetLpvToAtcRatePct;
    const weakCheckout = checkoutRate < settings.targetAtcToCheckoutRatePct;
    const weakPurchase = purchaseCvr < settings.targetCheckoutToPurchaseRatePct;
    const fatigueAds = ads.filter((r) => r.fatigueScore >= 70);
    const wasteAds = ads.filter((r) => r.spend > 3000 && r.purchases === 0);

    const diagnosis = [
      {
        issue: "Creative attention problem",
        active: weakCtr,
        signal: `CTR is ${num(ctr)}% vs target ${num(settings.targetCtrPct)}%`,
        action: "Rewrite hooks, first frame, visual contrast and opening promise.",
      },
      {
        issue: "Traffic / landing issue",
        active: weakLpv,
        signal: `Click → LPV rate is ${num(lpvRate)}% vs target ${num(settings.targetClickToLpvRatePct)}%`,
        action: "Check site speed, landing URL, traffic quality and click-to-load consistency.",
      },
      {
        issue: "PDP / offer issue",
        active: weakAtc,
        signal: `LPV → ATC rate is ${num(atcRate)}% vs target ${num(settings.targetLpvToAtcRatePct)}%`,
        action: "Improve product page, offer, trust proof, price anchoring and above-fold clarity.",
      },
      {
        issue: "Checkout friction",
        active: weakCheckout,
        signal: `ATC → Checkout rate is ${num(checkoutRate)}% vs target ${num(settings.targetAtcToCheckoutRatePct)}%`,
        action: "Check shipping, COD/prepaid friction, discount visibility and checkout trust.",
      },
      {
        issue: "Payment / final conversion issue",
        active: weakPurchase,
        signal: `Checkout → Purchase rate is ${num(purchaseCvr)}% vs target ${num(settings.targetCheckoutToPurchaseRatePct)}%`,
        action: "Check payment failure, final price shock, COD restrictions and checkout UX.",
      },
      {
        issue: "Creative fatigue risk",
        active: fatigueAds.length > 0,
        signal: `${fatigueAds.length} ads have high fatigue score.`,
        action: "Prepare replacements before CPA rises further.",
      },
      {
        issue: "Wasted spend leakage",
        active: wasteAds.length > 0,
        signal: `${wasteAds.length} ads spent above ₹3,000 with zero purchases.`,
        action: "Pause/reduce these before scaling winners.",
      },
    ];

    return {
      spend,
      revenue,
      purchases,
      roas,
      cpa,
      ctr,
      lpvRate,
      atcRate,
      checkoutRate,
      purchaseCvr,
      diagnosis,
    };
  }, [performanceRows, settings]);

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Performance Drop Doctor</h2>
        <MutedText className="mt-2">Upload Meta data first.</MutedText>
      </GlassCard>
    );
  }

  const activeIssues = data.diagnosis.filter((d) => d.active);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0A84FF]">
          Drop Doctor
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Why Performance Is Weak</h1>
        <MutedText className="mt-2">
          Diagnoses whether the problem is creative, traffic, PDP, checkout, fatigue or waste.
        </MutedText>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="ROAS" value={num(data.roas)} tone={data.roas >= settings.targetRoas ? "green" : "red"} />
        <MetricCard label="CPA" value={money(data.cpa)} tone={data.cpa <= settings.targetCpa ? "green" : "red"} />
        <MetricCard label="CTR" value={`${num(data.ctr)}%`} tone={data.ctr >= settings.targetCtrPct ? "green" : "red"} />
        <MetricCard label="Purchase CVR" value={`${num(data.purchaseCvr)}%`} tone={data.purchaseCvr >= settings.targetCheckoutToPurchaseRatePct ? "green" : "yellow"} />
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <TonePill tone={activeIssues.length ? "red" : "green"}>
            {activeIssues.length} Active Issues
          </TonePill>
          <MutedText className="text-sm">
            Fix issues in order: waste → creative → funnel → checkout.
          </MutedText>
        </div>

        <div className="mt-5 grid gap-3">
          {data.diagnosis.map((item) => (
            <Surface key={item.issue} className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-black">{item.issue}</p>
                  <MutedText className="mt-1 text-sm">{item.signal}</MutedText>
                  <p className="mt-3 text-sm opacity-75">
                    <b>Action:</b> {item.action}
                  </p>
                </div>
                <TonePill tone={item.active ? "red" : "green"}>
                  {item.active ? "Fix" : "Clear"}
                </TonePill>
              </div>
            </Surface>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}