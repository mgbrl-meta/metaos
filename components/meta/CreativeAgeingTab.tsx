"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock3, Sparkles, TrendingUp } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";
import { onlyLiveRows } from "@/lib/liveFilter";
import type { MetaPerformanceRow } from "@/types/meta";

type Row = Record<string, any>;
type WindowKey = "yesterday" | "l7" | "l15" | "l30";

const WINDOWS: Array<{ key: WindowKey; label: string; days: number; description: string }> = [
  { key: "yesterday", label: "Yesterday", days: 1, description: "Latest available calendar date" },
  { key: "l7", label: "L7D", days: 7, description: "Last 7 calendar days" },
  { key: "l15", label: "L15D", days: 15, description: "Last 15 calendar days" },
  { key: "l30", label: "L30D", days: 30, description: "Last 30 calendar days" },
];

const AGE_COHORTS = [
  { key: "d0_7", label: "≤7D", title: "0–7 days", min: 0, max: 7 },
  { key: "d8_14", label: "8–14D", title: "8–14 days", min: 8, max: 14 },
  { key: "d15_30", label: "15–30D", title: "15–30 days", min: 15, max: 30 },
  { key: "d31_45", label: "31–45D", title: "31–45 days", min: 31, max: 45 },
  { key: "d46_60", label: "46–60D", title: "46–60 days", min: 46, max: 60 },
  { key: "d61_90", label: "61–90D", title: "61–90 days", min: 61, max: 90 },
  { key: "d91_120", label: "91–120D", title: "91–120 days", min: 91, max: 120 },
  { key: "d121_180", label: "121–180D", title: "121–180 days", min: 121, max: 180 },
  { key: "d181_240", label: "181–240D", title: "181–240 days", min: 181, max: 240 },
  { key: "d241_360", label: "241–360D", title: "241–360 days", min: 241, max: 360 },
  { key: "d360_plus", label: "360D+", title: "360+ days", min: 361, max: Infinity },
];

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number, d = 1) => `${Number(n || 0).toFixed(d)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function compactMoney(n: number) {
  const value = Number(n || 0);

  if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (Math.abs(value) >= 1000) return `₹${(value / 1000).toFixed(0)}K`;

  return `₹${Math.round(value)}`;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .replace(/%/g, "")
    .trim();

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * UTC-safe date logic.
 * Do not replace this with local-time date math.
 * This prevents the earlier bug where L7D ending 2026-06-14 incorrectly started on 2026-06-07.
 */
function toUtcDateKeyFromParts(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function normalizeDateKey(value: unknown) {
  if (value === null || value === undefined || value === "") return "";

  const raw = String(value).trim();
  if (!raw) return "";

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const first = Number(slash[1]);
    const second = Number(slash[2]);
    const year = Number(slash[3]);

    // Meta export in India is normally DD/MM/YYYY.
    // If ambiguous, keep DD/MM/YYYY to match Ads Manager exports/screenshots.
    const day = first > 12 ? first : second > 12 ? second : first;
    const month = first > 12 ? second : second > 12 ? first : second;

    return toUtcDateKeyFromParts(year, month, day);
  }

  // Google Sheet serial date support.
  const serial = Number(raw);
  if (Number.isFinite(serial) && serial > 30000 && serial < 60000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(serial));
    return epoch.toISOString().slice(0, 10);
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()))
      .toISOString()
      .slice(0, 10);
  }

  return "";
}

function addDaysToDateKeyUtc(dateKey: string, days: number) {
  const key = normalizeDateKey(dateKey);
  if (!key) return "";

  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);
}

function daysBetweenUtc(startKey: string, endKey: string) {
  const start = normalizeDateKey(startKey);
  const end = normalizeDateKey(endKey);

  if (!start || !end) return 0;

  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);

  const startMs = Date.UTC(sy, sm - 1, sd);
  const endMs = Date.UTC(ey, em - 1, ed);

  return Math.max(0, Math.floor((endMs - startMs) / 86400000));
}

function getDate(row: Row) {
  return normalizeDateKey(
    row.date ??
      row.day ??
      row.Date ??
      row.Day ??
      row["Date"] ??
      row["Day"] ??
      row["Reporting starts"] ??
      row["Reporting Starts"] ??
      ""
  );
}

function getCreativeKey(row: Row) {
  return String(
    row.creativeId ??
      row.creative_id ??
      row.adId ??
      row.ad_id ??
      row.adName ??
      row.ad_name ??
      row.creativeName ??
      row.creative_name ??
      "unknown"
  );
}

function getCreativeName(row: Row) {
  return String(row.creativeName ?? row.creative_name ?? row.adName ?? row.ad_name ?? "Unknown Creative");
}

function getCampaignName(row: Row) {
  return String(row.campaignName ?? row.campaign_name ?? "Unknown Campaign");
}

function getAdSetName(row: Row) {
  return String(row.adSetName ?? row.adsetName ?? row.adset_name ?? row.ad_set_name ?? "Unknown Ad Set");
}

function getRevenue(row: Row) {
  return toNumber(
    row.revenue ??
      row.purchaseValue ??
      row.purchase_value ??
      row.conversionValue ??
      row.conversion_value ??
      row["Purchases conversion value"] ??
      row["Purchase conversion value"]
  );
}

function getPurchases(row: Row) {
  return toNumber(row.purchases ?? row.Purchases);
}

function getSpend(row: Row) {
  return toNumber(row.spend ?? row.amountSpent ?? row.amount_spent ?? row["Amount spent (INR)"]);
}

function getImpressions(row: Row) {
  return toNumber(row.impressions ?? row.Impressions);
}

function getClicks(row: Row) {
  return toNumber(row.linkClicks ?? row.link_clicks ?? row.clicks ?? row["Link clicks"] ?? row["Clicks (all)"]);
}

function getLpv(row: Row) {
  return toNumber(row.landingPageViews ?? row.landing_page_views ?? row["Landing page views"] ?? row.clicks ?? row.linkClicks);
}

function emptyMetric() {
  return {
    spend: 0,
    revenue: 0,
    purchases: 0,
    impressions: 0,
    clicks: 0,
    lpv: 0,
    creativeKeys: new Set<string>(),
  };
}

function finalizeMetric(metric: ReturnType<typeof emptyMetric>, totalSpend: number) {
  return {
    spend: metric.spend,
    revenue: metric.revenue,
    purchases: metric.purchases,
    impressions: metric.impressions,
    clicks: metric.clicks,
    lpv: metric.lpv,
    creativeCount: metric.creativeKeys.size,
    spendShare: safeDiv(metric.spend, totalSpend) * 100,
    cpm: safeDiv(metric.spend * 1000, metric.impressions),
    ctr: safeDiv(metric.clicks, metric.impressions) * 100,
    cvr: safeDiv(metric.purchases, metric.lpv || metric.clicks) * 100,
    aov: safeDiv(metric.revenue, metric.purchases),
    cpa: safeDiv(metric.spend, metric.purchases),
    roas: safeDiv(metric.revenue, metric.spend),
  };
}

function getAgeCohort(ageDays: number) {
  return AGE_COHORTS.find((cohort) => ageDays >= cohort.min && ageDays <= cohort.max) || AGE_COHORTS[AGE_COHORTS.length - 1];
}

function MetricCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "green" | "red" | "blue" | "amber" | "neutral";
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "red"
        ? "text-red-600 dark:text-red-300"
        : tone === "blue"
          ? "text-[#0A84FF]"
          : tone === "amber"
            ? "text-orange-600 dark:text-orange-300"
            : "text-[var(--meta-text)]";

  return (
    <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--meta-text-muted)]">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-black tracking-[-0.04em] ${toneClass}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-[var(--meta-text-muted)]">{sub}</p> : null}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] px-3 py-2 text-xs text-white shadow-2xl">
      <p className="mb-2 font-black text-white/70">{label}</p>
      <div className="grid gap-1">
        {payload.map((item: any) => {
          const name = String(item.name || "");
          const value = Number(item.value || 0);
          const lower = name.toLowerCase();

          const formatted =
            lower.includes("share") || lower.includes("ctr") || lower.includes("cvr")
              ? pct(value)
              : lower.includes("roas")
                ? `${num(value)}x`
                : lower.includes("creative")
                  ? num(value, 0)
                  : money(value);

          return (
            <div key={name} className="flex items-center justify-between gap-6">
              <span className="text-white/60">{name}</span>
              <span className="font-black text-white">{formatted}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CreativeAgeingTab() {
  const [selectedWindow, setSelectedWindow] = useState<WindowKey>("l7");
  const rows = useMetaStore((state) => state.performanceRows as MetaPerformanceRow[]);

  const data = useMemo(() => {
    const liveRows = onlyLiveRows(rows || []) as Row[];
    const validRows = liveRows.filter((row) => getDate(row));

    const dates = Array.from(new Set(validRows.map(getDate).filter(Boolean))).sort();
    const latestDate = dates[dates.length - 1] || "";

    const selected = WINDOWS.find((window) => window.key === selectedWindow) || WINDOWS[1];

    // Inclusive UTC calendar window.
    // L7D ending 2026-06-14 = 2026-06-08 to 2026-06-14.
    const windowEnd = latestDate;
    const windowStart = addDaysToDateKeyUtc(windowEnd, 1 - selected.days);

    const creativeMap = new Map<
      string,
      {
        key: string;
        name: string;
        campaignName: string;
        adSetName: string;
        firstSeen: string;
        lastSeen: string;
        lifetimeSpend: number;
      }
    >();

    for (const row of validRows) {
      const key = getCreativeKey(row);
      const date = getDate(row);
      const existing = creativeMap.get(key);

      if (!existing) {
        creativeMap.set(key, {
          key,
          name: getCreativeName(row),
          campaignName: getCampaignName(row),
          adSetName: getAdSetName(row),
          firstSeen: date,
          lastSeen: date,
          lifetimeSpend: getSpend(row),
        });
      } else {
        existing.firstSeen = date < existing.firstSeen ? date : existing.firstSeen;
        existing.lastSeen = date > existing.lastSeen ? date : existing.lastSeen;
        existing.name = getCreativeName(row) || existing.name;
        existing.campaignName = getCampaignName(row) || existing.campaignName;
        existing.adSetName = getAdSetName(row) || existing.adSetName;
        existing.lifetimeSpend += getSpend(row);
      }
    }

    const cohortCreatives = new Map<string, Set<string>>();
    for (const cohort of AGE_COHORTS) cohortCreatives.set(cohort.key, new Set());

    for (const creative of creativeMap.values()) {
      const ageDays = daysBetweenUtc(creative.firstSeen, latestDate) + 1;
      const cohort = getAgeCohort(ageDays);
      cohortCreatives.get(cohort.key)?.add(creative.key);
    }

    const cohortMetrics = new Map<string, ReturnType<typeof emptyMetric>>();
    for (const cohort of AGE_COHORTS) cohortMetrics.set(cohort.key, emptyMetric());

    for (const row of validRows) {
      const date = getDate(row);
      if (!date || date < windowStart || date > windowEnd) continue;

      const creativeKey = getCreativeKey(row);
      const creative = creativeMap.get(creativeKey);
      if (!creative) continue;

      const ageDays = daysBetweenUtc(creative.firstSeen, latestDate) + 1;
      const cohort = getAgeCohort(ageDays);
      const metric = cohortMetrics.get(cohort.key);
      if (!metric) continue;

      metric.spend += getSpend(row);
      metric.revenue += getRevenue(row);
      metric.purchases += getPurchases(row);
      metric.impressions += getImpressions(row);
      metric.clicks += getClicks(row);
      metric.lpv += getLpv(row);
      metric.creativeKeys.add(creativeKey);
    }

    const totalSpend = Array.from(cohortMetrics.values()).reduce((sum, metric) => sum + metric.spend, 0);

    const cohortRows = AGE_COHORTS.map((cohort) => {
      const metric = finalizeMetric(cohortMetrics.get(cohort.key) || emptyMetric(), totalSpend);
      const totalCreativeCount = cohortCreatives.get(cohort.key)?.size || 0;

      return {
        ...cohort,
        ...metric,
        totalCreativeCount,
      };
    });

    const activeSpendRows = cohortRows.filter((row) => row.spend > 0);
    const agedSpend = activeSpendRows
      .filter((row) => row.min >= 91)
      .reduce((sum, row) => sum + row.spend, 0);

    const agedSpendShare = safeDiv(agedSpend, totalSpend) * 100;

    const topSpendCohort = cohortRows.reduce(
      (best, row) => (row.spend > best.spend ? row : best),
      cohortRows[0]
    );

    const totalsBase = {
      creativeCount: creativeMap.size,
      latestDate,
      windowStart,
      windowEnd,
      totalSpend,
      totalRevenue: cohortRows.reduce((sum, row) => sum + row.revenue, 0),
      totalPurchases: cohortRows.reduce((sum, row) => sum + row.purchases, 0),
      totalImpressions: cohortRows.reduce((sum, row) => sum + row.impressions, 0),
      totalClicks: cohortRows.reduce((sum, row) => sum + row.clicks, 0),
      totalLpv: cohortRows.reduce((sum, row) => sum + row.lpv, 0),
      agedSpendShare,
      topSpendCohort,
      selected,
    };

    return {
      cohortRows,
      totals: {
        ...totalsBase,
        blendedCpm: safeDiv(totalsBase.totalSpend * 1000, totalsBase.totalImpressions),
        blendedCtr: safeDiv(totalsBase.totalClicks, totalsBase.totalImpressions) * 100,
        blendedCvr: safeDiv(totalsBase.totalPurchases, totalsBase.totalLpv || totalsBase.totalClicks) * 100,
        blendedAov: safeDiv(totalsBase.totalRevenue, totalsBase.totalPurchases),
        blendedCpa: safeDiv(totalsBase.totalSpend, totalsBase.totalPurchases),
        blendedRoas: safeDiv(totalsBase.totalRevenue, totalsBase.totalSpend),
      },
    };
  }, [rows, selectedWindow]);

  const insight =
    data.totals.agedSpendShare >= 50
      ? "High spend concentration is going to 90D+ creatives. Watch fatigue, CPM inflation, CTR decay, and refresh requirements."
      : data.totals.agedSpendShare >= 30
        ? "Moderate ageing risk. Older cohorts are meaningful, but spend is still diversified enough if younger cohorts are scaling."
        : "Portfolio is relatively fresh. Watch whether younger cohorts are producing enough purchases and stable AOV before scaling harder.";

  return (
    <div className="creative-ageing-root grid gap-5">
      <section className="rounded-3xl border border-current/10 bg-current/[0.025] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0A84FF]/30 bg-[#0A84FF]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A84FF]">
                <Clock3 className="h-3.5 w-3.5" />
                Creative Ageing
              </span>
              <span className="rounded-full border border-current/10 bg-current/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--meta-text-muted)]">
                UTC-safe calendar windows
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-black tracking-[-0.04em] lg:text-3xl">
              Creative Ageing Intelligence
            </h1>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--meta-text-muted)]">
              Shows how old your creative portfolio is and how much spend is flowing into each age cohort.
              Use this to identify fatigue risk, underfed fresh winners, and overdependence on old creatives.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {WINDOWS.map((window) => (
              <button
                key={window.key}
                type="button"
                onClick={() => setSelectedWindow(window.key)}
                className={
                  selectedWindow === window.key
                    ? "rounded-full bg-[#0A84FF] px-4 py-2 text-xs font-black text-white shadow-lg shadow-blue-500/20"
                    : "rounded-full border border-current/10 bg-current/[0.025] px-4 py-2 text-xs font-black text-[var(--meta-text-muted)] hover:bg-current/[0.06]"
                }
                title={window.description}
              >
                {window.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Creatives tracked" value={num(data.totals.creativeCount, 0)} sub={`Latest: ${data.totals.latestDate || "—"}`} tone="blue" />
        <MetricCard label={`${data.totals.selected.label} Spend`} value={money(data.totals.totalSpend)} sub={`${data.totals.windowStart || "—"} to ${data.totals.windowEnd || "—"}`} />
        <MetricCard label="90D+ Spend Share" value={pct(data.totals.agedSpendShare)} sub="Ageing exposure" tone={data.totals.agedSpendShare >= 50 ? "red" : data.totals.agedSpendShare >= 30 ? "amber" : "green"} />
        <MetricCard label="Blended CPA" value={data.totals.totalPurchases > 0 ? money(data.totals.blendedCpa) : "No sale"} sub={`${num(data.totals.totalPurchases, 0)} purchases`} tone={data.totals.totalPurchases > 0 ? "green" : "red"} />
        <MetricCard label="Blended ROAS" value={`${num(data.totals.blendedRoas)}x`} sub={`AOV ${money(data.totals.blendedAov)}`} tone={data.totals.blendedRoas >= 1 ? "green" : "red"} />
        <MetricCard label="Top Spend Cohort" value={data.totals.topSpendCohort?.label || "—"} sub={`${pct(data.totals.topSpendCohort?.spendShare || 0)} of spend`} tone="blue" />
      </section>

      <section className="rounded-3xl border border-current/10 bg-current/[0.025] p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-5 w-5 text-[#0A84FF]" />
          <div>
            <h2 className="text-lg font-black">Operator read</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--meta-text-muted)]">{insight}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-current/10 bg-current/[0.025] p-5">
          <h2 className="text-lg font-black">Spend Mix by Creative Age</h2>
          <p className="mt-1 text-sm text-[var(--meta-text-muted)]">
            Shows which creative age cohorts are consuming spend in the selected window.
          </p>

          <div className="mt-5 h-[340px] w-full">
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={data.cohortRows} margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--meta-border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--meta-chart-axis)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--meta-chart-axis)" }} axisLine={false} tickLine={false} tickFormatter={(v) => compactMoney(Number(v))} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="spend" name="Spend" fill="#0A84FF" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-current/10 bg-current/[0.025] p-5">
          <h2 className="text-lg font-black">Efficiency by Creative Age</h2>
          <p className="mt-1 text-sm text-[var(--meta-text-muted)]">
            Compares CPA and ROAS by age cohort. Use with spend share before deciding refresh or scale.
          </p>

          <div className="mt-5 h-[340px] w-full">
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={data.cohortRows} margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--meta-border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--meta-chart-axis)" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "var(--meta-chart-axis)" }} axisLine={false} tickLine={false} tickFormatter={(v) => compactMoney(Number(v))} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "var(--meta-chart-axis)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar yAxisId="left" dataKey="cpa" name="CPA" fill="#94a3b8" radius={[8, 8, 0, 0]} opacity={0.5} />
                <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="#34d399" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-current/10 bg-current/[0.025]">
        <div className="flex flex-col gap-2 border-b border-current/10 p-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-black">Age Cohort Metrics</h2>
            <p className="mt-1 text-sm text-[var(--meta-text-muted)]">
              Combined performance metrics by creative age cohort for {data.totals.selected.label}.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-current/10 bg-current/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--meta-text-muted)]">
            <TrendingUp className="h-3.5 w-3.5" />
            {data.totals.windowStart || "—"} → {data.totals.windowEnd || "—"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-xs">
            <thead className="bg-[#14233b] text-white">
              <tr>
                {[
                  "Age Cohort",
                  "Creatives",
                  "Spend",
                  "Spend %",
                  "CPM",
                  "CTR",
                  "CVR",
                  "AOV",
                  "CPA",
                  "ROAS",
                  "Purch.",
                  "Impr.",
                  "LPV",
                ].map((header) => (
                  <th key={header} className="px-3 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.cohortRows.map((row) => (
                <tr key={row.key} className="border-b border-current/10 hover:bg-current/[0.035]">
                  <td className="px-3 py-3">
                    <p className="font-black text-[var(--meta-text)]">{row.label}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--meta-text-muted)]">{row.title}</p>
                  </td>
                  <td className="px-3 py-3 font-black">{num(row.totalCreativeCount, 0)}</td>
                  <td className="px-3 py-3 font-black">{money(row.spend)}</td>
                  <td className="px-3 py-3">{pct(row.spendShare)}</td>
                  <td className="px-3 py-3">{money(row.cpm)}</td>
                  <td className="px-3 py-3">{pct(row.ctr, 2)}</td>
                  <td className="px-3 py-3">{pct(row.cvr, 2)}</td>
                  <td className="px-3 py-3">{money(row.aov)}</td>
                  <td className="px-3 py-3">{row.purchases > 0 ? money(row.cpa) : "No sale"}</td>
                  <td className="px-3 py-3 font-black text-emerald-600 dark:text-emerald-300">{num(row.roas)}x</td>
                  <td className="px-3 py-3">{num(row.purchases, 0)}</td>
                  <td className="px-3 py-3">{num(row.impressions, 0)}</td>
                  <td className="px-3 py-3">{num(row.lpv, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
