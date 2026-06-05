"use client";

import { CreativeTrendTooltip } from "@/components/meta/shared/CreativeTrendTooltip";

import { useMemo, useState } from "react";
import { ChevronDown, LineChart as LineChartIcon, SlidersHorizontal, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMetaStore } from "@/store/metaStore";

type Row = Record<string, any>;

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number, d = 2) => `${num(Number(n || 0) * 100, d)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKey(value?: string) {
  const d = parseDate(value);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function displayDate(value?: string) {
  const d = parseDate(value);
  if (!d) return value || "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getDate(row: Row) {
  return String(row.date || row.day || row.Day || "");
}

function getCampaign(row: Row) {
  return String(row.campaignName || row.campaign_name || row["Campaign name"] || "Unknown Campaign");
}

function getAdSet(row: Row) {
  return String(row.adSetName || row.adset_name || row.ad_set_name || row["Ad set name"] || "Unknown Ad Set");
}

function getAd(row: Row) {
  return String(row.adName || row.ad_name || row["Ad name"] || "Unknown Creative");
}

function getAdId(row: Row) {
  return String(row.adId || row.ad_id || row["Ad ID"] || getAd(row));
}

function getSpend(row: Row) {
  return Number(row.spend ?? row.amountSpent ?? row.amount_spent ?? row["Amount spent (INR)"] ?? 0);
}

function getRevenue(row: Row) {
  return Number(
    row.revenue ??
      row.purchaseValue ??
      row.purchase_value ??
      row.conversionValue ??
      row.conversion_value ??
      row["Purchases conversion value"] ??
      0
  );
}

function getPurchases(row: Row) {
  return Number(row.purchases ?? row.Purchases ?? 0);
}

function getImpressions(row: Row) {
  return Number(row.impressions ?? row.Impressions ?? 0);
}

function getReach(row: Row) {
  return Number(row.reach ?? row.Reach ?? 0);
}

function getClicks(row: Row) {
  return Number(
    row.clicks ??
      row.linkClicks ??
      row.link_clicks ??
      row.outboundClicks ??
      row.outbound_clicks ??
      row["Link clicks"] ??
      row["Clicks (all)"] ??
      0
  );
}

function latestSpendDate(rows: Row[]) {
  return (
    rows
      .filter((row) => getSpend(row) > 0)
      .map((row) => dateKey(getDate(row)))
      .filter(Boolean)
      .sort()
      .at(-1) || ""
  );
}

function summarize(rows: Row[]) {
  const spend = rows.reduce((s, r) => s + getSpend(r), 0);
  const revenue = rows.reduce((s, r) => s + getRevenue(r), 0);
  const purchases = rows.reduce((s, r) => s + getPurchases(r), 0);
  const impressions = rows.reduce((s, r) => s + getImpressions(r), 0);
  const reach = rows.reduce((s, r) => s + getReach(r), 0);
  const clicks = rows.reduce((s, r) => s + getClicks(r), 0);

  return {
    spend,
    revenue,
    purchases,
    impressions,
    reach,
    clicks,
    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, purchases),
    aov: safeDiv(revenue, purchases),
    cpm: safeDiv(spend * 1000, impressions),
    ctr: safeDiv(clicks, impressions),
    cpc: safeDiv(spend, clicks),
    freq: safeDiv(impressions, reach),
  };
}


function metaOsLast7DateKey(row: Row) {
  const raw = String(
    row.date ??
      row.day ??
      row.Date ??
      row.Day ??
      row["Date"] ??
      row["Day"] ??
      row["Reporting starts"] ??
      row["Reporting Starts"] ??
      row["Start Date"] ??
      ""
  ).trim();

  if (!raw) return "";

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const d = slash[1].padStart(2, "0");
    const m = slash[2].padStart(2, "0");
    const y = slash[3];
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return raw;
}

function summarizeLastNDays(rows: Row[], days = 7) {
  const dates = Array.from(
    new Set(rows.map((row) => metaOsLast7DateKey(row)).filter(Boolean))
  ).sort();

  const lastDates = new Set(dates.slice(-days));

  return summarize(rows.filter((row) => lastDates.has(metaOsLast7DateKey(row))));
}


function dailyTrend(rows: Row[]) {
  const map = new Map<string, Row[]>();

  rows.forEach((row) => {
    const key = dateKey(getDate(row));
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, dayRows]) => {
      const s = summarize(dayRows);
      return {
        date,
        label: displayDate(date),
        spend: s.spend,
        cpm: s.cpm,
        ctr: s.ctr,
        cpa: s.purchases > 0 ? s.cpa : null,
        aov: s.purchases > 0 ? s.aov : null,
        roas: s.roas,
        purchases: s.purchases,
      };
    });
}

function buildHighRoasItems(rows: Row[], threshold: number) {
  const latest = latestSpendDate(rows);

  const activeIds = new Set(
    rows
      .filter((row) => dateKey(getDate(row)) === latest)
      .filter((row) => getSpend(row) > 0)
      .map((row) => getAdId(row))
  );

  const map = new Map<string, Row[]>();

  rows.forEach((row) => {
    const key = getAdId(row);
    if (!activeIds.has(key)) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  const items = Array.from(map.entries())
    .map(([key, adRows]) => {
      const sample = adRows[0];
      const lifetime = summarize(adRows);
      const last7 = summarizeLastNDays(adRows, 7);
      const yesterday = summarize(adRows.filter((row) => dateKey(getDate(row)) === latest));

      return {
        key,
        ad: getAd(sample),
        campaign: getCampaign(sample),
        adSet: getAdSet(sample),
        lifetime,
        last7,
        yesterday,
        trend: dailyTrend(adRows),
      };
    })
    .filter((item) => item.yesterday.spend > 0)
    .filter((item) => item.lifetime.purchases > 0)
    .filter((item) => item.lifetime.roas >= threshold)
    .sort((a, b) => b.lifetime.roas - a.lifetime.roas);

  const campaignMap = new Map<string, typeof items>();

  items.forEach((item) => {
    if (!campaignMap.has(item.campaign)) campaignMap.set(item.campaign, []);
    campaignMap.get(item.campaign)!.push(item);
  });

  const campaigns = Array.from(campaignMap.entries())
    .map(([campaign, campaignItems]) => {
      const spend = campaignItems.reduce((s, x) => s + x.lifetime.spend, 0);
      const revenue = campaignItems.reduce((s, x) => s + x.lifetime.revenue, 0);
      const purchases = campaignItems.reduce((s, x) => s + x.lifetime.purchases, 0);
      const yesterdaySpend = campaignItems.reduce((s, x) => s + x.yesterday.spend, 0);

      return {
        campaign,
        ads: campaignItems.length,
        spend,
        revenue,
        purchases,
        yesterdaySpend,
        roas: safeDiv(revenue, spend),
        cpa: safeDiv(spend, purchases),
      };
    })
    .sort((a, b) => b.roas - a.roas);

  return { latest, items, campaigns };
}

export function HighRoasTab() {
  const rows = useMetaStore((state) => state.performanceRows);
  const [threshold, setThreshold] = useState(1.2);

  const data = useMemo(() => {
    const result = buildHighRoasItems(rows || [], threshold);
    return {
      ...result,
      totalSpend: result.items.reduce((s, x) => s + x.lifetime.spend, 0),
      totalRevenue: result.items.reduce((s, x) => s + x.lifetime.revenue, 0),
      totalPurchases: result.items.reduce((s, x) => s + x.lifetime.purchases, 0),
      yesterdaySpend: result.items.reduce((s, x) => s + x.yesterday.spend, 0),
    };
  }, [rows, threshold]);

  const blendedRoas = safeDiv(data.totalRevenue, data.totalSpend);

  return (
    <div className="grid gap-3">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
              High ROAS Control
            </p>
            <h1 className="mt-1 text-2xl font-black">Live High ROAS Ads</h1>
            <p className="mt-1 text-sm opacity-60">
              Uses already-loaded Meta OS data. Shows ads that spent on latest active date and have lifetime ROAS above selected threshold.
            </p>
          </div>

          <div className="grid grid-cols-5 gap-2 text-xs">
            <Kpi label="Ads" value={String(data.items.length)} tone={data.items.length > 0 ? "green" : undefined} />
            <Kpi label="Spend" value={money(data.totalSpend)} />
            <Kpi label="Revenue" value={money(data.totalRevenue)} tone="green" />
            <Kpi label="ROAS" value={`${num(blendedRoas)}x`} tone={blendedRoas >= threshold ? "green" : undefined} />
            <Kpi label="Latest" value={data.latest || "NA"} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#0A84FF]" />
            <div>
              <h2 className="text-lg font-black">Lifetime ROAS Threshold</h2>
              <p className="text-sm opacity-60">Ad must have purchases above 0 and lifetime ROAS above this value.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[1.2, 1.5, 2].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setThreshold(value)}
                className={
                  threshold === value
                    ? "rounded-full bg-[#0A84FF] px-3 py-1.5 text-xs font-black text-white"
                    : "rounded-full border border-current/10 px-3 py-1.5 text-xs font-black"
                }
              >
                {num(value, 1)}x
              </button>
            ))}

            <input
              type="number"
              step="0.1"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Number(e.target.value || 0)))}
              className="w-[130px] rounded-full border border-current/10 bg-transparent px-3 py-1.5 text-xs font-black outline-none"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <h2 className="text-lg font-black">High ROAS Campaigns</h2>
          <p className="mt-1 text-sm opacity-60">Campaigns containing active ads above selected lifetime ROAS.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="monthly-table-head">
              <tr>
                {["Campaign", "Ads", "Spend", "Revenue", "Purchases", "ROAS", "CPA", "Yesterday Spend"].map((h) => (
                  <th key={h} className="monthly-table-th">{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.campaigns.map((row) => (
                <tr key={row.campaign} className="border-b border-current/10">
                  <td className="font-black">{row.campaign}</td>
                  <td>{row.ads}</td>
                  <td>{money(row.spend)}</td>
                  <td>{money(row.revenue)}</td>
                  <td>{num(row.purchases, 0)}</td>
                  <td className="font-black text-emerald-600 dark:text-emerald-300">{num(row.roas)}x</td>
                  <td>{money(row.cpa)}</td>
                  <td>{money(row.yesterdaySpend)}</td>
                </tr>
              ))}

              {!data.campaigns.length ? (
                <tr>
                  <td colSpan={8} className="p-5">No high ROAS campaigns found at this threshold.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <h2 className="text-lg font-black">High ROAS Creatives</h2>
          <p className="mt-1 text-sm opacity-60">
            Active latest-date ads where lifetime purchases &gt; 0 and lifetime ROAS is above {num(threshold, 1)}x.
          </p>
        </div>

        <div className="divide-y divide-current/10">
          {data.items.map((item) => (
            <details key={item.key} className="group">
              <summary className="creative-summary-row cursor-pointer list-none px-4 py-3 text-xs hover:bg-current/[0.035]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                      High ROAS
                    </span>
                    <span className="rounded-full border border-current/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] opacity-70">
                      Y Spend {money(item.yesterday.spend)}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-sm font-black">{item.ad}</p>
                  <p className="mt-0.5 truncate opacity-60">
                    {item.campaign} · {item.adSet}
                  </p>
                </div>

                <Metric label="Spend" value={money(item.lifetime.spend)} />
                <Metric label="Purch." value={num(item.lifetime.purchases, 0)} />
                <Metric label="CPM" value={money(item.lifetime.cpm)} />
                <Metric label="CTR" value={pct(item.lifetime.ctr)} />
                <Metric label="CPA" value={money(item.lifetime.cpa)} />
                <Metric label="AOV" value={money(item.lifetime.aov)} />
                <Metric label="ROAS" value={`${num(item.lifetime.roas)}x`} tone="green" />
                <Metric label="Last 7D Spend" value={money(item.last7.spend)} />
                <Metric
                  label="Last 7D CPA"
                  value={item.last7.purchases > 0 ? money(item.last7.cpa) : "No sale"}
                  tone={item.last7.purchases > 0 && item.last7.cpa <= item.lifetime.cpa ? "green" : "red"}
                />
                <Metric
                  label="Last 7D ROAS"
                  value={`${num(item.last7.roas)}x`}
                  tone={item.last7.roas >= item.lifetime.roas ? "green" : "red"}
                />
                <ChevronDown className="h-4 w-4 opacity-45 transition group-open:rotate-180" />
              </summary>

              <div className="grid gap-3 px-4 pb-4 lg:grid-cols-[1fr_1fr_440px]">
                <InfoBox
                  title="Why This Is Working"
                  lines={[
                    `Lifetime ROAS is ${num(item.lifetime.roas)}x against threshold ${num(threshold, 1)}x.`,
                    `Lifetime spend is ${money(item.lifetime.spend)} with ${num(item.lifetime.purchases, 0)} purchases.`,
                    `Lifetime CPA is ${money(item.lifetime.cpa)} and AOV is ${money(item.lifetime.aov)}.`,
                    `Yesterday spend was ${money(item.yesterday.spend)}, so this is still active.`,
                  ]}
                />

                <InfoBox
                  title="Operator Action"
                  lines={[
                    "Protect this creative from accidental edits.",
                    "Use this as a reference for new variants.",
                    "Scale carefully if recent trend is stable and CPA is not rising.",
                    "Extract the hook, proof, offer and visual pattern for the creative team.",
                  ]}
                />

                <TrendBox data={item.trend} />
              </div>
            </details>
          ))}

          {!data.items.length ? (
            <div className="p-5">
              <p className="font-black">No high ROAS active ads found.</p>
              <p className="mt-1 text-sm opacity-60">Try lowering the ROAS threshold.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "red" | "green" }) {
  return (
    <div className="rounded-lg border border-current/10 bg-current/[0.035] px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-45">{label}</p>
      <p className={tone === "red" ? "mt-0.5 font-black text-red-600 dark:text-red-300" : tone === "green" ? "mt-0.5 font-black text-emerald-600 dark:text-emerald-300" : "mt-0.5 font-black"}>
        {value}
      </p>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "red" | "green" }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-45">{label}</p>
      <p className={tone === "red" ? "mt-0.5 font-black text-red-600 dark:text-red-300" : tone === "green" ? "mt-0.5 font-black text-emerald-600 dark:text-emerald-300" : "mt-0.5 font-black"}>
        {value}
      </p>
    </div>
  );
}

function InfoBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-current/10 bg-current/[0.025] p-3">
      <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] opacity-55">
        <TrendingUp className="h-4 w-4" />
        {title}
      </p>
      <ul className="mt-2 grid gap-1.5 text-xs leading-5 opacity-75">
        {lines.map((line) => (
          <li key={line}>• {line}</li>
        ))}
      </ul>
    </div>
  );
}

function TrendBox({ data }: { data: any[] }) {
  const [visibleMetrics, setVisibleMetrics] = useState<Record<string, boolean>>({
    spend: true,
    cpm: false,
    ctr: false,
    cpa: true,
    aov: false,
    roas: true,
  });

  const metricOptions = [
    { key: "spend", label: "Spend", axis: "money", color: "#0A84FF" },
    { key: "cpm", label: "CPM", axis: "money", color: "#64748b" },
    { key: "ctr", label: "CTR", axis: "rate", color: "#087f5b" },
    { key: "cpa", label: "CPA", axis: "money", color: "#b42318" },
    { key: "aov", label: "AOV", axis: "money", color: "#9333ea" },
    { key: "roas", label: "ROAS", axis: "rate", color: "#f97316" },
  ];

  function toggleMetric(key: string) {
    setVisibleMetrics((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  const hasVisibleMetric = metricOptions.some((metric) => visibleMetrics[metric.key]);

  return (
    <div className="rounded-lg border border-current/10 bg-current/[0.025] p-3">
      <div className="mb-2 flex flex-col gap-2">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] opacity-55">
          <LineChartIcon className="h-4 w-4" />
          Select Metrics Trend
        </p>

        <div className="flex flex-wrap gap-2">
          {metricOptions.map((metric) => (
            <label
              key={metric.key}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-current/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em]"
            >
              <input
                type="checkbox"
                checked={Boolean(visibleMetrics[metric.key])}
                onChange={() => toggleMetric(metric.key)}
                className="h-3 w-3 accent-[#0A84FF]"
              />
              <span>{metric.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="h-[180px] w-full">
        {hasVisibleMetric ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.16)" />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
                minTickGap={16}
              />

              <YAxis
                yAxisId="money"
                tick={{ fontSize: 9, fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
                width={54}
                tickFormatter={(v) => `₹${Math.round(Number(v || 0))}`}
              />

              <YAxis
                yAxisId="rate"
                orientation="right"
                tick={{ fontSize: 9, fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={(v) => `${Math.round(Number(v || 0) * 100)}%`}
              />

              <Tooltip content={<CreativeTrendTooltip />} />

              {metricOptions.map((metric) =>
                visibleMetrics[metric.key] ? (
                  <Line
                    key={metric.key}
                    yAxisId={metric.axis}
                    type="monotone"
                    dataKey={metric.key}
                    name={metric.label}
                    stroke={metric.color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ) : null
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs opacity-60">
            Select at least one metric to view trend.
          </div>
        )}
      </div>
    </div>
  );
}

