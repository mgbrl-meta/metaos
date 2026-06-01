"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, LineChart as LineChartIcon, SlidersHorizontal } from "lucide-react";
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
  return rows
    .filter((row) => getSpend(row) > 0)
    .map((row) => dateKey(getDate(row)))
    .filter(Boolean)
    .sort()
    .at(-1) || "";
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

function buildHighCpaItems(rows: Row[], threshold: number) {
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
      const yesterday = summarize(adRows.filter((row) => dateKey(getDate(row)) === latest));

      return {
        key,
        ad: getAd(sample),
        campaign: getCampaign(sample),
        adSet: getAdSet(sample),
        lifetime,
        yesterday,
        trend: dailyTrend(adRows),
      };
    })
    .filter((item) => item.yesterday.spend > 0)
    .filter((item) => item.lifetime.purchases > 0)
    .filter((item) => item.lifetime.cpa >= threshold)
    .sort((a, b) => b.lifetime.cpa - a.lifetime.cpa);

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
        cpa: safeDiv(spend, purchases),
        roas: safeDiv(revenue, spend),
      };
    })
    .sort((a, b) => b.cpa - a.cpa);

  return { latest, items, campaigns };
}

export function HighCpaTab() {
  const rows = useMetaStore((state) => state.performanceRows);
  const [threshold, setThreshold] = useState(3000);

  const data = useMemo(() => {
    const result = buildHighCpaItems(rows || [], threshold);
    return {
      ...result,
      totalSpend: result.items.reduce((s, x) => s + x.lifetime.spend, 0),
      totalPurchases: result.items.reduce((s, x) => s + x.lifetime.purchases, 0),
      yesterdaySpend: result.items.reduce((s, x) => s + x.yesterday.spend, 0),
    };
  }, [rows, threshold]);

  return (
    <div className="grid gap-3">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-300">
              High CPA Control
            </p>
            <h1 className="mt-1 text-2xl font-black">Live High CPA Ads</h1>
            <p className="mt-1 text-sm opacity-60">
              Uses already-loaded Meta OS data. Shows ads that spent on latest active date and have lifetime CPA above selected threshold.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs">
            <Kpi label="Ads" value={String(data.items.length)} tone={data.items.length > 0 ? "red" : "green"} />
            <Kpi label="Spend" value={money(data.totalSpend)} />
            <Kpi label="Purchases" value={num(data.totalPurchases, 0)} />
            <Kpi label="Latest" value={data.latest || "NA"} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#0A84FF]" />
            <div>
              <h2 className="text-lg font-black">Lifetime CPA Threshold</h2>
              <p className="text-sm opacity-60">Ad must have purchases above 0 and lifetime CPA above this value.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[1000, 2000, 3000, 5000].map((value) => (
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
                {money(value)}
              </button>
            ))}

            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Number(e.target.value || 0)))}
              className="w-[130px] rounded-full border border-current/10 bg-transparent px-3 py-1.5 text-xs font-black outline-none"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <h2 className="text-lg font-black">High CPA Campaigns</h2>
          <p className="mt-1 text-sm opacity-60">Campaigns containing active ads above selected lifetime CPA.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="monthly-table-head">
              <tr>
                {["Campaign", "Ads", "Spend", "Purchases", "CPA", "ROAS", "Yesterday Spend"].map((h) => (
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
                  <td>{num(row.purchases, 0)}</td>
                  <td className="font-black text-red-600 dark:text-red-300">{money(row.cpa)}</td>
                  <td className={row.roas >= 1 ? "font-black text-emerald-600 dark:text-emerald-300" : "font-black text-red-600 dark:text-red-300"}>
                    {num(row.roas)}x
                  </td>
                  <td>{money(row.yesterdaySpend)}</td>
                </tr>
              ))}

              {!data.campaigns.length ? (
                <tr>
                  <td colSpan={7} className="p-5">No high CPA campaigns found at this threshold.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <h2 className="text-lg font-black">High CPA Creatives</h2>
          <p className="mt-1 text-sm opacity-60">
            Active latest-date ads where lifetime purchases &gt; 0 and lifetime CPA is above {money(threshold)}.
          </p>
        </div>

        <div className="divide-y divide-current/10">
          {data.items.map((item) => (
            <details key={item.key} className="group">
              <summary className="grid cursor-pointer list-none grid-cols-[1fr_90px_72px_72px_72px_72px_72px_72px_24px] items-center gap-3 px-4 py-3 text-xs hover:bg-current/[0.035]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                      High CPA
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
                <Metric label="CPM" value={money(item.lifetime.cpm)} />
                <Metric label="CTR" value={pct(item.lifetime.ctr)} />
                <Metric label="Purch." value={num(item.lifetime.purchases, 0)} />
                <Metric label="CPA" value={money(item.lifetime.cpa)} tone="red" />
                <Metric label="AOV" value={money(item.lifetime.aov)} />
                <Metric label="ROAS" value={`${num(item.lifetime.roas)}x`} tone={item.lifetime.roas >= 1 ? "green" : "red"} />
                <ChevronDown className="h-4 w-4 opacity-45 transition group-open:rotate-180" />
              </summary>

              <div className="grid gap-3 px-4 pb-4 lg:grid-cols-[1fr_1fr_440px]">
                <InfoBox
                  title="Why This Is Critical"
                  lines={[
                    `Lifetime CPA is ${money(item.lifetime.cpa)} against threshold ${money(threshold)}.`,
                    `Lifetime spend is ${money(item.lifetime.spend)} with ${num(item.lifetime.purchases, 0)} purchases.`,
                    `Yesterday spend was ${money(item.yesterday.spend)}.`,
                  ]}
                />

                <InfoBox
                  title="Metric Read"
                  lines={[
                    `CPM: ${money(item.lifetime.cpm)}`,
                    `CTR: ${pct(item.lifetime.ctr)}`,
                    `CPC: ${money(item.lifetime.cpc)}`,
                    `AOV: ${money(item.lifetime.aov)}`,
                    `ROAS: ${num(item.lifetime.roas)}x`,
                  ]}
                />

                <TrendBox data={item.trend} />
              </div>
            </details>
          ))}

          {!data.items.length ? (
            <div className="p-5">
              <p className="font-black">No high CPA active ads found.</p>
              <p className="mt-1 text-sm opacity-60">Try lowering the CPA threshold.</p>
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
        <AlertTriangle className="h-4 w-4" />
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

              <Tooltip
                contentStyle={{
                  background: "#111318",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  color: "white",
                  fontSize: 11,
                }}
                formatter={(value: any, name: any) => {
                  if (name === "Spend") return [money(Number(value || 0)), "Spend"];
                  if (name === "CPM") return [money(Number(value || 0)), "CPM"];
                  if (name === "CPA") return [value === null ? "No sale" : money(Number(value || 0)), "CPA"];
                  if (name === "AOV") return [value === null ? "No sale" : money(Number(value || 0)), "AOV"];
                  if (name === "CTR") return [pct(Number(value || 0)), "CTR"];
                  if (name === "ROAS") return [`${num(Number(value || 0))}x`, "ROAS"];
                  return [value, name];
                }}
              />

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

