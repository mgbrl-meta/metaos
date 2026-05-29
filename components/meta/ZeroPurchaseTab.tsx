"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  LineChart as LineChartIcon,
  SlidersHorizontal,
} from "lucide-react";
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
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

function latestDate(rows: Row[]) {
  const dates = rows.map((r) => parseDate(getDate(r))).filter(Boolean) as Date[];
  if (!dates.length) return "";
  return dateKey(new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString());
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
        roas: s.roas,
        cpa: s.purchases > 0 ? s.cpa : null,
        purchases: s.purchases,
      };
    });
}

function buildZeroPurchaseItems(rows: Row[], threshold: number) {
  const latest = latestDate(rows);
  const map = new Map<string, Row[]>();

  const activeYesterdayIds = new Set(
    rows
      .filter((row) => dateKey(getDate(row)) === latest)
      .filter((row) => getSpend(row) > 0)
      .map((row) => getAdId(row))
  );

  rows.forEach((row) => {
    const key = getAdId(row);
    if (!activeYesterdayIds.has(key)) return;

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  return Array.from(map.entries())
    .map(([key, adRows]) => {
      const sample = adRows[0];
      const lifetime = summarize(adRows);
      const yesterday = summarize(adRows.filter((row) => dateKey(getDate(row)) === latest));
      const trend = dailyTrend(adRows);

      return {
        key,
        ad: getAd(sample),
        campaign: getCampaign(sample),
        adSet: getAdSet(sample),
        lifetime,
        yesterday,
        trend,
      };
    })
    .filter((item) => item.yesterday.spend > 0)
    .filter((item) => item.lifetime.spend >= threshold)
    .filter((item) => item.lifetime.purchases === 0)
    .sort((a, b) => b.lifetime.spend - a.lifetime.spend);
}

export function ZeroPurchaseTab() {
  const rows = useMetaStore((state) => state.performanceRows);
  const [threshold, setThreshold] = useState(3000);

  const data = useMemo(() => {
    const items = buildZeroPurchaseItems(rows || [], threshold);

    const totalSpend = items.reduce((s, x) => s + x.lifetime.spend, 0);
    const yesterdaySpend = items.reduce((s, x) => s + x.yesterday.spend, 0);
    const latest = latestDate(rows || []);

    return {
      items,
      latest,
      totalSpend,
      yesterdaySpend,
    };
  }, [rows, threshold]);

  return (
    <div className="grid gap-3">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-300">
              Zero Purchase Control
            </p>
            <h1 className="mt-1 text-2xl font-black">Live Zero-Purchase Ads</h1>
            <p className="mt-1 text-sm opacity-60">
              Only ads that spent yesterday are shown. Lifetime purchases must be zero and lifetime spend must cross your selected threshold.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <Kpi label="Ads" value={String(data.items.length)} tone={data.items.length > 0 ? "red" : "green"} />
            <Kpi label="Lifetime Waste" value={money(data.totalSpend)} tone={data.totalSpend > 0 ? "red" : "green"} />
            <Kpi label="Yesterday Waste" value={money(data.yesterdaySpend)} tone={data.yesterdaySpend > 0 ? "red" : "green"} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#0A84FF]" />
            <div>
              <h2 className="text-lg font-black">Lifetime Spend Threshold</h2>
              <p className="text-sm opacity-60">Filter zero-purchase ads by lifetime spend.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[2000, 3000, 5000, 10000].map((value) => (
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
              className="w-[120px] rounded-full border border-current/10 bg-transparent px-3 py-1.5 text-xs font-black outline-none"
              placeholder="Custom"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="flex items-center justify-between gap-3 border-b border-current/10 px-4 py-3">
          <div>
            <h2 className="text-lg font-black">Zero Purchase Ads</h2>
            <p className="mt-1 text-sm opacity-60">
              Showing ads live yesterday with lifetime spend above {money(threshold)} and 0 lifetime purchases.
            </p>
          </div>

          <span className="rounded-full border border-current/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
            Latest {data.latest || "NA"}
          </span>
        </div>

        <div className="divide-y divide-current/10">
          {data.items.map((item) => (
            <details key={item.key} className="group">
              <summary className="grid cursor-pointer list-none grid-cols-[1fr_94px_84px_84px_84px_84px_24px] items-center gap-3 px-4 py-3 text-xs hover:bg-current/[0.035]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                      Zero Purchase
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

                <Metric label="Life Spend" value={money(item.lifetime.spend)} tone="red" />
                <Metric label="CPM" value={money(item.lifetime.cpm)} />
                <Metric label="CTR" value={pct(item.lifetime.ctr)} />
                <Metric label="CPA" value="No sale" tone="red" />
                <Metric label="ROAS" value="0.00x" tone="red" />
                <ChevronDown className="h-4 w-4 opacity-45 transition group-open:rotate-180" />
              </summary>

              <div className="grid gap-3 px-4 pb-4 lg:grid-cols-[1fr_1fr_440px]">
                <InfoBox
                  title="Why This Is Critical"
                  lines={[
                    `This ad spent ${money(item.lifetime.spend)} lifetime with 0 purchases.`,
                    `It still spent yesterday, so it is not an old paused ad.`,
                    `Yesterday spend was ${money(item.yesterday.spend)} with 0 purchases.`,
                    "This should usually be paused, capped, or rebuilt before it consumes more delivery.",
                  ]}
                />

                <InfoBox
                  title="Metric Read"
                  lines={[
                    `CPM: ${money(item.lifetime.cpm)}`,
                    `CTR: ${pct(item.lifetime.ctr)}`,
                    `CPC: ${money(item.lifetime.cpc)}`,
                    `Frequency: ${num(item.lifetime.freq)}x`,
                    "CPA, AOV and ROAS are not valid because purchases are zero.",
                  ]}
                />

                <TrendBox data={item.trend} />
              </div>
            </details>
          ))}

          {!data.items.length && (
            <div className="p-5">
              <p className="font-black">No zero-purchase live ads found at this threshold.</p>
              <p className="mt-1 text-sm opacity-60">
                Try lowering the lifetime spend threshold or check after tomorrow’s spend sync.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "red" | "green";
}) {
  return (
    <div className="rounded-lg border border-current/10 bg-current/[0.035] px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-45">{label}</p>
      <p
        className={
          tone === "red"
            ? "mt-0.5 font-black text-red-600 dark:text-red-300"
            : tone === "green"
            ? "mt-0.5 font-black text-emerald-600 dark:text-emerald-300"
            : "mt-0.5 font-black"
        }
      >
        {value}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "red" | "green";
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-45">{label}</p>
      <p
        className={
          tone === "red"
            ? "mt-0.5 font-black text-red-600 dark:text-red-300"
            : tone === "green"
            ? "mt-0.5 font-black text-emerald-600 dark:text-emerald-300"
            : "mt-0.5 font-black"
        }
      >
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
  return (
    <div className="rounded-lg border border-current/10 bg-current/[0.025] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] opacity-55">
          <LineChartIcon className="h-4 w-4" />
          CPM / CTR / ROAS Trend
        </p>
      </div>

      <div className="h-[160px] w-full">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.16)" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "currentColor" }} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis yAxisId="money" tick={{ fontSize: 9, fill: "currentColor" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `₹${Math.round(Number(v || 0))}`} />
            <YAxis yAxisId="rate" orientation="right" tick={{ fontSize: 9, fill: "currentColor" }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => `${Math.round(Number(v || 0) * 100)}%`} />
            <Tooltip
              contentStyle={{
                background: "#111318",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                color: "white",
                fontSize: 11,
              }}
              formatter={(value: any, name: any) => {
                if (name === "CPM") return [money(Number(value || 0)), "CPM"];
                if (name === "CTR") return [pct(Number(value || 0)), "CTR"];
                if (name === "ROAS") return [`${num(Number(value || 0))}x`, "ROAS"];
                return [value, name];
              }}
            />
            <Line yAxisId="money" type="monotone" dataKey="cpm" name="CPM" stroke="#0A84FF" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="rate" type="monotone" dataKey="ctr" name="CTR" stroke="#087f5b" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="rate" type="monotone" dataKey="roas" name="ROAS" stroke="#b42318" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
