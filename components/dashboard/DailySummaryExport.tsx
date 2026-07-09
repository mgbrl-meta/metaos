"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Clipboard,
  Download,
  FileText,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
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

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`;
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

function betweenDates(row: any, start: Date, end: Date) {
  const d = parseDate(row.date);
  if (!d) return false;
  return d >= start && d <= end;
}

function isSameDate(row: any, target: Date | null) {
  if (!target) return false;
  return dateKey(row.date) === dateKey(target.toISOString());
}

function windowRows(rows: any[], days: number, latestDate: Date | null, offsetDays = 0) {
  if (!latestDate) return [];

  const end = new Date(latestDate);
  end.setDate(end.getDate() - offsetDays);

  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);

  return rows.filter((row) => betweenDates(row, start, end));
}

function summarize(rows: any[]) {
  const spend = rows.reduce((s, r) => s + Number(r.spend || 0), 0);
  const revenue = rows.reduce((s, r) => s + revenueValue(r), 0);
  const purchases = rows.reduce((s, r) => s + Number(r.purchases || 0), 0);
  const impressions = rows.reduce((s, r) => s + Number(r.impressions || 0), 0);
  const clicks = rows.reduce((s, r) => s + Number(r.clicks || r.linkClicks || 0), 0);
  const lpv = rows.reduce((s, r) => s + Number(r.landingPageViews || 0), 0);
  const atc = rows.reduce((s, r) => s + Number(r.addToCart || 0), 0);
  const checkout = rows.reduce((s, r) => s + Number(r.checkoutsInitiated || 0), 0);

  return {
    spend,
    revenue,
    purchases,
    impressions,
    clicks,
    lpv,
    atc,
    checkout,
    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, purchases),
    aov: safeDiv(revenue, purchases),
    cpm: safeDiv(spend, impressions) * 1000,
    cpc: safeDiv(spend, clicks),
    ctr: safeDiv(clicks, impressions) * 100,
    clickToLpv: safeDiv(lpv, clicks) * 100,
    lpvToAtc: safeDiv(atc, lpv) * 100,
    checkoutToPurchase: safeDiv(purchases, checkout) * 100,
    cvr: safeDiv(purchases, clicks) * 100,
  };
}

function delta(current: number, previous: number) {
  if (!previous || !Number.isFinite(previous)) return 0;
  return ((current - previous) / previous) * 100;
}

function adKey(row: any) {
  return String(row.adId || row.adName || "Unknown Ad");
}

function aggregateAds(rows: any[]) {
  const map = new Map<string, any>();

  rows.forEach((row) => {
    const key = adKey(row);

    if (!map.has(key)) {
      map.set(key, {
        key,
        adName: row.adName || "Unknown Ad",
        campaignName: row.campaignName || "Unknown Campaign",
        adSetName: row.adSetName || row.adsetName || "Unknown Ad Set",
        rows: [],
      });
    }

    map.get(key).rows.push(row);
  });

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      ...summarize(item.rows),
    }))
    .sort((a, b) => b.spend - a.spend);
}

function recommendation(row: any, settings: any) {
  if (row.spend >= 3000 && row.purchases === 0) {
    if (row.ctr >= settings.targetCtrPct && row.clickToLpv >= 60) {
      return {
        action: "Pause / Rebuild",
        tone: "red" as const,
        why: "Spend crossed threshold with zero purchases, but traffic is reaching the site.",
        step: "Pause today. Rebuild only after improving PDP/offer/message match or adding stronger proof.",
      };
    }

    return {
      action: "Pause",
      tone: "red" as const,
      why: "Spend crossed threshold with zero purchase signal.",
      step: "Pause today. Relaunch only with a stronger hook, clearer first frame and sharper product promise.",
    };
  }

  if (row.purchases > 0 && row.cpa > settings.targetCpa * 1.4) {
    return {
      action: "Reduce",
      tone: "red" as const,
      why: "CPA is materially above target.",
      step: "Reduce budget. Check whether this creative is attracting low-AOV or low-intent buyers.",
    };
  }

  if (row.roas >= settings.targetRoas && row.cpa <= settings.targetCpa && row.purchases >= 3) {
    return {
      action: "Scale Carefully",
      tone: "green" as const,
      why: "Creative is beating target economics with purchase signal.",
      step: "Increase slowly. Do not edit the winning ad. Create 2–3 variants from the same hook/proof/offer.",
    };
  }

  if (row.purchases >= 5 && row.roas >= settings.targetRoas * 0.85) {
    return {
      action: "Protect",
      tone: "blue" as const,
      why: "Good signal but not strong enough for aggressive scale.",
      step: "Do not touch. Monitor CPA, ROAS, AOV and frequency tomorrow.",
    };
  }

  if (row.ctr < settings.targetCtrPct && row.impressions > 1000) {
    return {
      action: "Refresh Creative",
      tone: "yellow" as const,
      why: "CTR is below target. Hook or creative relevance is weak.",
      step: "Create a new first frame, sharper pain-point hook, stronger product proof and more direct outcome.",
    };
  }

  if (row.clickToLpv >= 60 && row.lpvToAtc < 8 && row.spend > 3000) {
    return {
      action: "Fix PDP / Offer",
      tone: "yellow" as const,
      why: "Traffic reaches the site but does not add to cart.",
      step: "Check PDP hero, offer clarity, reviews, claims, price anchoring and trust cues.",
    };
  }

  return {
    action: "Watch",
    tone: "neutral" as const,
    why: "Active but not enough decisive signal.",
    step: "Keep stable. Review again tomorrow using yesterday plus last 7 days trend.",
  };
}

function confidence(row: any) {
  if (row.spend >= 30000 && row.purchases >= 10) return "High";
  if (row.spend >= 10000 || row.purchases >= 3) return "Medium";
  return "Low";
}

function buildReportText(data: any) {
  const lines: string[] = [];

  lines.push("METAOS DAILY EXECUTION REPORT");
  lines.push(`Date: ${data.latestDate}`);
  lines.push("Filter: live/spending ads only. Paused/stopped ads are ignored for recommendations.");
  lines.push("");

  lines.push("ACCOUNT MODE");
  lines.push(data.accountMode.label);
  lines.push("");

  lines.push("YESTERDAY PERFORMANCE");
  lines.push(`Spend: ${money(data.yesterday.spend)}`);
  lines.push(`Revenue: ${money(data.yesterday.revenue)}`);
  lines.push(`Purchases: ${num(data.yesterday.purchases, 0)}`);
  lines.push(`ROAS: ${num(data.yesterday.roas)}`);
  lines.push(`CPA: ${money(data.yesterday.cpa)}`);
  lines.push(`AOV: ${money(data.yesterday.aov)}`);
  lines.push(`CTR: ${num(data.yesterday.ctr)}%`);
  lines.push(`LPV→ATC: ${num(data.yesterday.lpvToAtc)}%`);
  lines.push("");

  lines.push("ACTION COUNTS");
  lines.push(`Pause / Reduce: ${data.pause.length}`);
  lines.push(`Scale Carefully: ${data.scale.length}`);
  lines.push(`Protect / Do Not Touch: ${data.protect.length}`);
  lines.push(`Creative / PDP Fix: ${data.fix.length}`);
  lines.push("");

  lines.push("PAUSE / REDUCE FIRST");
  data.pause.slice(0, 12).forEach((row: any, i: number) => {
    lines.push(`${i + 1}. ${row.adName}`);
    lines.push(`   Spend ${money(row.spend)} | ROAS ${num(row.roas)} | CPA ${money(row.cpa)} | Purchases ${num(row.purchases, 0)}`);
    lines.push(`   Why: ${row.rec.why}`);
    lines.push(`   Step: ${row.rec.step}`);
  });
  lines.push("");

  lines.push("SCALE / PROTECT");
  [...data.scale.slice(0, 8), ...data.protect.slice(0, 8)].forEach((row: any, i: number) => {
    lines.push(`${i + 1}. ${row.adName}`);
    lines.push(`   Action: ${row.rec.action}`);
    lines.push(`   Spend ${money(row.spend)} | ROAS ${num(row.roas)} | CPA ${money(row.cpa)} | Purchases ${num(row.purchases, 0)}`);
    lines.push(`   Step: ${row.rec.step}`);
  });
  lines.push("");

  lines.push("CREATIVE PRODUCTION BRIEF");
  data.creativeBriefs.slice(0, 10).forEach((brief: string, i: number) => {
    lines.push(`${i + 1}. ${brief}`);
  });
  lines.push("");

  lines.push("BUDGET REALLOCATION");
  lines.push(`Cut / Reduce Pool: ${money(data.cutPool)}`);
  lines.push(`Safe Reallocation Today: ${money(data.cutPool * 0.4)}`);
  lines.push(`Hold as Test Reserve: ${money(data.cutPool * 0.6)}`);

  return lines.join("\n");
}

export function DailySummaryExport() {
  const { performanceRows, settings } = useMetaStore();
  const [copied, setCopied] = useState(false);

  const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);
  const latestDate = useMemo(() => getLatestDate(liveRows), [liveRows]);

  const data = useMemo(() => {
    const yesterdayRows = liveRows.filter((r) => isSameDate(r, latestDate));
    const previousRows = windowRows(liveRows, 1, latestDate, 1);
    const l7Rows = windowRows(liveRows, 7, latestDate);

    const yesterday = summarize(yesterdayRows);
    const previous = summarize(previousRows);
    const l7 = summarize(l7Rows);

    const yAds = aggregateAds(yesterdayRows)
      .filter((row) => Number(row.impressions || 0) > 0 || Number(row.spend || 0) > 0)
      .map((row) => {
        const rec = recommendation(row, settings);
        return {
          ...row,
          rec,
          confidence: confidence(row),
        };
      });

    const pause = yAds.filter((r) => r.rec.tone === "red").sort((a, b) => b.spend - a.spend);
    const scale = yAds.filter((r) => r.rec.action === "Scale Carefully").sort((a, b) => b.roas - a.roas);
    const protect = yAds.filter((r) => r.rec.action === "Protect").sort((a, b) => b.spend - a.spend);
    const fix = yAds.filter((r) => r.rec.tone === "yellow").sort((a, b) => b.spend - a.spend);

    const cutPool = pause.reduce((s, r) => s + r.spend, 0);

    const doNotTouch = yAds
      .filter((r) => r.purchases >= 3 && r.roas >= settings.targetRoas && r.cpa <= settings.targetCpa)
      .sort((a, b) => b.spend - a.spend);

    const lifetimeWaste = aggregateAds(liveRows)
      .filter((r) => r.spend > 3000 && r.purchases === 0)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10);

    const creativeBriefs = [
      ...scale.slice(0, 3).map((r) => `Create 2 variants from winner: ${r.adName}. Keep the core promise; change first frame and proof style.`),
      ...pause.slice(0, 3).map((r) => `Rebuild weak ad: ${r.adName}. Current issue: ${r.rec.why}`),
      ...fix.slice(0, 3).map((r) => `Make PDP/offer-focused variant for: ${r.adName}. Add proof, reviews, price anchoring and clearer outcome.`),
      ...lifetimeWaste.slice(0, 2).map((r) => `Stop/rebuild lifetime zero-purchase creative: ${r.adName}. Spend ${money(r.spend)} with zero purchases.`),
    ];

    const deltas = {
      spend: delta(yesterday.spend, previous.spend),
      revenue: delta(yesterday.revenue, previous.revenue),
      purchases: delta(yesterday.purchases, previous.purchases),
      roas: delta(yesterday.roas, previous.roas),
      cpa: delta(yesterday.cpa, previous.cpa),
      aov: delta(yesterday.aov, previous.aov),
      ctr: delta(yesterday.ctr, previous.ctr),
    };

    const accountMode =
      pause.length >= 5
        ? { label: "Waste Control Mode", tone: "red" as const, message: "Cut waste before scale. Budget is leaking into weak live ads." }
        : scale.length >= 3
        ? { label: "Scale Mode", tone: "green" as const, message: "There are enough live winners to scale carefully." }
        : fix.length >= 3
        ? { label: "Creative / PDP Fix Mode", tone: "yellow" as const, message: "Performance is blocked by hook, PDP, offer or conversion leakage." }
        : { label: "Hold & Monitor Mode", tone: "blue" as const, message: "Keep the account stable and wait for stronger signal." };

    return {
      latestDate: latestDate ? dateKey(latestDate.toISOString()) : "",
      yesterday,
      previous,
      l7,
      deltas,
      yAds,
      pause,
      scale,
      protect,
      fix,
      cutPool,
      doNotTouch,
      lifetimeWaste,
      creativeBriefs,
      accountMode,
    };
  }, [liveRows, latestDate, settings]);

  const reportText = useMemo(() => buildReportText(data), [data]);

  async function copyToClipboard() {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  function downloadReport() {
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metaos-daily-execution-report-${data.latestDate || "latest"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8 min-w-0">
        <h2 className="text-2xl font-black">Team Summary</h2>
        <MutedText className="mt-2">Upload Meta data first.</MutedText>
      </GlassCard>
    );
  }

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        eyebrow="Team Summary"
        title="Daily Performance Execution Report"
        description="A professional action report for performance, creative and website teams. Yesterday decides today’s action; last 7 days gives context."
      />

      <GlassCard className="p-5 min-w-0">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <TonePill tone={data.accountMode.tone}>{data.accountMode.label}</TonePill>
              <TonePill tone="blue">Yesterday-Led</TonePill>
              <TonePill tone="neutral">Live Ads Only</TonePill>
              <TonePill tone="neutral">Date: {data.latestDate}</TonePill>
            </div>

            <h2 className="mt-4 max-w-5xl text-3xl font-black leading-tight">
              {data.accountMode.message}
            </h2>

            <MutedText className="mt-3 max-w-4xl text-sm leading-6">
              This report gives the team exact actions: what to pause, what to reduce, what to protect, what to scale, what creative to make next and what not to touch.
            </MutedText>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center gap-2 rounded-full bg-[#0A84FF] px-5 py-3 text-xs font-black text-white"
            >
              <Clipboard className="h-4 w-4" />
              {copied ? "Copied" : "Copy Report"}
            </button>

            <button
              onClick={downloadReport}
              className="inline-flex items-center gap-2 rounded-full border border-current/10 px-5 py-3 text-xs font-black"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
      </GlassCard>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Yesterday Spend" value={money(data.yesterday.spend)} tone="neutral" />
        <MetricCard label="Yesterday ROAS" value={num(data.yesterday.roas)} tone={data.yesterday.roas >= settings.targetRoas ? "green" : "red"} />
        <MetricCard label="Yesterday CPA" value={money(data.yesterday.cpa)} tone={data.yesterday.cpa <= settings.targetCpa ? "green" : "yellow"} />
        <MetricCard label="Yesterday AOV" value={money(data.yesterday.aov)} tone="blue" />
        <MetricCard label="Pause / Reduce" value={String(data.pause.length)} tone={data.pause.length ? "red" : "green"} />
        <MetricCard label="Scale Carefully" value={String(data.scale.length)} tone={data.scale.length ? "green" : "neutral"} />
        <MetricCard label="Protect" value={String(data.protect.length)} tone="blue" />
        <MetricCard label="Creative / PDP Fix" value={String(data.fix.length)} tone={data.fix.length ? "yellow" : "green"} />
      </div>

      <GlassCard className="p-5 min-w-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#0A84FF]" />
          <h2 className="text-xl font-black">Yesterday vs Previous Day</h2>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DeltaCard label="Spend" value={data.deltas.spend} lowerIsBetter={false} />
          <DeltaCard label="Revenue" value={data.deltas.revenue} lowerIsBetter={false} />
          <DeltaCard label="Purchases" value={data.deltas.purchases} lowerIsBetter={false} />
          <DeltaCard label="ROAS" value={data.deltas.roas} lowerIsBetter={false} />
          <DeltaCard label="CPA" value={data.deltas.cpa} lowerIsBetter />
          <DeltaCard label="AOV" value={data.deltas.aov} lowerIsBetter={false} />
          <DeltaCard label="CTR" value={data.deltas.ctr} lowerIsBetter={false} />
          <DeltaCard label="Cut Pool" value={data.cutPool} isMoney />
        </div>
      </GlassCard>

      <div className="grid min-w-0 gap-6 2xl:grid-cols-2">
        <PriorityPanel
          title="Pause / Reduce First"
          icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
          rows={data.pause}
          empty="No urgent pause/reduce action."
        />

        <PriorityPanel
          title="Scale / Protect"
          icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />}
          rows={[...data.scale, ...data.protect]}
          empty="No clean scale/protect list today."
        />
      </div>

      <div className="grid min-w-0 gap-6 2xl:grid-cols-2">
        <GlassCard className="p-5 min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-black">Creative Production Brief</h2>
          </div>

          <MutedText className="mt-1 text-sm">
            Give this directly to the creative team for today’s production queue.
          </MutedText>

          <div className="mt-5 grid gap-3">
            {data.creativeBriefs.slice(0, 10).map((brief, index) => (
              <Surface key={`${brief}-${index}`} className="p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] opacity-45">
                  Brief {index + 1}
                </p>
                <p className="mt-2 text-sm leading-6 opacity-85">{brief}</p>
              </Surface>
            ))}

            {!data.creativeBriefs.length && (
              <Surface className="p-4">
                <p className="text-sm opacity-70">No urgent creative brief generated today.</p>
              </Surface>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-5 min-w-0">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-[#0A84FF]" />
            <h2 className="text-xl font-black">Budget Reallocation Map</h2>
          </div>

          <div className="mt-5 grid gap-4">
            <BudgetCard label="Cut / Reduce Pool" value={data.cutPool} tone="red" note="From yesterday’s weak or waste ads." />
            <BudgetCard label="Safe Reallocation Today" value={data.cutPool * 0.4} tone="green" note="Move only 30–50% into proven winners." />
            <BudgetCard label="Hold as Test Reserve" value={data.cutPool * 0.6} tone="blue" note="Reserve for tomorrow’s signal and new creative tests." />
          </div>
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden min-w-0">
        <div className="border-b border-current/10 p-5">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#0A84FF]" />
            <h2 className="text-xl font-black">Copy-Ready Full Report</h2>
          </div>
          <MutedText className="mt-1 text-sm">
            Structured plain-text version for WhatsApp, email or internal notes.
          </MutedText>
        </div>

        <pre className="max-h-[540px] overflow-auto whitespace-pre-wrap p-5 text-sm leading-7 opacity-80">
          {reportText}
        </pre>
      </GlassCard>
    </div>
  );
}

function DeltaCard({
  label,
  value,
  lowerIsBetter = false,
  isMoney = false,
}: {
  label: string;
  value: number;
  lowerIsBetter?: boolean;
  isMoney?: boolean;
}) {
  const good = isMoney ? false : lowerIsBetter ? value < 0 : value > 0;
  const neutral = !value || Math.abs(value) < 2;

  return (
    <Surface className="p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] opacity-45">{label}</p>
      <p
        className={
          neutral
            ? "mt-2 text-2xl font-black opacity-70"
            : good
            ? "mt-2 text-2xl font-black text-emerald-400"
            : "mt-2 text-2xl font-black text-red-400"
        }
      >
        {isMoney ? money(value) : `${value > 0 ? "+" : ""}${pct(value)}`}
      </p>
    </Surface>
  );
}

function BudgetCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  tone: "red" | "green" | "blue";
}) {
  const cls =
    tone === "red"
      ? "text-red-400"
      : tone === "green"
      ? "text-emerald-400"
      : "text-[#0A84FF]";

  return (
    <Surface className="p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] opacity-45">{label}</p>
      <p className={`mt-2 text-2xl font-black ${cls}`}>{money(value)}</p>
      <p className="mt-2 text-sm opacity-70">{note}</p>
    </Surface>
  );
}

function PriorityPanel({
  title,
  icon,
  rows,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  rows: any[];
  empty: string;
}) {
  return (
    <GlassCard className="overflow-hidden min-w-0">
      <div className="border-b border-current/10 p-5">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-black">{title}</h2>
        </div>
      </div>

      <div className="grid gap-3 p-5">
        {rows.slice(0, 10).map((row, index) => (
          <Surface key={`${row.key}-${index}`} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black leading-6 whitespace-normal break-words">{row.adName}</p>
                <MutedText className="mt-1 text-xs leading-5">
                  Campaign: {row.campaignName}
                  <br />
                  Ad Set: {row.adSetName}
                </MutedText>
              </div>

              <TonePill tone={row.rec.tone}>{row.rec.action}</TonePill>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              <Mini label="Spend" value={money(row.spend)} />
              <Mini label="ROAS" value={num(row.roas)} />
              <Mini label="CPA" value={money(row.cpa)} />
              <Mini label="Purchases" value={num(row.purchases, 0)} />
            </div>

            <p className="mt-3 text-sm leading-6 opacity-80">
              <b>Why:</b> {row.rec.why}
            </p>

            <p className="mt-2 text-sm leading-6 opacity-80">
              <b>Step:</b> {row.rec.step}
            </p>

            <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] opacity-45">
              Confidence: {row.confidence}
            </p>
          </Surface>
        ))}

        {!rows.length && <p className="text-sm opacity-60">{empty}</p>}
      </div>
    </GlassCard>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-current/10 bg-current/[0.03] p-2">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-40">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}
