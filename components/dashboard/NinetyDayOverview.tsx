"use client";

import { useMemo } from "react";
import { useMetaStore } from "@/store/metaStore";
import { onlyLiveRows } from "@/lib/liveFilter";
import { aggregateRows } from "@/lib/metrics";
import { GlassCard, MetricCard, MutedText, PageHeader, Surface, TonePill } from "@/components/cards/MetaCards";
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

function windowRows<T extends { date?: string }>(rows: T[], days: number, latestDate: Date) {
  const start = new Date(latestDate);
  start.setDate(start.getDate() - days + 1);

  return rows.filter((row) => {
    const d = parseDate(row.date);
    return d && d >= start && d <= latestDate;
  });
}

function summarize(rows: any[]) {
  const spend = rows.reduce((s, r) => s + r.spend, 0);
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const purchases = rows.reduce((s, r) => s + r.purchases, 0);
  const contribution = rows.reduce((s, r) => s + r.contributionAfterAds, 0);

  return {
    spend,
    revenue,
    purchases,
    contribution,
    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, purchases),
    aov: safeDiv(revenue, purchases),
  };
}

export function NinetyDayOverview() {
  const { performanceRows, settings } = useMetaStore();

  const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const data = useMemo(() => {
    const validDates = performanceRows
      .map((r) => parseDate(r.date))
      .filter(Boolean) as Date[];

    const latestDate = validDates.length
      ? new Date(Math.max(...validDates.map((d) => d.getTime())))
      : new Date();

    const rows7 = windowRows(liveRows, 7, latestDate);
    const rows30 = windowRows(liveRows, 30, latestDate);
    const rows60 = windowRows(liveRows, 60, latestDate);
    const rows90 = windowRows(liveRows, 90, latestDate);

    const s7 = summarize(rows7);
    const s30 = summarize(rows30);
    const s60 = summarize(rows60);
    const s90 = summarize(rows90);

    const adsets90 = aggregateRows(rows90 as any, "adset")
      .filter((r) => r.spend >= settings.minSpendForDecision && r.purchases > 0)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 10);

    const creatives90 = aggregateRows(rows90 as any, "ad")
      .filter((r) => r.spend >= settings.minSpendForDecision && r.purchases > 0)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 10);

    const recentAds7 = aggregateRows(rows7 as any, "ad");
    const waste7 = recentAds7.filter((r) => r.spend > 3000 && r.purchases === 0);
    const scale7 = recentAds7.filter((r) => r.decision === "Scale");
    const fatigue7 = recentAds7.filter((r) => r.fatigueScore >= 70);

    const roas7Vs90 = s90.roas ? ((s7.roas - s90.roas) / s90.roas) * 100 : 0;
    const cpa7Vs90 = s90.cpa ? ((s7.cpa - s90.cpa) / s90.cpa) * 100 : 0;

    const verdict =
      waste7.length > 0
        ? `Last 7 days show ${waste7.length} wasted ads. Do not scale before removing waste.`
        : s7.roas >= settings.targetRoas && s7.cpa <= settings.targetCpa
        ? `Last 7 days are healthy against the 90-day context. Scale selected winners carefully.`
        : `Last 7 days are weaker than target. Hold aggressive scaling and diagnose creative/funnel leakage.`;

    return {
      latestDate,
      rows7,
      rows30,
      rows60,
      rows90,
      s7,
      s30,
      s60,
      s90,
      adsets90,
      creatives90,
      waste7,
      scale7,
      fatigue7,
      roas7Vs90,
      cpa7Vs90,
      verdict,
    };
  }, [performanceRows, settings]);

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">90-Day Overview</h2>
        <MutedText className="mt-2">Upload Meta data first.</MutedText>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="90-Day Intelligence"
        title="Recent Performance First"
        description="The first layer focuses on last 90 days, compares 30 vs 60 vs 90 days, and uses last 7 days for current decision-making."
      />

      <GlassCard className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <TonePill tone={data.waste7.length ? "red" : "green"}>Last 7 Days</TonePill>
              <TonePill tone="blue">Context: Last 90 Days</TonePill>
            </div>
            <h2 className="mt-4 text-2xl font-black">{data.verdict}</h2>
            <MutedText className="mt-2">
              Last 7 days ROAS is {pct(data.roas7Vs90)} vs 90-day ROAS. CPA movement is {pct(data.cpa7Vs90)} vs 90-day CPA.
            </MutedText>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="L7 ROAS" value={num(data.s7.roas)} tone={data.s7.roas >= settings.targetRoas ? "green" : "red"} />
        <MetricCard label="L7 CPA" value={money(data.s7.cpa)} tone={data.s7.cpa <= settings.targetCpa ? "green" : "red"} />
        <MetricCard label="L7 Waste Ads" value={String(data.waste7.length)} tone={data.waste7.length ? "red" : "green"} />
        <MetricCard label="L7 Scale Ads" value={String(data.scale7.length)} tone={data.scale7.length ? "green" : "yellow"} />
      </div>

      <GlassCard className="overflow-hidden">
        <div className="border-b border-current/10 p-5">
          <h2 className="text-xl font-black">30 vs 60 vs 90 Day Contribution View</h2>
          <MutedText className="mt-1 text-sm">Older data is ignored here. This compares current spend pools only.</MutedText>
        </div>

        <div className="overflow-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className={isDark ? "border-b border-white/10 bg-white/[0.04] text-[11px] uppercase tracking-[0.16em] text-white/45" : "border-b border-black/10 bg-black/[0.035] text-[11px] uppercase tracking-[0.16em] text-black/55"}>
              <tr>
                <th className="px-5 py-4">Window</th>
                <th className="px-5 py-4">Spend</th>
                <th className="px-5 py-4">Revenue</th>
                <th className="px-5 py-4">ROAS</th>
                <th className="px-5 py-4">CPA</th>
                <th className="px-5 py-4">Purchases</th>
                <th className="px-5 py-4">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Last 30 Days", data.s30],
                ["Last 60 Days", data.s60],
                ["Last 90 Days", data.s90],
              ].map(([label, item]: any) => (
                <tr key={label} className={isDark ? "border-b border-white/5 text-white" : "border-b border-black/5 text-black"}>
                  <td className="px-5 py-4 font-black">{label}</td>
                  <td className="px-5 py-4 opacity-70">{money(item.spend)}</td>
                  <td className="px-5 py-4 opacity-70">{money(item.revenue)}</td>
                  <td className="px-5 py-4 opacity-70">{num(item.roas)}</td>
                  <td className="px-5 py-4 opacity-70">{money(item.cpa)}</td>
                  <td className="px-5 py-4 opacity-70">{num(item.purchases, 0)}</td>
                  <td className="px-5 py-4 opacity-70">{money(item.contribution)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <StandoutTable
          title="Standout Ad Sets by ROAS"
          subtitle="Based on last 90 days, filtered for spend and purchases."
          rows={data.adsets90}
          nameKey="adSetName"
          isDark={isDark}
        />

        <StandoutTable
          title="Standout Creatives by ROAS"
          subtitle="Full ad names shown. Based on last 90 days."
          rows={data.creatives90}
          nameKey="adName"
          isDark={isDark}
        />
      </div>
    </div>
  );
}

function StandoutTable({
  title,
  subtitle,
  rows,
  nameKey,
  isDark,
}: {
  title: string;
  subtitle: string;
  rows: any[];
  nameKey: "adName" | "adSetName";
  isDark: boolean;
}) {
  return (
    <GlassCard className="overflow-hidden">
      <div className="border-b border-current/10 p-5">
        <h2 className="text-xl font-black">{title}</h2>
        <MutedText className="mt-1 text-sm">{subtitle}</MutedText>
      </div>

      <div className="overflow-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
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
            {rows.map((row, index) => (
              <tr key={`${row[nameKey]}-${index}`} className={isDark ? "border-b border-white/5 text-white" : "border-b border-black/5 text-black"}>
                <td className="min-w-[320px] px-5 py-4 font-black whitespace-normal break-words">{row[nameKey]}</td>
                <td className="px-5 py-4 opacity-70">{money(row.spend)}</td>
                <td className="px-5 py-4 opacity-70">{money(row.revenue)}</td>
                <td className="px-5 py-4 font-black text-emerald-400">{num(row.roas)}</td>
                <td className="px-5 py-4 opacity-70">{money(row.cpa)}</td>
                <td className="px-5 py-4 opacity-70">{num(row.purchases, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}