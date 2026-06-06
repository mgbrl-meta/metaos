"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Area,
  AreaChart,
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
import {
  MetaPage,
  MetaSection,
  MetaCard,
  MetaTitle,
  MetaCardTitle,
  MetaKpiCard,
  MetaCartesianGrid,
  MetaXAxis,
  MetaYAxis,
  MetaChartTooltip,
} from "@/components/meta/ui/MetaOSKit";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function compactMoney(value: number) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
}

function shortName(value: string, max = 28) {
  if (!value) return "Unknown";
  return value.length > max ? `${value.slice(0, max)}…` : value;
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

function displayDate(value?: string) {
  const d = parseDate(value);
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function revenue(row: any) {
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

function getDateRange(rows: any[]) {
  const dates = rows.map((r) => parseDate(r.date)).filter(Boolean) as Date[];

  if (!dates.length) {
    const today = dateKey(new Date().toISOString());
    return { min: today, max: today };
  }

  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));

  return {
    min: dateKey(min.toISOString()),
    max: dateKey(max.toISOString()),
  };
}

function getPresetStart(maxDate: string, days: number | "all", minDate: string) {
  if (days === "all") return minDate;

  const max = parseDate(maxDate);
  if (!max) return minDate;

  const start = new Date(max);
  start.setDate(start.getDate() - days + 1);

  const key = dateKey(start.toISOString());
  return key < minDate ? minDate : key;
}

function inRange(row: any, start: string, end: string) {
  const key = dateKey(row.date);
  if (!key) return false;
  return key >= start && key <= end;
}

function groupByDate(rows: any[]) {
  const map = new Map<string, any>();

  rows.forEach((row) => {
    const key = dateKey(row.date);
    if (!key) return;

    if (!map.has(key)) {
      map.set(key, {
        date: key,
        label: displayDate(key),
        spend: 0,
        revenue: 0,
        purchases: 0,
        impressions: 0,
        clicks: 0,
        lpv: 0,
        atc: 0,
      });
    }

    const item = map.get(key);
    item.spend += Number(row.spend || 0);
    item.revenue += revenue(row);
    item.purchases += Number(row.purchases || 0);
    item.impressions += Number(row.impressions || 0);
    item.clicks += Number(row.clicks || 0);
    item.lpv += Number(row.landingPageViews || 0);
    item.atc += Number(row.addToCart || 0);
  });

  return Array.from(map.values())
    .map((d) => ({
      ...d,
      roas: safeDiv(d.revenue, d.spend),
      cpa: safeDiv(d.spend, d.purchases),
      ctr: safeDiv(d.clicks, d.impressions) * 100,
      atcRate: safeDiv(d.atc, d.lpv) * 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function groupByKey(rows: any[], keyName: "campaignName" | "adSetName" | "adName") {
  const map = new Map<string, any>();

  rows.forEach((row) => {
    const key = row[keyName] || "Unknown";

    if (!map.has(key)) {
      map.set(key, {
        name: key,
        short: shortName(key),
        spend: 0,
        revenue: 0,
        purchases: 0,
        impressions: 0,
        clicks: 0,
      });
    }

    const item = map.get(key);
    item.spend += Number(row.spend || 0);
    item.revenue += revenue(row);
    item.purchases += Number(row.purchases || 0);
    item.impressions += Number(row.impressions || 0);
    item.clicks += Number(row.clicks || 0);
  });

  return Array.from(map.values())
    .map((d) => ({
      ...d,
      roas: safeDiv(d.revenue, d.spend),
      cpa: safeDiv(d.spend, d.purchases),
      ctr: safeDiv(d.clicks, d.impressions) * 100,
    }))
    .sort((a, b) => b.spend - a.spend);
}



function compareWindowRows(rows: any[], days: number, maxDate: string) {
  const max = parseDate(maxDate);
  if (!max) return { current: [], previous: [] };

  const currentEnd = new Date(max);
  const currentStart = new Date(max);
  currentStart.setDate(currentStart.getDate() - days + 1);

  const previousEnd = new Date(currentStart);
  previousEnd.setDate(previousEnd.getDate() - 1);

  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - days + 1);

  const current = rows.filter((row) => {
    const d = parseDate(row.date);
    if (!d) return false;
    return d >= currentStart && d <= currentEnd;
  });

  const previous = rows.filter((row) => {
    const d = parseDate(row.date);
    if (!d) return false;
    return d >= previousStart && d <= previousEnd;
  });

  return { current, previous };
}

function summarizeRows(rows: any[]) {
  const spend = rows.reduce((s, r) => s + Number(r.spend || 0), 0);
  const rev = rows.reduce((s, r) => s + revenue(r), 0);
  const purchases = rows.reduce((s, r) => s + Number(r.purchases || 0), 0);
  const impressions = rows.reduce((s, r) => s + Number(r.impressions || 0), 0);
  const clicks = rows.reduce((s, r) => s + Number(r.clicks || r.linkClicks || 0), 0);
  const lpv = rows.reduce((s, r) => s + Number(r.landingPageViews || 0), 0);
  const atc = rows.reduce((s, r) => s + Number(r.addToCart || 0), 0);

  return {
    spend,
    revenue: rev,
    purchases,
    impressions,
    clicks,
    lpv,
    atc,
    roas: safeDiv(rev, spend),
    cpa: safeDiv(spend, purchases),
    aov: safeDiv(rev, purchases),
    cpm: safeDiv(spend, impressions) * 1000,
    cpc: safeDiv(spend, clicks),
    ctr: safeDiv(clicks, impressions) * 100,
    lpvRate: safeDiv(lpv, clicks) * 100,
    atcRate: safeDiv(atc, lpv) * 100,
  };
}

function deltaPct(current: number, previous: number) {
  if (!previous || !Number.isFinite(previous)) return 0;
  return ((current - previous) / previous) * 100;
}

function periodComparison(rows: any[], maxDate: string) {
  return [7, 14, 28].map((days) => {
    const { current, previous } = compareWindowRows(rows, days, maxDate);
    const c = summarizeRows(current);
    const p = summarizeRows(previous);

    return {
      period: `Last ${days}D`,
      days,
      current: c,
      previous: p,
      delta: {
        spend: deltaPct(c.spend, p.spend),
        revenue: deltaPct(c.revenue, p.revenue),
        purchases: deltaPct(c.purchases, p.purchases),
        roas: deltaPct(c.roas, p.roas),
        cpa: deltaPct(c.cpa, p.cpa),
        aov: deltaPct(c.aov, p.aov),
        cpm: deltaPct(c.cpm, p.cpm),
        cpc: deltaPct(c.cpc, p.cpc),
        ctr: deltaPct(c.ctr, p.ctr),
        lpvRate: deltaPct(c.lpvRate, p.lpvRate),
        atcRate: deltaPct(c.atcRate, p.atcRate),
      },
    };
  });
}

function deltaTone(value: number, lowerIsBetter = false) {
  if (!value || Math.abs(value) < 2) return "neutral";
  const good = lowerIsBetter ? value < 0 : value > 0;
  return good ? "green" : "red";
}

function deltaText(value: number) {
  if (!value || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}


function buildRollingTrendRows(daily: any[], index: number, windowSize = 7) {
  const start = Math.max(0, index - windowSize + 1);
  return daily.slice(start, index + 1).map((row) => ({
    ...row,
    cpa: Number(row.cpa || 0),
    roas: Number(row.roas || 0),
    aov: safeDiv(Number(row.revenue || 0), Number(row.purchases || 0)),
  }));
}


type SpendSortDirection = "asc" | "desc";

type SpendSortConfig = {
  key: string;
  direction: SpendSortDirection;
};

function spendGetValue(row: any, key: string) {
  return key.split(".").reduce((value, part) => value?.[part], row);
}

function spendToggleSort(current: SpendSortConfig, key: string): SpendSortConfig {
  if (current.key === key) {
    return {
      key,
      direction: current.direction === "asc" ? "desc" : "asc",
    };
  }

  return {
    key,
    direction: "desc",
  };
}

function spendSortRows<T extends Record<string, any>>(rows: T[], sort: SpendSortConfig) {
  return [...rows].sort((a, b) => {
    const av = spendGetValue(a, sort.key);
    const bv = spendGetValue(b, sort.key);

    const ad = new Date(String(av || ""));
    const bd = new Date(String(bv || ""));

    let result = 0;

    if (!Number.isNaN(ad.getTime()) && !Number.isNaN(bd.getTime())) {
      result = ad.getTime() - bd.getTime();
    } else {
      const an = Number(av);
      const bn = Number(bv);

      if (!Number.isNaN(an) && !Number.isNaN(bn)) {
        result = an - bn;
      } else {
        result = String(av ?? "").localeCompare(String(bv ?? ""));
      }
    }

    return sort.direction === "asc" ? result : -result;
  });
}

function SpendSortHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: string;
  sort: SpendSortConfig;
  onSort: (key: string) => void;
}) {
  const active = sort.key === sortKey;
  const icon = active ? (sort.direction === "asc" ? "↑" : "↓") : "↕";

  return (
    <th className="spend-table-th">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={`Sort by ${label}`}
        className={active ? "spend-sort-button spend-sort-button-active" : "spend-sort-button"}
      >
        <span className="spend-sort-label">{label}</span>
        <span className="spend-sort-icon">{icon}</span>
      </button>
    </th>
  );
}: {
  label: string;
  sortKey: string;
  sort: SpendSortConfig;
  onSort: (key: string) => void;
}) {
  const active = sort.key === sortKey;

  return (
    <th className="spend-table-th">
      <button type="button" onClick={() => onSort(sortKey)} className="spend-sort-button">
        <span>{label}</span>
        <span className={active ? "spend-sort-active" : "spend-sort-idle"}>
          {active ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}


export function SpendVisuals() {
  const [spendPeriodSort, setSpendPeriodSort] = useState<SpendSortConfig>({
    key: "current.spend",
    direction: "desc",
  });

  const [spendDailySort, setSpendDailySort] = useState<SpendSortConfig>({
    key: "date",
    direction: "desc",
  });

  const { performanceRows } = useMetaStore();
const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);
  const defaultRange = useMemo(() => getDateRange(liveRows), [liveRows]);

  const [preset, setPreset] = useState<7 | 14 | 30 | 60 | 90 | "all">(30);
  const [customMode, setCustomMode] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const data = useMemo(() => {
    const start = customMode
      ? customStartDate || defaultRange.min
      : getPresetStart(defaultRange.max, preset, defaultRange.min);

    const end = customMode ? customEndDate || defaultRange.max : defaultRange.max;

    const filteredRows = liveRows.filter((row) => inRange(row, start, end));

    const daily = groupByDate(filteredRows);
    const campaign = groupByKey(filteredRows, "campaignName").slice(0, 8).reverse();
    const adset = groupByKey(filteredRows, "adSetName").slice(0, 8).reverse();
    const ads = groupByKey(filteredRows, "adName").slice(0, 20);

    const spend = filteredRows.reduce((s, r) => s + Number(r.spend || 0), 0);
    const rev = filteredRows.reduce((s, r) => s + revenue(r), 0);
    const purchases = filteredRows.reduce((s, r) => s + Number(r.purchases || 0), 0);
    const impressions = filteredRows.reduce((s, r) => s + Number(r.impressions || 0), 0);
    const clicks = filteredRows.reduce((s, r) => s + Number(r.clicks || 0), 0);

    return {
      start,
      end,
      filteredRows,
      daily,
      campaign,
      adset,
      ads,
      spend,
      revenue: rev,
      purchases,
      impressions,
      clicks,
      roas: safeDiv(rev, spend),
      cpa: safeDiv(spend, purchases),
      ctr: safeDiv(clicks, impressions) * 100,
    };
  }, [liveRows, preset, customMode, customStartDate, customEndDate, defaultRange]);

  if (!liveRows.length) {
  const spendPeriodRows =
    data.periodComparisons ||
    data.periodRows ||
    data.comparisons ||
    [];

  const spendLast30DailyRows = [...(data.daily || [])]
    .sort((a: any, b: any) => new Date(String(b.date || "")).getTime() - new Date(String(a.date || "")).getTime())
    .slice(0, 30);

  const spendSortedPeriodRows = spendSortRows(spendPeriodRows, spendPeriodSort);
  const spendSortedDailyRows = spendSortRows(spendLast30DailyRows, spendDailySort);


  return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Spend Visuals</h2>
        <MutedText className="mt-2">
          Upload Meta data first. This screen visualises live ads only.
        </MutedText>
      </GlassCard>
    );
  }
  const gridColor = "var(--meta-chart-grid)";
const axisColor = "var(--meta-chart-axis)";
return (
    <MetaPage className="spend-visuals-root">
      <PageHeader
        eyebrow="Spend Visuals"
        title="Spend, CPA, ROAS & Date-Wise Performance"
        description="Clean operator charts for reading spend movement, efficiency movement and concentration. Default view is last 30 days."
      />

      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <TonePill tone="blue">Date Control</TonePill>
              <TonePill tone="neutral">Live Ads Only</TonePill>
            </div>
            <MutedText className="mt-3 text-sm">
              Showing {data.start} to {data.end}. Available range: {defaultRange.min} to {defaultRange.max}
            </MutedText>
          </div>

          <div className="flex flex-wrap gap-2">
            {[7, 14, 30, 60, 90].map((days) => (
              <button
                key={days}
                onClick={() => {
                  setPreset(days as 7 | 14 | 30 | 60 | 90);
                  setCustomMode(false);
                }}
                className={
                  !customMode && preset === days
                    ? "rounded-full bg-[#0A84FF] px-4 py-2 text-xs font-black text-white"
                    : "rounded-full border border-current/10 px-4 py-2 text-xs font-black opacity-70"
                }
              >
                {days}D
              </button>
            ))}

            <button
              onClick={() => {
                setPreset("all");
                setCustomMode(false);
              }}
              className={
                !customMode && preset === "all"
                  ? "rounded-full bg-[#0A84FF] px-4 py-2 text-xs font-black text-white"
                  : "rounded-full border border-current/10 px-4 py-2 text-xs font-black opacity-70"
              }
            >
              All
            </button>

            <button
              onClick={() => setCustomMode(true)}
              className={
                customMode
                  ? "rounded-full bg-[#0A84FF] px-4 py-2 text-xs font-black text-white"
                  : "rounded-full border border-current/10 px-4 py-2 text-xs font-black opacity-70"
              }
            >
              Custom
            </button>
          </div>
        </div>

        {customMode && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--meta-text-muted)]">
              Start Date
              <input
                type="date"
                value={customStartDate || defaultRange.min}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-11 rounded-2xl border border-current/10 bg-transparent px-4 text-sm normal-case tracking-normal outline-none"
              />
            </label>

            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--meta-text-muted)]">
              End Date
              <input
                type="date"
                value={customEndDate || defaultRange.max}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-11 rounded-2xl border border-current/10 bg-transparent px-4 text-sm normal-case tracking-normal outline-none"
              />
            </label>
          </div>
        )}
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Spend" value={money(data.spend)} tone="neutral" />
        <MetricCard label="Revenue" value={money(data.revenue)} tone="green" />
        <MetricCard label="ROAS" value={num(data.roas)} tone={data.roas >= 1 ? "green" : "red"} />
        <MetricCard label="CPA" value={money(data.cpa)} tone="blue" />
        <MetricCard label="Purchases" value={num(data.purchases, 0)} tone="green" />
        <MetricCard label="CTR" value={`${num(data.ctr)}%`} tone="neutral" />
        <MetricCard label="Impressions" value={num(data.impressions, 0)} tone="neutral" />
        <MetricCard label="Clicks" value={num(data.clicks, 0)} tone="neutral" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Daily Spend & Revenue Trend">
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={data.daily} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <MetaCartesianGrid />
              <MetaXAxis dataKey="label"
                
                
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <MetaYAxis 
                
                tickFormatter={(v: number | string) => compactMoney(Number(v))}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111318",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "16px",
                  color: "#ffffff",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
                  padding: "12px 14px",
                }}
                labelStyle={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: "11px",
                  fontWeight: 800,
                  marginBottom: "8px",
                }}
                itemStyle={{
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
                formatter={(value: any, name: any) => {
                  const n = Number(value || 0);
                  const label = String(name || "").toLowerCase();

                  if (label.includes("roas")) return [n.toFixed(2), name];
                  if (label.includes("ctr") || label.includes("rate")) return [`${n.toFixed(2)}%`, name];

                  return [`₹${Math.round(n).toLocaleString()}`, name];
                }}
              />
              <Area type="monotone" dataKey="spend" name="Spend" stroke="#0A84FF" fill="#0A84FF" fillOpacity={0.18} strokeWidth={2.5} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#34d399" fill="#34d399" fillOpacity={0.12} strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Daily CPA & ROAS Trend">
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={data.daily} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <MetaCartesianGrid />
              <MetaXAxis dataKey="label"
                
                
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <MetaYAxis yAxisId="left"
                
                
                tickFormatter={(v: number | string) => compactMoney(Number(v))}
              />
              <MetaYAxis yAxisId="right"
                orientation="right"
                
                
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111318",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "16px",
                  color: "#ffffff",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
                  padding: "12px 14px",
                }}
                labelStyle={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: "11px",
                  fontWeight: 800,
                  marginBottom: "8px",
                }}
                itemStyle={{
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
                formatter={(value: any, name: any) => {
                  const n = Number(value || 0);
                  const label = String(name || "").toLowerCase();

                  if (label.includes("roas")) return [n.toFixed(2), name];
                  if (label.includes("ctr") || label.includes("rate")) return [`${n.toFixed(2)}%`, name];

                  return [`₹${Math.round(n).toLocaleString()}`, name];
                }}
              />
              <Bar yAxisId="left" dataKey="cpa" name="CPA" fill="#94a3b8" radius={[6, 6, 0, 0]} opacity={0.35} />
              <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="#0A84FF" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Campaigns by Spend">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={data.campaign} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <MetaCartesianGrid horizontal={false} />
              <MetaXAxis type="number"
                
                
                tickFormatter={(v: number | string) => compactMoney(Number(v))}
              />
              <MetaYAxis dataKey="short"
                type="category"
                width={150}
                
                
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111318",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "16px",
                  color: "#ffffff",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
                  padding: "12px 14px",
                }}
                labelStyle={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: "11px",
                  fontWeight: 800,
                  marginBottom: "8px",
                }}
                itemStyle={{
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
                formatter={(value: any, name: any) => {
                  const n = Number(value || 0);
                  const label = String(name || "").toLowerCase();

                  if (label.includes("roas")) return [n.toFixed(2), name];
                  if (label.includes("ctr") || label.includes("rate")) return [`${n.toFixed(2)}%`, name];

                  return [`₹${Math.round(n).toLocaleString()}`, name];
                }}
              />
              <Bar dataKey="spend" name="Spend" fill="#0A84FF" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Ad Sets by Spend">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={data.adset} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <MetaCartesianGrid horizontal={false} />
              <MetaXAxis type="number"
                
                
                tickFormatter={(v: number | string) => compactMoney(Number(v))}
              />
              <MetaYAxis dataKey="short"
                type="category"
                width={150}
                
                
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111318",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "16px",
                  color: "#ffffff",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
                  padding: "12px 14px",
                }}
                labelStyle={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: "11px",
                  fontWeight: 800,
                  marginBottom: "8px",
                }}
                itemStyle={{
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
                formatter={(value: any, name: any) => {
                  const n = Number(value || 0);
                  const label = String(name || "").toLowerCase();

                  if (label.includes("roas")) return [n.toFixed(2), name];
                  if (label.includes("ctr") || label.includes("rate")) return [`${n.toFixed(2)}%`, name];

                  return [`₹${Math.round(n).toLocaleString()}`, name];
                }}
              />
              <Bar dataKey="spend" name="Spend" fill="#34d399" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      
      <GlassCard className="overflow-hidden min-w-0">
        <div className="border-b border-current/10 p-5">
          <h2 className="text-xl font-black">Period Performance Comparison</h2>
          <MutedText className="mt-1 text-sm">
            Last 7D, 14D and 28D compared against the previous same-length period. Green means improving; red means worsening.
          </MutedText>
        </div>

        <div className="metaos-scroll-table overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead
              className="border-b border-current/10 bg-current/[0.04] text-[11px] uppercase tracking-[0.16em] text-[var(--meta-text-muted)]"
            >
              <tr>
                <SpendSortHeader label="Period" sortKey="period" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="Spend" sortKey="current.spend" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="Δ Spend" sortKey="deltas.spend" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="Revenue" sortKey="current.revenue" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="Δ Revenue" sortKey="deltas.revenue" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="Purchases" sortKey="current.purchases" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="Δ Purchases" sortKey="deltas.purchases" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="ROAS" sortKey="current.roas" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="Δ ROAS" sortKey="deltas.roas" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="CPA" sortKey="current.cpa" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="Δ CPA" sortKey="deltas.cpa" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="AOV" sortKey="current.aov" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="Δ AOV" sortKey="deltas.aov" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="CPM" sortKey="current.cpm" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="Δ CPM" sortKey="deltas.cpm" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="CTR" sortKey="current.ctr" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="Δ CTR" sortKey="deltas.ctr" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="ATC Rate" sortKey="current.atcRate" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="Δ ATC" sortKey="deltas.atcRate" sort={spendPeriodSort} onSort={(key) => setSpendPeriodSort((current) => spendToggleSort(current, key))} />
              </tr>
            </thead>

            <tbody>
              {periodComparison(data.filteredRows, data.end).map((row) => (
                <tr
                  key={row.period}
                  className="border-b border-current/10 text-[var(--meta-text)] hover:bg-current/[0.035]"
                >
                  <td className="px-4 py-3 font-black">{row.period}</td>

                  <td className="px-4 py-3 text-[var(--meta-text-soft)]">{money(row.current.spend)}</td>
                  <DeltaTableCell value={row.delta.spend} lowerIsBetter={false} />

                  <td className="px-4 py-3 text-[var(--meta-text-soft)]">{money(row.current.revenue)}</td>
                  <DeltaTableCell value={row.delta.revenue} lowerIsBetter={false} />

                  <td className="px-4 py-3 text-[var(--meta-text-soft)]">{num(row.current.purchases, 0)}</td>
                  <DeltaTableCell value={row.delta.purchases} lowerIsBetter={false} />

                  <td className="px-4 py-3 font-black text-emerald-400">{num(row.current.roas)}</td>
                  <DeltaTableCell value={row.delta.roas} lowerIsBetter={false} />

                  <td className="px-4 py-3 text-[var(--meta-text-soft)]">{money(row.current.cpa)}</td>
                  <DeltaTableCell value={row.delta.cpa} lowerIsBetter />

                  <td className="px-4 py-3 text-[var(--meta-text-soft)]">{money(row.current.aov)}</td>
                  <DeltaTableCell value={row.delta.aov} lowerIsBetter={false} />

                  <td className="px-4 py-3 text-[var(--meta-text-soft)]">{money(row.current.cpm)}</td>
                  <DeltaTableCell value={row.delta.cpm} lowerIsBetter />

                  <td className="px-4 py-3 text-[var(--meta-text-soft)]">{num(row.current.ctr)}%</td>
                  <DeltaTableCell value={row.delta.ctr} lowerIsBetter={false} />

                  <td className="px-4 py-3 text-[var(--meta-text-soft)]">{num(row.current.atcRate)}%</td>
                  <DeltaTableCell value={row.delta.atcRate} lowerIsBetter={false} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden min-w-0">
        <div className="border-b border-current/10 p-5">
          <h2 className="text-xl font-black">Daily Performance Detail</h2>
          <MutedText className="mt-1 text-sm">
            Last 30 available days only. Click any column header to sort.
          </MutedText>
        </div>

        <div className="metaos-scroll-table overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead
              className="border-b border-current/10 bg-current/[0.04] text-[11px] uppercase tracking-[0.16em] text-[var(--meta-text-muted)]"
            >
              <tr>
                <SpendSortHeader label="Date" sortKey="date" sort={spendDailySort} onSort={(key) => setSpendDailySort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="Spend" sortKey="spend" sort={spendDailySort} onSort={(key) => setSpendDailySort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="Revenue" sortKey="revenue" sort={spendDailySort} onSort={(key) => setSpendDailySort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="ROAS" sortKey="roas" sort={spendDailySort} onSort={(key) => setSpendDailySort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="CPA" sortKey="cpa" sort={spendDailySort} onSort={(key) => setSpendDailySort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="AOV" sortKey="aov" sort={spendDailySort} onSort={(key) => setSpendDailySort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="Purchases" sortKey="purchases" sort={spendDailySort} onSort={(key) => setSpendDailySort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="CTR" sortKey="ctr" sort={spendDailySort} onSort={(key) => setSpendDailySort((current) => spendToggleSort(current, key))} />
                <SpendSortHeader label="ATC Rate" sortKey="atcRate" sort={spendDailySort} onSort={(key) => setSpendDailySort((current) => spendToggleSort(current, key))} />
              </tr>
            </thead>

            <tbody>
              {data.daily.slice(-28).map((row, index) => (
                <tr
                  key={row.date}
                  className="border-b border-current/10 text-[var(--meta-text)] hover:bg-current/[0.035]"
                >
                  <td className="px-4 py-3 font-black whitespace-normal break-words">{row.date}</td>
                  <td className="px-4 py-3 text-[var(--meta-text-soft)]">{money(row.spend)}</td>
                  <td className="px-4 py-3 text-[var(--meta-text-soft)]">{money(row.revenue)}</td>
                  <td className="px-4 py-3 font-black text-emerald-400">{num(row.roas)}</td>
                  <td className="px-4 py-3 text-[var(--meta-text-soft)]">{money(row.cpa)}</td>
                  <td className="px-4 py-3 text-[var(--meta-text-soft)]">{money(safeDiv(row.revenue, row.purchases))}</td>
                  <td className="px-4 py-3 text-[var(--meta-text-soft)]">{num(row.purchases, 0)}</td>
                  <td className="px-4 py-3 text-[var(--meta-text-soft)]">{num(row.ctr)}%</td>
                  <td className="px-4 py-3 text-[var(--meta-text-soft)]">{num(row.atcRate)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

    </MetaPage>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {


  return (
    <GlassCard className="p-5">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-5 h-[380px] w-full min-w-0">{children}</div>
    </GlassCard>
  );
}

function DeltaTableCell({
  value,
  lowerIsBetter = false,
}: {
  value: number;
  lowerIsBetter?: boolean;
}) {
  const tone = deltaTone(value, lowerIsBetter);

  if (tone === "neutral") {
    return <td className="px-4 py-3 font-black text-[var(--meta-text-faint)]">—</td>;
  }

  return (
    <td
      className={
        tone === "green"
          ? "px-4 py-3 font-black text-emerald-400"
          : "px-4 py-3 font-black text-red-400"
      }
    >
      {deltaText(value)}
    </td>
  );
}

function DailyMiniTrend({ rows }: { rows: any[] }) {
  const validRows = rows.filter(
    (row) => Number(row.cpa || 0) > 0 || Number(row.roas || 0) > 0 || Number(row.aov || 0) > 0
  );

  if (validRows.length < 2) {
    return <span className="text-xs text-[var(--meta-text-faint)]">Not enough trend</span>;
  }

  return (
    <div className="h-[58px] w-full min-w-0">
      <ResponsiveContainer width="100%" height={58}>
        <LineChart data={validRows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <Tooltip
            content={(props) => (
              <MetaChartTooltip
                {...props}
                title="7-Day Rolling Trend"
                valueFormatter={(value, name) => {
                  const metric = String(name || "").toLowerCase();
                  if (metric.includes("roas")) return Number(value || 0).toFixed(2);
                  return `₹${Math.round(Number(value || 0)).toLocaleString()}`;
                }}
              />
            )}
          />
          <Line type="monotone" dataKey="cpa" name="CPA" stroke="#f87171" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="roas" name="ROAS" stroke="#34d399" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="aov" name="AOV" stroke="#0A84FF" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
