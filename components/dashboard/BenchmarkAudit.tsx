"use client";

import { useMemo, useState } from "react";
import { useMetaStore } from "@/store/metaStore";
import { onlyLiveRows } from "@/lib/liveFilter";
import {
  GlassCard,
  MetricCard,
  MutedText,
  PageHeader,
  Surface,
  TonePill,
} from "@/components/cards/MetaCards";

type AuditLevel = "campaign" | "adset" | "ad";
type PeriodKey = "yesterday" | "l7" | "l30" | "l60" | "lifetime";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function revenueValue(row: any) {
  return Number(
    row.revenue ??
      row.purchaseValue ??
      row.purchase_value ??
      row.purchaseConversionValue ??
      row.purchase_conversion_value ??
      row.conversionValue ??
      row.conversion_value ??
      row["Purchases conversion value"] ??
      row["Purchase conversion value"] ??
      row["Purchase Value"] ??
      0
  );
}

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKey(value?: string) {
  const d = parseDate(value);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function getLatestDate(rows: any[]) {
  const dates = rows.map((r) => parseDate(r.date)).filter(Boolean) as Date[];
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

function isSameDate(row: any, target: Date | null) {
  if (!target) return false;
  return dateKey(row.date) === dateKey(target.toISOString());
}

function windowRows(rows: any[], days: number, latestDate: Date | null) {
  if (!latestDate) return [];
  const start = new Date(latestDate);
  start.setDate(start.getDate() - days + 1);

  return rows.filter((row) => {
    const d = parseDate(row.date);
    if (!d) return false;
    return d >= start && d <= latestDate;
  });
}

function summarize(rows: any[]) {
  const spend = rows.reduce((s, r) => s + Number(r.spend || 0), 0);
  const revenue = rows.reduce((s, r) => s + revenueValue(r), 0);
  const purchases = rows.reduce((s, r) => s + Number(r.purchases || 0), 0);
  const impressions = rows.reduce((s, r) => s + Number(r.impressions || 0), 0);
  const clicks = rows.reduce((s, r) => s + Number(r.clicks || r.linkClicks || 0), 0);
  const lpv = rows.reduce((s, r) => s + Number(r.landingPageViews || 0), 0);
  const atc = rows.reduce((s, r) => s + Number(r.addToCart || 0), 0);

  return {
    spend,
    revenue,
    purchases,
    impressions,
    clicks,
    lpv,
    atc,
    cpa: safeDiv(spend, purchases),
    roas: safeDiv(revenue, spend),
    aov: safeDiv(revenue, purchases),
    ctr: safeDiv(clicks, impressions) * 100,
    clickToLpv: safeDiv(lpv, clicks) * 100,
    lpvToAtc: safeDiv(atc, lpv) * 100,
  };
}

function entityKey(row: any, level: AuditLevel) {
  if (level === "campaign") return String(row.campaignId || row.campaignName || "Unknown");
  if (level === "adset") return String(row.adSetId || row.adsetId || row.adSetName || row.adsetName || "Unknown");
  return String(row.adId || row.adName || "Unknown");
}

function entityName(row: any, level: AuditLevel) {
  if (level === "campaign") return String(row.campaignName || "Unknown Campaign");
  if (level === "adset") return String(row.adSetName || row.adsetName || "Unknown Ad Set");
  return String(row.adName || "Unknown Ad");
}

function levelLabel(level: AuditLevel) {
  if (level === "campaign") return "Campaign";
  if (level === "adset") return "Ad Set";
  return "Ad";
}

function periodLabel(period: PeriodKey) {
  if (period === "yesterday") return "Yesterday";
  if (period === "l7") return "Last 7D";
  if (period === "l30") return "Last 30D";
  if (period === "l60") return "Last 60D";
  return "Lifetime";
}

function makeAuditRows(rows: any[], level: AuditLevel, latestDate: Date | null, settings: any) {
  const yesterdayRows = rows.filter((r) => isSameDate(r, latestDate));
  const liveKeys = new Set(
    yesterdayRows
      .filter((r) => Number(r.impressions || 0) > 0 || Number(r.spend || 0) > 0)
      .map((r) => entityKey(r, level))
  );

  const windows = {
    yesterday: yesterdayRows,
    l7: windowRows(rows, 7, latestDate),
    l30: windowRows(rows, 30, latestDate),
    l60: windowRows(rows, 60, latestDate),
    lifetime: rows,
  };

  const map = new Map<string, any>();

  rows.forEach((row) => {
    const key = entityKey(row, level);
    if (!liveKeys.has(key)) return;

    if (!map.has(key)) {
      map.set(key, {
        key,
        name: entityName(row, level),
        campaignName: row.campaignName || "",
        adSetName: row.adSetName || row.adsetName || "",
      });
    }
  });

  const entities = Array.from(map.values()).map((item) => {
    const byPeriod: any = {};

    Object.entries(windows).forEach(([period, periodRows]) => {
      byPeriod[period] = summarize(periodRows.filter((row) => entityKey(row, level) === item.key));
    });

    return {
      ...item,
      ...byPeriod,
    };
  });

  const validL30 = entities.filter((e) => e.l30.spend > 0 && e.l30.purchases > 0);
  const roasBench =
    validL30.map((e) => e.l30.roas).sort((a, b) => b - a)[Math.max(0, Math.floor(validL30.length * 0.2) - 1)] ||
    settings.targetRoas ||
    1;

  const cpaBench =
    validL30.map((e) => e.l30.cpa).sort((a, b) => a - b)[Math.max(0, Math.floor(validL30.length * 0.2) - 1)] ||
    settings.targetCpa ||
    1500;

  return entities
    .map((e) => {
      let action = "Watch";
      let tone: "green" | "red" | "yellow" | "blue" | "neutral" = "neutral";
      let reason = "Active yesterday. Not enough strict signal to scale or cut.";

      if (e.yesterday.spend >= 3000 && e.yesterday.purchases === 0) {
        action = "Pause / Reduce Today";
        tone = "red";
        reason = "Yesterday spent above threshold with zero purchase.";
      } else if (e.yesterday.purchases > 0 && e.yesterday.cpa > Math.max(cpaBench, settings.targetCpa || 0) * 1.5) {
        action = "Cut Today";
        tone = "red";
        reason = "Yesterday CPA is more than 1.5x high benchmark.";
      } else if (e.yesterday.roas > 0 && e.yesterday.roas < Math.max(roasBench, settings.targetRoas || 0.8) * 0.5) {
        action = "Reduce / Diagnose";
        tone = "red";
        reason = "Yesterday ROAS is below 50% of high benchmark.";
      } else if (
        e.yesterday.purchases >= 3 &&
        e.yesterday.roas >= Math.max(roasBench * 0.9, settings.targetRoas || 0.8) &&
        e.yesterday.cpa <= Math.min(cpaBench * 1.1, settings.targetCpa || cpaBench)
      ) {
        action = "Scale Carefully";
        tone = "green";
        reason = "Yesterday beats high benchmark. Scale carefully without editing the winning setup.";
      } else if (e.l7.purchases >= 10 && e.l7.roas >= Math.max(roasBench * 0.85, settings.targetRoas || 0.8)) {
        action = "Protect";
        tone = "blue";
        reason = "L7 is strong. Protect and avoid unnecessary edits.";
      } else if (e.yesterday.clickToLpv >= 60 && e.yesterday.lpvToAtc < 8 && e.yesterday.spend > 3000) {
        action = "Fix PDP / Offer";
        tone = "yellow";
        reason = "Traffic reaches site but LPV to ATC is weak.";
      }

      return {
        ...e,
        action,
        tone,
        reason,
      };
    })
    .sort((a, b) => {
      const p = (x: any) => (x.tone === "red" ? 1 : x.tone === "green" ? 2 : x.tone === "yellow" ? 3 : x.tone === "blue" ? 4 : 5);
      return p(a) - p(b) || b.yesterday.spend - a.yesterday.spend || b.l7.spend - a.l7.spend;
    });
}

export function BenchmarkAudit() {
  const { performanceRows, settings } = useMetaStore();
  const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);
  const latestDate = useMemo(() => getLatestDate(liveRows), [liveRows]);

  const [level, setLevel] = useState<AuditLevel>("campaign");
  const [period, setPeriod] = useState<PeriodKey>("yesterday");

  const rows = useMemo(
    () => makeAuditRows(liveRows, level, latestDate, settings),
    [liveRows, level, latestDate, settings]
  );

  const summary = useMemo(() => {
    const total = rows.reduce(
      (acc, row) => {
        const p = row[period];
        acc.spend += p.spend;
        acc.revenue += p.revenue;
        acc.purchases += p.purchases;
        if (row.tone === "red") acc.cut += 1;
        if (row.tone === "green") acc.scale += 1;
        if (row.tone === "yellow") acc.fix += 1;
        if (row.tone === "blue") acc.protect += 1;
        return acc;
      },
      { spend: 0, revenue: 0, purchases: 0, cut: 0, scale: 0, fix: 0, protect: 0 }
    );

    return {
      ...total,
      roas: safeDiv(total.revenue, total.spend),
      cpa: safeDiv(total.spend, total.purchases),
      aov: safeDiv(total.revenue, total.purchases),
    };
  }, [rows, period]);

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8 min-w-0">
        <h2 className="text-2xl font-black">Performance Benchmark</h2>
        <MutedText className="mt-2">Upload Meta data first.</MutedText>
      </GlassCard>
    );
  }

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        eyebrow="Performance Benchmark"
        title="Yesterday-Led Campaign, Ad Set & Ad Audit"
        description="High-standard audit for live entities only. Yesterday drives today’s action; L7/L30/L60/lifetime provide benchmark context."
      />

      <GlassCard className="p-4 min-w-0">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <TonePill tone="blue">Live Entities Only</TonePill>
              <TonePill tone="yellow">High Benchmark</TonePill>
              <TonePill tone="neutral">Latest: {latestDate ? dateKey(latestDate.toISOString()) : "NA"}</TonePill>
            </div>

            <h2 className="mt-4 text-2xl font-black">
              {levelLabel(level)} Audit · {periodLabel(period)}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["campaign", "adset", "ad"] as AuditLevel[]).map((x) => (
              <button
                key={x}
                onClick={() => setLevel(x)}
                className={
                  level === x
                    ? "rounded-full bg-[#0A84FF] px-4 py-2 text-xs font-black text-white"
                    : "rounded-full border border-current/10 px-4 py-2 text-xs font-black opacity-70"
                }
              >
                {levelLabel(x)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(["yesterday", "l7", "l30", "l60", "lifetime"] as PeriodKey[]).map((x) => (
            <button
              key={x}
              onClick={() => setPeriod(x)}
              className={
                period === x
                  ? "rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-black"
                  : "rounded-full border border-current/10 px-4 py-2 text-xs font-black opacity-70"
              }
            >
              {periodLabel(x)}
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={`${periodLabel(period)} Spend`} value={money(summary.spend)} tone="neutral" />
        <MetricCard label={`${periodLabel(period)} ROAS`} value={num(summary.roas)} tone={summary.roas >= settings.targetRoas ? "green" : "red"} />
        <MetricCard label={`${periodLabel(period)} CPA`} value={money(summary.cpa)} tone={summary.cpa <= settings.targetCpa ? "green" : "yellow"} />
        <MetricCard label={`${periodLabel(period)} AOV`} value={money(summary.aov)} tone="blue" />
        <MetricCard label="Scale" value={String(summary.scale)} tone="green" />
        <MetricCard label="Cut / Reduce" value={String(summary.cut)} tone={summary.cut ? "red" : "green"} />
        <MetricCard label="Fix" value={String(summary.fix)} tone={summary.fix ? "yellow" : "green"} />
        <MetricCard label="Protect" value={String(summary.protect)} tone="blue" />
      </div>

      <GlassCard className="overflow-hidden min-w-0">
        <div className="border-b border-current/10 p-4">
          <h2 className="text-xl font-black">{levelLabel(level)} Audit Table</h2>
          <MutedText className="mt-1 text-sm">
            Amount spent, CPA, ROAS and AOV across yesterday, L7, L30, L60 and lifetime while live.
          </MutedText>
        </div>

        <div className="metaos-scroll-table overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left text-sm">
            <thead className="border-b border-current/10 bg-current/[0.04] text-[11px] uppercase tracking-[0.16em] opacity-55">
              <tr>
                <th className="sticky left-0 z-10 bg-[#15181d] px-4 py-3">Name</th>
                <th className="sticky left-[360px] z-10 bg-[#15181d] px-4 py-3">Action</th>
                <th className="px-4 py-3">Y Spend</th>
                <th className="px-4 py-3">Y CPA</th>
                <th className="px-4 py-3">Y ROAS</th>
                <th className="px-4 py-3">Y AOV</th>
                <th className="px-4 py-3">7D Spend</th>
                <th className="px-4 py-3">7D CPA</th>
                <th className="px-4 py-3">7D ROAS</th>
                <th className="px-4 py-3">30D ROAS</th>
                <th className="px-4 py-3">60D ROAS</th>
                <th className="px-4 py-3">Life ROAS</th>
              </tr>
            </thead>

            <tbody>
              {rows.slice(0, 100).map((row) => (
                <tr key={row.key} className="border-b border-current/10 align-top">
                  <td className="sticky left-0 z-10 max-w-[360px] bg-[#101318] px-4 py-3">
                    <p className="font-black leading-6 whitespace-normal break-words">{row.name}</p>
                    {level !== "campaign" && (
                      <p className="mt-1 text-xs leading-5 opacity-55">
                        Campaign: {row.campaignName}
                        {level === "ad" && (
                          <>
                            <br />
                            Ad Set: {row.adSetName}
                          </>
                        )}
                      </p>
                    )}
                    <p className="mt-2 text-xs leading-5 opacity-70">{row.reason}</p>
                  </td>

                  <td className="px-4 py-3">
                    <TonePill tone={row.tone}>{row.action}</TonePill>
                  </td>

                  <td className="px-4 py-3 opacity-75">{money(row.yesterday.spend)}</td>
                  <td className="px-4 py-3 opacity-75">{money(row.yesterday.cpa)}</td>
                  <td className="px-4 py-3 font-black text-emerald-400">{num(row.yesterday.roas)}</td>
                  <td className="px-4 py-3 opacity-75">{money(row.yesterday.aov)}</td>

                  <td className="px-4 py-3 opacity-75">{money(row.l7.spend)}</td>
                  <td className="px-4 py-3 opacity-75">{money(row.l7.cpa)}</td>
                  <td className="px-4 py-3 opacity-75">{num(row.l7.roas)}</td>
                  <td className="px-4 py-3 opacity-75">{num(row.l30.roas)}</td>
                  <td className="px-4 py-3 opacity-75">{num(row.l60.roas)}</td>
                  <td className="px-4 py-3 opacity-75">{num(row.lifetime.roas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
