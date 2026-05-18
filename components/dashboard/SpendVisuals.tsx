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

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKey(value?: string) {
  if (!value) return "";
  const d = parseDate(value);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
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

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const data = useMemo(() => {
    const start = startDate || defaultRange.min;
    const end = endDate || defaultRange.max;

    const filteredRows = liveRows.filter((row) => inRange(row, start, end));

    const daily = groupByDate(filteredRows);
    const campaign = groupByKey(filteredRows, "campaignName").slice(0, 10);
    const adset = groupByKey(filteredRows, "adSetName").slice(0, 10);
    const ads = groupByKey(filteredRows, "adName").slice(0, 25);

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
  }, [liveRows, startDate, endDate, defaultRange]);

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

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Spend Visuals"
        title="Spend, CPA, ROAS & Date-Wise Performance"
        description="Use custom dates to understand where spend is going and how efficiency is moving. This uses live ads only."
      />

      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <TonePill tone="blue">Custom Date Range</TonePill>
              <TonePill tone="neutral">Live Ads Only</TonePill>
            </div>
            <MutedText className="mt-3 text-sm">
              Available range: {defaultRange.min} to {defaultRange.max}
            </MutedText>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] opacity-70">
              Start Date
              <input
                type="date"
                value={startDate || defaultRange.min}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 rounded-2xl border border-current/10 bg-transparent px-4 text-sm normal-case tracking-normal outline-none"
              />
            </label>

            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] opacity-70">
              End Date
              <input
                type="date"
                value={endDate || defaultRange.max}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 rounded-2xl border border-current/10 bg-transparent px-4 text-sm normal-case tracking-normal outline-none"
              />
            </label>
          </div>
        </div>
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
            <AreaChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => money(Number(value))} />
              <Area type="monotone" dataKey="spend" strokeWidth={2} />
              <Area type="monotone" dataKey="revenue" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Daily CPA & ROAS Trend">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="cpa" />
              <Line yAxisId="right" type="monotone" dataKey="roas" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Campaigns by Spend">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.campaign}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => money(Number(value))} />
              <Bar dataKey="spend" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Ad Sets by Spend">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.adset}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => money(Number(value))} />
              <Bar dataKey="spend" />
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

      <GlassCard className="overflow-hidden">
        <div className="border-b border-current/10 p-5">
          <h2 className="text-xl font-black">Top Spending Live Ads</h2>
          <MutedText className="mt-1 text-sm">
            Full ad names shown. Use this to check where spend is concentrated.
          </MutedText>
        </div>

        <div className="grid gap-4 p-5">
          {data.ads.map((row, index) => (
            <Surface key={`${row.name}-${index}`} className="p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_520px]">
                <div>
                  <p className="font-black leading-6 whitespace-normal break-words">{row.name}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <MiniStat label="Spend" value={money(row.spend)} />
                  <MiniStat label="Revenue" value={money(row.revenue)} />
                  <MiniStat label="ROAS" value={num(row.roas)} />
                  <MiniStat label="CPA" value={money(row.cpa)} />
                  <MiniStat label="Purchases" value={num(row.purchases, 0)} />
                  <MiniStat label="CTR" value={`${num(row.ctr)}%`} />
                </div>
              </div>
            </Surface>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassCard className="p-5">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-5 h-[320px] w-full min-w-0">{children}</div>
    </GlassCard>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Surface className="p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">
        {label}
      </p>
      <p className="mt-2 text-sm font-black">{value}</p>
    </Surface>
  );
}
