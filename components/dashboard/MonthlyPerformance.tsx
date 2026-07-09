"use client";

import { useMemo } from "react";
import { useMetaStore } from "@/store/metaStore";
import { aggregateRows } from "@/lib/metrics";
import { onlyLiveRows } from "@/lib/liveFilter";
import { onlyCurrentlyDeliveringAds } from "@/lib/currentCreativeFilter";
import {
  GlassCard,
  MetaButton,
  MetricCard,
  MutedText,
  PageHeader,
  Surface,
  TonePill,
} from "@/components/cards/MetaCards";
import { useThemeStore } from "@/components/theme/ThemeProvider";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthKey(date?: string) {
  const d = parseDate(date);
  if (!d) return "Unknown";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonthKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function summarize(rows: any[]) {
  const spend = rows.reduce((s, r) => s + r.spend, 0);
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const purchases = rows.reduce((s, r) => s + r.purchases, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const lpv = rows.reduce((s, r) => s + r.landingPageViews, 0);
  const atc = rows.reduce((s, r) => s + r.addToCart, 0);
  const checkout = rows.reduce((s, r) => s + r.checkoutInitiated, 0);
  const contribution = rows.reduce((s, r) => s + r.contributionAfterAds, 0);

  return {
    spend,
    revenue,
    purchases,
    impressions,
    clicks,
    lpv,
    atc,
    checkout,
    contribution,
    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, purchases),
    ctr: safeDiv(clicks, impressions) * 100,
    lpvRate: safeDiv(lpv, clicks) * 100,
    atcRate: safeDiv(atc, lpv) * 100,
    checkoutRate: safeDiv(checkout, atc) * 100,
    purchaseCvr: safeDiv(purchases, checkout) * 100,
  };
}

function change(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

export function MonthlyPerformance() {
  const { performanceRows, settings } = useMetaStore();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);

  const data = useMemo(() => {
    const validMonths = Array.from(
      new Set(liveRows.map((row) => monthKey(row.date)).filter((m) => m !== "Unknown"))
    ).sort();

    const currentMonth = validMonths[validMonths.length - 1] || "";
    const lastMonth = currentMonth ? previousMonthKey(currentMonth) : "";

    const currentRows = liveRows.filter((row) => monthKey(row.date) === currentMonth);
    const lastRows = liveRows.filter((row) => monthKey(row.date) === lastMonth);

    const current = summarize(currentRows);
    const previous = summarize(lastRows);

    const monthly = validMonths.map((month) => {
      const rows = liveRows.filter((row) => monthKey(row.date) === month);
      return {
        month,
        ...summarize(rows),
      };
    });

    const campaigns = aggregateRows(currentRows as any, "campaign")
      .filter((r) => r.spend >= settings.minSpendForDecision)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 10);

    const adsets = aggregateRows(currentRows as any, "adset")
      .filter((r) => r.spend >= settings.minSpendForDecision)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 10);

    const allCurrentAds = onlyCurrentlyDeliveringAds(
      aggregateRows(currentRows as any, "ad"),
      liveRows as any
    );

    const creatives = allCurrentAds
      .filter((r) => r.spend >= settings.minSpendForDecision && r.purchases > 0)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 10);

    const waste = allCurrentAds
      .filter((r) => r.spend > 3000 && r.purchases === 0)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10);

    const fatigue = allCurrentAds
      .filter((r) => r.fatigueScore >= 70)
      .sort((a, b) => b.fatigueScore - a.fatigueScore)
      .slice(0, 10);

    const roasChange = change(current.roas, previous.roas);
    const cpaChange = change(current.cpa, previous.cpa);
    const spendChange = change(current.spend, previous.spend);
    const revenueChange = change(current.revenue, previous.revenue);
    const purchaseChange = change(current.purchases, previous.purchases);

    const recommendation =
      waste.length > 0
        ? `Do not scale blindly. First recover ${money(
            waste.reduce((s, r) => s + r.spend, 0)
          )} wasted spend from ${waste.length} currently delivering ads, then reallocate to the best current-month winners.`
        : current.roas >= settings.targetRoas && current.cpa <= settings.targetCpa
        ? `This month is outperforming target. Scale the strongest current-month campaigns/ad sets/creatives gradually by 5–10%, while protecting CPA and fatigue.`
        : current.roas < previous.roas
        ? `This month ROAS is weaker than last month. Hold aggressive scaling, diagnose creative/funnel gap, and refresh fatigued assets.`
        : `This month is stable but not fully scale-ready. Keep budget steady, cut weak pockets, and build more creative depth.`;

    const reportText = `Meta Monthly Performance Report

Current Month: ${currentMonth}
Last Month: ${lastMonth}

Executive Summary:
${recommendation}

This Month vs Last Month:
- Spend: ${money(current.spend)} vs ${money(previous.spend)} (${pct(spendChange)})
- Revenue: ${money(current.revenue)} vs ${money(previous.revenue)} (${pct(revenueChange)})
- ROAS: ${num(current.roas)} vs ${num(previous.roas)} (${pct(roasChange)})
- CPA: ${money(current.cpa)} vs ${money(previous.cpa)} (${pct(cpaChange)})
- Purchases: ${num(current.purchases, 0)} vs ${num(previous.purchases, 0)} (${pct(purchaseChange)})

Funnel:
- CTR: ${num(current.ctr)}%
- Click to LPV: ${num(current.lpvRate)}%
- LPV to ATC: ${num(current.atcRate)}%
- ATC to Checkout: ${num(current.checkoutRate)}%
- Checkout to Purchase: ${num(current.purchaseCvr)}%

Standout Ad Sets:
${adsets.map((a, i) => `${i + 1}. ${a.adSetName} — ROAS ${num(a.roas)}, Spend ${money(a.spend)}, CPA ${money(a.cpa)}`).join("\n") || "None"}

Standout Creatives:
${creatives.map((a, i) => `${i + 1}. ${a.adName} — ROAS ${num(a.roas)}, Spend ${money(a.spend)}, CPA ${money(a.cpa)}`).join("\n") || "None"}

Waste Watch:
${waste.map((a, i) => `${i + 1}. ${a.adName} — Spend ${money(a.spend)}, Purchases ${num(a.purchases, 0)}`).join("\n") || "No critical current waste detected."}

Final Recommendation:
${recommendation}
`;

    return {
      currentMonth,
      lastMonth,
      current,
      previous,
      monthly,
      campaigns,
      adsets,
      creatives,
      waste,
      fatigue,
      roasChange,
      cpaChange,
      spendChange,
      revenueChange,
      purchaseChange,
      recommendation,
      reportText,
    };
  }, [liveRows, settings]);

  const copyReport = async () => {
    await navigator.clipboard.writeText(data.reportText);
    alert("Monthly report copied.");
  };

  const exportReport = () => {
    const html = `
      <html>
        <head>
          <title>Meta Monthly Performance Report</title>
          <style>
            body { font-family: Helvetica, Arial, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            h1 { font-size: 32px; }
            pre { white-space: pre-wrap; font-size: 13px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <h1>Meta Monthly Performance Report</h1>
          <pre>${data.reportText.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre>
        </body>
      </html>
    `;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Monthly Performance</h2>
        <MutedText className="mt-2">Upload Meta data first.</MutedText>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          eyebrow="Monthly Performance"
          title="This Month vs Last Month"
          description="Monthly account audit with MoM comparison, standout ad sets/creatives, waste watch, and final recommendations."
        />

        <div className="flex flex-wrap gap-2">
          <MetaButton variant="secondary" onClick={copyReport}>Copy Report</MetaButton>
          <MetaButton variant="primary" onClick={exportReport}>Export PDF</MetaButton>
        </div>
      </div>

      <GlassCard className="p-6">
        <TonePill tone={data.waste.length ? "red" : data.current.roas >= settings.targetRoas ? "green" : "yellow"}>
          Final Recommendation
        </TonePill>
        <h2 className="mt-4 text-2xl font-black leading-tight">{data.recommendation}</h2>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard label="Spend Change" value={pct(data.spendChange)} tone={data.spendChange > 0 ? "blue" : "neutral"} />
        <MetricCard label="Revenue Change" value={pct(data.revenueChange)} tone={data.revenueChange >= data.spendChange ? "green" : "yellow"} />
        <MetricCard label="ROAS Change" value={pct(data.roasChange)} tone={data.roasChange >= 0 ? "green" : "red"} />
        <MetricCard label="CPA Change" value={pct(data.cpaChange)} tone={data.cpaChange <= 0 ? "green" : "red"} />
        <MetricCard label="Purchase Change" value={pct(data.purchaseChange)} tone={data.purchaseChange >= 0 ? "green" : "red"} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="This Month Spend" value={money(data.current.spend)} tone="neutral" note={`Last month ${money(data.previous.spend)}`} />
        <MetricCard label="This Month Revenue" value={money(data.current.revenue)} tone="green" note={`Last month ${money(data.previous.revenue)}`} />
        <MetricCard label="This Month ROAS" value={num(data.current.roas)} tone={data.current.roas >= settings.targetRoas ? "green" : "red"} note={`Last month ${num(data.previous.roas)}`} />
        <MetricCard label="This Month CPA" value={money(data.current.cpa)} tone={data.current.cpa <= settings.targetCpa ? "green" : "red"} note={`Last month ${money(data.previous.cpa)}`} />
      </div>

      <GlassCard className="overflow-hidden">
        <div className="border-b border-current/10 p-5">
          <h2 className="text-xl font-black">Monthly MoM Table</h2>
          <MutedText className="mt-1 text-sm">All uploaded months shown for historical context.</MutedText>
        </div>

        <div className="metaos-scroll-table overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className={isDark ? "border-b border-white/10 bg-white/[0.04] text-[11px] uppercase tracking-[0.16em] text-white/45" : "border-b border-black/10 bg-black/[0.035] text-[11px] uppercase tracking-[0.16em] text-black/55"}>
              <tr>
                <th className="px-5 py-4">Month</th>
                <th className="px-5 py-4">Spend</th>
                <th className="px-5 py-4">Revenue</th>
                <th className="px-5 py-4">ROAS</th>
                <th className="px-5 py-4">CPA</th>
                <th className="px-5 py-4">Purchases</th>
                <th className="px-5 py-4">CTR</th>
                <th className="px-5 py-4">Purchase CVR</th>
              </tr>
            </thead>
            <tbody>
              {data.monthly.map((m) => (
                <tr key={m.month} className={isDark ? "border-b border-white/5 text-white" : "border-b border-black/5 text-black"}>
                  <td className="px-5 py-4 font-black">{m.month}</td>
                  <td className="px-5 py-4 opacity-70">{money(m.spend)}</td>
                  <td className="px-5 py-4 opacity-70">{money(m.revenue)}</td>
                  <td className="px-5 py-4 opacity-70">{num(m.roas)}</td>
                  <td className="px-5 py-4 opacity-70">{money(m.cpa)}</td>
                  <td className="px-5 py-4 opacity-70">{num(m.purchases, 0)}</td>
                  <td className="px-5 py-4 opacity-70">{num(m.ctr)}%</td>
                  <td className="px-5 py-4 opacity-70">{num(m.purchaseCvr)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <RankTable title="Standout Ad Sets by ROAS" rows={data.adsets} nameKey="adSetName" isDark={isDark} />
        <RankTable title="Standout Creatives by ROAS" rows={data.creatives} nameKey="adName" isDark={isDark} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RankTable title="Best Campaigns by ROAS" rows={data.campaigns} nameKey="campaignName" isDark={isDark} />
        <RankTable title="Current Waste Watch" rows={data.waste} nameKey="adName" isDark={isDark} />
      </div>

      <GlassCard className="p-5">
        <h2 className="text-xl font-black">Final Monthly Recommendation</h2>
        <div className="mt-4 grid gap-3">
          <Surface className="p-4">
            <b>Budget:</b> {data.waste.length ? "Recover waste before scaling." : "Budget can be cautiously moved toward current winners."}
          </Surface>
          <Surface className="p-4">
            <b>Creative:</b> {data.creatives.length ? "Build variants from the highest ROAS creatives." : "No strong creative winner found this month yet."}
          </Surface>
          <Surface className="p-4">
            <b>Scale:</b> {data.current.roas >= settings.targetRoas ? "Scale gradually, not aggressively." : "Hold scale until ROAS and CPA improve."}
          </Surface>
        </div>
      </GlassCard>
    </div>
  );
}

function RankTable({
  title,
  rows,
  nameKey,
  isDark,
}: {
  title: string;
  rows: any[];
  nameKey: "adName" | "adSetName" | "campaignName";
  isDark: boolean;
}) {
  return (
    <GlassCard className="overflow-hidden">
      <div className="border-b border-current/10 p-5">
        <h2 className="text-xl font-black">{title}</h2>
        <MutedText className="mt-1 text-sm">Full names shown for execution clarity.</MutedText>
      </div>

      <div className="metaos-scroll-table overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className={isDark ? "border-b border-white/10 bg-white/[0.04] text-[11px] uppercase tracking-[0.16em] text-white/45" : "border-b border-black/10 bg-black/[0.035] text-[11px] uppercase tracking-[0.16em] text-black/55"}>
            <tr>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Spend</th>
              <th className="px-5 py-4">Revenue</th>
              <th className="px-5 py-4">ROAS</th>
              <th className="px-5 py-4">CPA</th>
              <th className="px-5 py-4">Purchases</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={`${row[nameKey]}-${index}`} className={isDark ? "border-b border-white/5 text-white" : "border-b border-black/5 text-black"}>
                  <td className="min-w-[980px] whitespace-normal break-words px-5 py-4 font-black">{row[nameKey]}</td>
                  <td className="px-5 py-4 opacity-70">{money(row.spend)}</td>
                  <td className="px-5 py-4 opacity-70">{money(row.revenue)}</td>
                  <td className="px-5 py-4 font-black text-emerald-400">{num(row.roas)}</td>
                  <td className="px-5 py-4 opacity-70">{money(row.cpa)}</td>
                  <td className="px-5 py-4 opacity-70">{num(row.purchases, 0)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-5 py-5 opacity-60" colSpan={6}>No qualifying data found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
