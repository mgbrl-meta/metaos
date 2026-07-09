"use client";

import { useMemo, useState } from "react";
import { Activity, IndianRupee, LineChart as LineChartIcon, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMetaStore } from "@/store/metaStore";
import { GlassCard, MutedText, Surface, TonePill } from "@/components/cards/MetaCards";

type SortMode = "yesterday_spend" | "l30_cpa" | "l30_spend" | "l30_roas";

const CPA_BAD = 3000;

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString()}`;
const compact = (n: number) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
  if (Math.abs(v) >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return Math.round(v).toLocaleString();
};
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

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
  if (!d) return value || "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getDate(row: any) {
  return String(row.date || row.day || row.Day || "");
}

function getSpend(row: any) {
  return Number(row.spend ?? row.amountSpent ?? row.amount_spent ?? row["Amount spent (INR)"] ?? 0);
}

function getRevenue(row: any) {
  return Number(
    row.revenue ??
      row.purchaseValue ??
      row.purchase_value ??
      row.purchaseConversionValue ??
      row.purchase_conversion_value ??
      row.conversionValue ??
      row.conversion_value ??
      row["Purchases conversion value"] ??
      0
  );
}

function getPurchases(row: any) {
  return Number(row.purchases ?? row.Purchases ?? 0);
}

function getCTR(row: any) {
  const raw = Number(row.ctr ?? row.CTR ?? row["CTR (all)"] ?? 0);
  return raw > 1 ? raw / 100 : raw;
}

function adKey(row: any) {
  return String(row.adId || row.ad_id || row["Ad ID"] || row.adName || row.ad_name || row["Ad name"] || "unknown");
}

function adName(row: any) {
  return String(row.adName || row.ad_name || row["Ad name"] || "Unknown Creative");
}

function campaignName(row: any) {
  return String(row.campaignName || row.campaign_name || row["Campaign name"] || "Unknown Campaign");
}

function adSetName(row: any) {
  return String(row.adSetName || row.adset_name || row.ad_set_name || row["Ad set name"] || "Unknown Ad Set");
}

function getLatestDate(rows: any[]) {
  const dates = rows.map((r) => parseDate(getDate(r))).filter(Boolean) as Date[];
  if (!dates.length) return "";
  const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
  return dateKey(latest.toISOString());
}

function activeYesterdayAdKeys(rows: any[]) {
  const latest = getLatestDate(rows);
  const keys = new Set<string>();

  rows.forEach((row) => {
    if (dateKey(getDate(row)) !== latest) return;
    if (getSpend(row) <= 0) return;
    keys.add(adKey(row));
  });

  return { latest, keys };
}

function summarize(rows: any[]) {
  const spend = rows.reduce((s, r) => s + getSpend(r), 0);
  const revenue = rows.reduce((s, r) => s + getRevenue(r), 0);
  const purchases = rows.reduce((s, r) => s + getPurchases(r), 0);
  const ctrNumerator = rows.reduce((s, r) => s + getCTR(r) * getSpend(r), 0);

  return {
    spend,
    revenue,
    purchases,
    cpa: safeDiv(spend, purchases),
    roas: safeDiv(revenue, spend),
    aov: safeDiv(revenue, purchases),
    ctr: safeDiv(ctrNumerator, spend),
  };
}

function dailyTimeline(rows: any[]) {
  const map = new Map<string, any>();

  rows.forEach((row) => {
    const key = dateKey(getDate(row));
    if (!key) return;

    if (!map.has(key)) {
      map.set(key, {
        date: key,
        label: displayDate(key),
        spend: 0,
        revenue: 0,
        purchases: 0,
      });
    }

    const item = map.get(key);
    item.spend += getSpend(row);
    item.revenue += getRevenue(row);
    item.purchases += getPurchases(row);
  });

  return Array.from(map.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map((r) => ({
      ...r,
      cpa: safeDiv(r.spend, r.purchases),
      roas: safeDiv(r.revenue, r.spend),
      aov: safeDiv(r.revenue, r.purchases),
    }));
}

function groupCreatives(rows: any[]) {
  const { latest, keys } = activeYesterdayAdKeys(rows);
  const eligible = rows.filter((row) => keys.has(adKey(row)));

  const map = new Map<string, any>();

  eligible.forEach((row) => {
    const key = adKey(row);

    if (!map.has(key)) {
      map.set(key, {
        key,
        adName: adName(row),
        campaignName: campaignName(row),
        adSetName: adSetName(row),
        rows: [],
        yesterdayRows: [],
      });
    }

    const item = map.get(key);
    item.rows.push(row);

    if (dateKey(getDate(row)) === latest) {
      item.yesterdayRows.push(row);
    }
  });

  return {
    latest,
    creatives: Array.from(map.values()).map((item) => {
      const timeline = dailyTimeline(item.rows);
      const l30 = summarize(item.rows.filter((r: any) => timeline.some((d: any) => d.date === dateKey(getDate(r)))));
      const yesterday = summarize(item.yesterdayRows);

      return {
        ...item,
        timeline,
        l30,
        yesterday,
      };
    }),
  };
}

function sortCreatives(rows: any[], mode: SortMode) {
  return [...rows].sort((a, b) => {
    if (mode === "l30_cpa") return b.l30.cpa - a.l30.cpa;
    if (mode === "l30_spend") return b.l30.spend - a.l30.spend;
    if (mode === "l30_roas") return b.l30.roas - a.l30.roas;
    return b.yesterday.spend - a.yesterday.spend;
  });
}

export function CreativeTimelineMetrics() {
  const rows = useMetaStore((state) => state.performanceRows);
  const [sortMode, setSortMode] = useState<SortMode>("yesterday_spend");
  const [limit, setLimit] = useState(20);

  const data = useMemo(() => {
    const grouped = groupCreatives(rows || []);
    const sorted = sortCreatives(grouped.creatives, sortMode);

    return {
      latest: grouped.latest,
      creatives: sorted.slice(0, limit),
      totalActive: grouped.creatives.length,
    };
  }, [rows, sortMode, limit]);

  return (
    <GlassCard className="overflow-hidden min-w-0">
      <div className="border-b border-current/10 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <TonePill tone="blue">Timeline Metrics</TonePill>
              <TonePill tone="neutral">Only Creatives With Spend Yesterday</TonePill>
              <TonePill tone="neutral">Latest: {data.latest || "NA"}</TonePill>
            </div>

            <h2 className="mt-2 text-lg font-black">Creative CPA / ROAS / AOV Timeline</h2>
            <MutedText className="mt-1 text-xs leading-5">
              Each creative now shows proper last 30-day trendlines with timeline axis and metric context.
            </MutedText>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded-full border border-current/10 bg-transparent px-3 py-1.5 text-[11px] font-black outline-none"
            >
              <option value="yesterday_spend">Sort: Yesterday Spend</option>
              <option value="l30_cpa">Sort: L30 CPA High</option>
              <option value="l30_spend">Sort: L30 Spend</option>
              <option value="l30_roas">Sort: L30 ROAS</option>
            </select>

            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-full border border-current/10 bg-transparent px-3 py-1.5 text-[11px] font-black outline-none"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={40}>Top 40</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-2 p-3">
        {data.creatives.map((creative) => {
          const isCritical = creative.l30.cpa > CPA_BAD && creative.l30.purchases > 0;

          return (
            <Surface key={creative.key} className={isCritical ? "p-3 border border-red-400/25" : "p-3"}>
              <div className="grid gap-3 xl:grid-cols-[360px_1fr]">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    {isCritical ? (
                      <TonePill tone="red">CPA Critical</TonePill>
                    ) : (
                      <TonePill tone="green">Active</TonePill>
                    )}
                    <TonePill tone="neutral">Yesterday Spend {money(creative.yesterday.spend)}</TonePill>
                  </div>

                  <p className="mt-2 text-sm font-black leading-5 whitespace-normal break-words">
                    {creative.adName}
                  </p>

                  <MutedText className="mt-1 text-[11px] leading-4">
                    Campaign: {creative.campaignName}
                    <br />
                    Ad Set: {creative.adSetName}
                  </MutedText>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Mini label="Y Spend" value={money(creative.yesterday.spend)} />
                    <Mini label="Y CPA" value={creative.yesterday.purchases > 0 ? money(creative.yesterday.cpa) : "No sale"} red={creative.yesterday.purchases === 0 && creative.yesterday.spend > 0} />
                    <Mini label="L30 Spend" value={money(creative.l30.spend)} />
                    <Mini label="L30 CPA" value={creative.l30.purchases > 0 ? money(creative.l30.cpa) : "No sale"} red={creative.l30.cpa > CPA_BAD && creative.l30.purchases > 0} />
                    <Mini label="L30 ROAS" value={num(creative.l30.roas)} green={creative.l30.roas >= 1} red={creative.l30.roas < 0.7} />
                    <Mini label="L30 AOV" value={money(creative.l30.aov)} />
                  </div>
                </div>

                <div className="grid min-w-0 gap-2 lg:grid-cols-3">
                  <MetricChart
                    title="CPA"
                    data={creative.timeline}
                    dataKey="cpa"
                    formatter={money}
                    threshold={CPA_BAD}
                    lowerIsBetter
                  />
                  <MetricChart
                    title="ROAS"
                    data={creative.timeline}
                    dataKey="roas"
                    formatter={(v) => `${num(v)}x`}
                    threshold={1}
                    higherIsBetter
                  />
                  <MetricChart
                    title="AOV"
                    data={creative.timeline}
                    dataKey="aov"
                    formatter={money}
                    higherIsBetter
                  />
                </div>
              </div>
            </Surface>
          );
        })}

        {!data.creatives.length && (
          <Surface className="p-4">
            <p className="font-black">No creatives with spend yesterday found.</p>
          </Surface>
        )}
      </div>
    </GlassCard>
  );
}

function Mini({
  label,
  value,
  red = false,
  green = false,
}: {
  label: string;
  value: string;
  red?: boolean;
  green?: boolean;
}) {
  return (
    <div className="rounded-lg border border-current/10 bg-current/[0.035] px-2 py-1.5">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-40">{label}</p>
      <p className={red ? "mt-0.5 text-xs font-black text-red-400" : green ? "mt-0.5 text-xs font-black text-emerald-400" : "mt-0.5 text-xs font-black"}>
        {value}
      </p>
    </div>
  );
}

function MetricChart({
  title,
  data,
  dataKey,
  formatter,
  threshold,
  lowerIsBetter = false,
  higherIsBetter = false,
}: {
  title: string;
  data: any[];
  dataKey: string;
  formatter: (value: number) => string;
  threshold?: number;
  lowerIsBetter?: boolean;
  higherIsBetter?: boolean;
}) {
  const values = data.map((r) => Number(r[dataKey] || 0)).filter((v) => Number.isFinite(v) && v > 0);
  const first = values[0] || 0;
  const last = values[values.length - 1] || 0;
  const change = first > 0 ? (last - first) / first : 0;

  const improving = lowerIsBetter ? change < 0 : higherIsBetter ? change > 0 : false;
  const breaking = lowerIsBetter ? change > 0.1 : higherIsBetter ? change < -0.1 : false;

  return (
    <div className="min-w-0 rounded-lg border border-current/10 bg-current/[0.025] p-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em] opacity-50">
            <LineChartIcon className="h-3 w-3" />
            {title}
          </p>
          <p className={breaking ? "mt-0.5 text-[10px] font-black text-red-400" : improving ? "mt-0.5 text-[10px] font-black text-emerald-400" : "mt-0.5 text-[10px] opacity-45"}>
            {values.length ? `${formatter(first)} → ${formatter(last)}` : "Not enough signal"}
          </p>
        </div>

        <Activity className={breaking ? "h-4 w-4 text-red-400" : improving ? "h-4 w-4 text-emerald-400" : "h-4 w-4 opacity-35"} />
      </div>

      <div className="h-[120px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.16)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "currentColor", opacity: 0.5 }}
              axisLine={false}
              tickLine={false}
              minTickGap={18}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "currentColor", opacity: 0.5 }}
              axisLine={false}
              tickLine={false}
              width={42}
              tickFormatter={(v) => {
                if (title === "ROAS") return `${num(Number(v), 1)}x`;
                return compact(Number(v));
              }}
            />
            <Tooltip
              contentStyle={{
                background: "#111318",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                color: "white",
                fontSize: 11,
              }}
              formatter={(value: any) => [formatter(Number(value || 0)), title]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            {threshold ? (
              <ReferenceLine
                y={threshold}
                stroke="rgba(180,35,24,0.7)"
                strokeDasharray="3 3"
              />
            ) : null}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={breaking ? "#b42318" : "#0b8f61"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
