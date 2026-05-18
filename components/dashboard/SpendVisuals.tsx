"use client";

import { useMemo, useState } from "react";
import {
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
import { useThemeStore } from "@/components/theme/ThemeProvider";

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

export function SpendVisuals() {
  const { performanceRows } = useMetaStore();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

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
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Spend Visuals</h2>
        <MutedText className="mt-2">
          Upload Meta data first. This screen visualises live ads only.
        </MutedText>
      </GlassCard>
    );
  }

  const gridColor = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const axisColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.50)";

  return (
    <div className="grid gap-6">
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
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] opacity-70">
              Start Date
              <input
                type="date"
                value={customStartDate || defaultRange.min}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-11 rounded-2xl border border-current/10 bg-transparent px-4 text-sm normal-case tracking-normal outline-none"
              />
            </label>

            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] opacity-70">
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
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data.daily} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: axisColor }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                tick={{ fontSize: 11, fill: axisColor }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => compactMoney(Number(v))}
              />
              <Tooltip formatter={(value: any) => money(Number(value))} labelFormatter={(label) => `Date: ${label}`} />
              <Area type="monotone" dataKey="spend" name="Spend" stroke="#0A84FF" fill="#0A84FF" fillOpacity={0.18} strokeWidth={2.5} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#34d399" fill="#34d399" fillOpacity={0.12} strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Daily CPA & ROAS Trend">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data.daily} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: axisColor }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: axisColor }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => compactMoney(Number(v))}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: axisColor }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip />
              <Bar yAxisId="left" dataKey="cpa" name="CPA" fill="#94a3b8" radius={[6, 6, 0, 0]} opacity={0.35} />
              <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="#0A84FF" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Campaigns by Spend">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={data.campaign} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: axisColor }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => compactMoney(Number(v))}
              />
              <YAxis
                dataKey="short"
                type="category"
                width={150}
                tick={{ fontSize: 11, fill: axisColor }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={(value: any) => money(Number(value))} />
              <Bar dataKey="spend" name="Spend" fill="#0A84FF" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Ad Sets by Spend">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={data.adset} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: axisColor }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => compactMoney(Number(v))}
              />
              <YAxis
                dataKey="short"
                type="category"
                width={150}
                tick={{ fontSize: 11, fill: axisColor }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={(value: any) => money(Number(value))} />
              <Bar dataKey="spend" name="Spend" fill="#34d399" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="border-b border-current/10 p-5">
          <h2 className="text-xl font-black">Date-Wise Performance Table</h2>
          <MutedText className="mt-1 text-sm">
            Date column added so you can validate performance by selected period.
          </MutedText>
        </div>

        <div className="overflow-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead
              className={
                isDark
                  ? "border-b border-white/10 bg-white/[0.04] text-[11px] uppercase tracking-[0.16em] text-white/45"
                  : "border-b border-black/10 bg-black/[0.035] text-[11px] uppercase tracking-[0.16em] text-black/55"
              }
            >
              <tr>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Spend</th>
                <th className="px-5 py-4">Revenue</th>
                <th className="px-5 py-4">ROAS</th>
                <th className="px-5 py-4">CPA</th>
                <th className="px-5 py-4">Purchases</th>
                <th className="px-5 py-4">CTR</th>
                <th className="px-5 py-4">ATC Rate</th>
              </tr>
            </thead>

            <tbody>
              {data.daily.map((row) => (
                <tr
                  key={row.date}
                  className={
                    isDark
                      ? "border-b border-white/5 text-white hover:bg-white/[0.04]"
                      : "border-b border-black/5 text-black hover:bg-black/[0.035]"
                  }
                >
                  <td className="px-5 py-4 font-black">{row.date}</td>
                  <td className="px-5 py-4 opacity-75">{money(row.spend)}</td>
                  <td className="px-5 py-4 opacity-75">{money(row.revenue)}</td>
                  <td className="px-5 py-4 opacity-75">{num(row.roas)}</td>
                  <td className="px-5 py-4 opacity-75">{money(row.cpa)}</td>
                  <td className="px-5 py-4 opacity-75">{num(row.purchases, 0)}</td>
                  <td className="px-5 py-4 opacity-75">{num(row.ctr)}%</td>
                  <td className="px-5 py-4 opacity-75">{num(row.atcRate)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassCard className="p-5">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-5 h-[360px] w-full min-w-0">{children}</div>
    </GlassCard>
  );
}
