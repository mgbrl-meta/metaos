"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  LineChart as LineChartIcon,
  ShieldCheck,
  Sparkles,
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
type CreativeBucket =
  | "CRITICAL CPA"
  | "ZERO PURCHASE"
  | "REDUCE"
  | "REFRESH"
  | "SCALE"
  | "PROTECT"
  | "WATCH";

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number) => `${num(Number(n || 0) * 100, 2)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

const CPA_CRITICAL = 3000;
const CPA_HIGH = 1800;
const MIN_ZERO_PURCHASE_SPEND = 3000;

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

function getPurchases(row: Row) {
  return Number(row.purchases ?? row.Purchases ?? 0);
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

function latestDate(rows: Row[]) {
  const dates = rows.map((r) => parseDate(getDate(r))).filter(Boolean) as Date[];
  if (!dates.length) return "";
  return dateKey(new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString());
}

function windowRows(rows: Row[], latest: string, days: number) {
  const end = parseDate(latest);
  if (!end) return rows;

  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);

  return rows.filter((row) => {
    const d = parseDate(getDate(row));
    return d ? d >= start && d <= end : false;
  });
}

function summarize(rows: Row[]) {
  const spend = rows.reduce((s, r) => s + getSpend(r), 0);
  const impressions = rows.reduce((s, r) => s + getImpressions(r), 0);
  const reach = rows.reduce((s, r) => s + getReach(r), 0);
  const clicks = rows.reduce((s, r) => s + getClicks(r), 0);
  const purchases = rows.reduce((s, r) => s + getPurchases(r), 0);
  const revenue = rows.reduce((s, r) => s + getRevenue(r), 0);

  return {
    spend,
    impressions,
    reach,
    clicks,
    purchases,
    revenue,
    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, purchases),
    ctr: safeDiv(clicks, impressions),
    freq: safeDiv(impressions, reach),
    aov: safeDiv(revenue, purchases),
  };
}

function dailyTrend(rows: Row[]) {
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
    }));
}

function classify(y: any, l7: any, life: any): CreativeBucket {
  if (y.spend > 0 && life.purchases > 0 && life.cpa > CPA_CRITICAL) return "CRITICAL CPA";
  if (y.spend > 0 && life.spend >= MIN_ZERO_PURCHASE_SPEND && life.purchases === 0) return "ZERO PURCHASE";
  if (l7.spend >= MIN_ZERO_PURCHASE_SPEND && l7.purchases === 0) return "ZERO PURCHASE";
  if (l7.cpa > CPA_HIGH && l7.roas < 0.8 && l7.purchases > 0) return "REDUCE";
  if (l7.freq >= 2.5 && l7.ctr < 0.008 && l7.spend > 1000) return "REFRESH";
  if (y.roas >= 1.2 && y.purchases >= 2 && y.cpa <= 1200) return "SCALE";
  if (l7.roas >= 1 && l7.purchases >= 5 && l7.cpa <= 1400) return "PROTECT";
  return "WATCH";
}

function priority(bucket: CreativeBucket) {
  const order: Record<CreativeBucket, number> = {
    "CRITICAL CPA": 1,
    "ZERO PURCHASE": 2,
    REDUCE: 3,
    REFRESH: 4,
    SCALE: 5,
    PROTECT: 6,
    WATCH: 7,
  };
  return order[bucket];
}

function bucketTone(bucket: CreativeBucket) {
  if (bucket === "CRITICAL CPA" || bucket === "ZERO PURCHASE") return "red";
  if (bucket === "REDUCE" || bucket === "REFRESH") return "amber";
  if (bucket === "SCALE" || bucket === "PROTECT") return "green";
  return "neutral";
}

function statusText(item: any) {
  if (item.bucket === "CRITICAL CPA") return `Lifetime CPA ${money(item.life.cpa)}`;
  if (item.bucket === "ZERO PURCHASE") return "0 purchase spend";
  if (item.bucket === "REDUCE") return "CPA high";
  if (item.bucket === "REFRESH") return "creative fatigue";
  if (item.bucket === "SCALE") return "scale signal";
  if (item.bucket === "PROTECT") return "winner";
  return "watch";
}

function whyBullets(item: any) {
  if (item.bucket === "CRITICAL CPA") {
    return [
      `Creative spent yesterday and lifetime CPA is ${money(item.life.cpa)}.`,
      `Lifetime spend is ${money(item.life.spend)} with ${num(item.life.purchases, 0)} purchases.`,
      "Do not scale until CPA trend improves below threshold.",
    ];
  }

  if (item.bucket === "ZERO PURCHASE") {
    return [
      `Lifetime spend is ${money(item.life.spend)} with 0 purchases.`,
      `Last 7 day spend is ${money(item.l7.spend)} with ${num(item.l7.purchases, 0)} purchases.`,
      "Cut or rebuild this creative before adding more budget.",
    ];
  }

  if (item.bucket === "REDUCE") {
    return [
      `Last 7 day CPA is ${money(item.l7.cpa)} and ROAS is ${num(item.l7.roas)}x.`,
      "Efficiency is below acceptable range.",
      "Reduce budget until ROAS and CPA recover.",
    ];
  }

  if (item.bucket === "REFRESH") {
    return [
      `Frequency is ${num(item.l7.freq)}x with CTR at ${pct(item.l7.ctr)}.`,
      "Audience is seeing the creative repeatedly.",
      "Refresh hook, first frame or proof angle.",
    ];
  }

  if (item.bucket === "SCALE") {
    return [
      `Yesterday ROAS is ${num(item.y.roas)}x with CPA ${money(item.y.cpa)}.`,
      "Creative has current-day scale signal.",
      "Scale carefully without editing the existing ad.",
    ];
  }

  if (item.bucket === "PROTECT") {
    return [
      `Last 7 day ROAS is ${num(item.l7.roas)}x with ${num(item.l7.purchases, 0)} purchases.`,
      "Do not disturb the working creative.",
      "Create variants separately instead of editing this ad.",
    ];
  }

  return [
    "Current signal is not strong enough for hard action.",
    "Monitor spend, purchases, CPA and CTR tomorrow.",
    "Move only if direction confirms for 2–3 days.",
  ];
}

function creativeBrief(item: any) {
  if (item.bucket === "SCALE" || item.bucket === "PROTECT") {
    return [
      "Keep this creative live and untouched.",
      "Create close variants separately.",
      "Use same winning angle with new proof, first frame or testimonial.",
    ];
  }

  if (item.bucket === "REFRESH") {
    return [
      "Rewrite first 3 seconds / first visual frame.",
      "Change the hook, not only the design.",
      "Test one stronger problem-led and one proof-led variant.",
    ];
  }

  return [
    "Rebuild from a sharper pain-point hook.",
    "Add stronger product proof before relaunching.",
    "Avoid relaunching the same weak angle with only cosmetic changes.",
  ];
}

function buildItems(rows: Row[]) {
  const latest = latestDate(rows);
  const yRows = rows.filter((row) => dateKey(getDate(row)) === latest);
  const activeAdIds = new Set(
    yRows
      .filter((row) => getSpend(row) > 0 || getImpressions(row) > 0)
      .map(getAdId)
  );

  const map = new Map<string, Row[]>();

  rows.forEach((row) => {
    const key = getAdId(row);
    if (!activeAdIds.has(key)) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  return Array.from(map.entries())
    .map(([key, allRows]) => {
      const y = summarize(allRows.filter((row) => dateKey(getDate(row)) === latest));
      const l7 = summarize(windowRows(allRows, latest, 7));
      const life = summarize(allRows);
      const sample = allRows[0];
      const trend = dailyTrend(allRows);
      const bucket = classify(y, l7, life);

      return {
        key,
        bucket,
        ad: getAd(sample),
        campaign: getCampaign(sample),
        adSet: getAdSet(sample),
        y,
        l7,
        life,
        trend,
      };
    })
    .filter((item) => item.y.spend > 0 || item.y.impressions > 0)
    .sort((a, b) => priority(a.bucket) - priority(b.bucket) || b.l7.spend - a.l7.spend);
}

function groupByBucket(items: any[]) {
  const groups: Record<CreativeBucket, any[]> = {
    "CRITICAL CPA": [],
    "ZERO PURCHASE": [],
    REDUCE: [],
    REFRESH: [],
    SCALE: [],
    PROTECT: [],
    WATCH: [],
  };

  items.forEach((item) => groups[item.bucket as CreativeBucket].push(item));
  return groups;
}

export function CompactCreativeAudit() {
  const rows = useMetaStore((state) => state.performanceRows);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "CRITICAL CPA": true,
    "ZERO PURCHASE": true,
    REDUCE: true,
    REFRESH: true,
    SCALE: false,
    PROTECT: false,
    WATCH: false,
  });

  const data = useMemo(() => {
    const latest = latestDate(rows || []);
    const items = buildItems(rows || []);
    const groups = groupByBucket(items);
    const activeSummary = summarize(windowRows(rows || [], latest, 7));

    return {
      latest,
      items,
      groups,
      activeSummary,
    };
  }, [rows]);

  const order: CreativeBucket[] = [
    "CRITICAL CPA",
    "ZERO PURCHASE",
    "REDUCE",
    "REFRESH",
    "SCALE",
    "PROTECT",
    "WATCH",
  ];

  return (
    <div className="grid gap-3">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0A84FF]">
              Creative Audit
            </p>
            <h1 className="mt-1 text-2xl font-black">Creative Action Queue</h1>
            <p className="mt-1 text-sm opacity-60">
              Only creatives that had spend or impressions yesterday are shown. Open any row for why, creative brief and 30-day CPA/ROAS trend.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs">
            <Kpi label="Active Creatives" value={String(data.items.length)} />
            <Kpi label="L7 Spend" value={money(data.activeSummary.spend)} />
            <Kpi label="L7 ROAS" value={num(data.activeSummary.roas)} />
            <Kpi label="Latest" value={data.latest || "NA"} />
          </div>
        </div>
      </section>

      {order.map((bucket) => {
        const items = data.groups[bucket];
        if (!items.length) return null;

        const isOpen = openGroups[bucket];
        const tone = bucketTone(bucket);

        return (
          <section key={bucket} className="rounded-xl border border-current/10 bg-current/[0.025]">
            <button
              onClick={() =>
                setOpenGroups((prev) => ({
                  ...prev,
                  [bucket]: !prev[bucket],
                }))
              }
              className="flex w-full items-center justify-between gap-3 border-b border-current/10 px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3">
                <BucketPill bucket={bucket} />
                <span className="text-sm font-black">{items.length} creatives</span>
              </div>

              <ChevronDown className={isOpen ? "h-4 w-4 rotate-180 transition" : "h-4 w-4 transition"} />
            </button>

            {isOpen && (
              <div className="divide-y divide-current/10">
                {items.map((item) => (
                  <details key={item.key} className="group">
                    <summary className="grid cursor-pointer list-none grid-cols-[1fr_92px_80px_90px_85px_70px_70px_24px] items-center gap-3 px-4 py-3 text-xs hover:bg-current/[0.035]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <BucketPill bucket={item.bucket} small />
                          <StatusPill tone={tone}>{statusText(item)}</StatusPill>
                        </div>

                        <p className="mt-1 truncate text-sm font-black">{item.ad}</p>
                        <p className="mt-0.5 truncate opacity-60">
                          {item.campaign} · {item.adSet}
                        </p>
                      </div>

                      <Metric label="Spend" value={money(item.l7.spend)} />
                      <Metric label="ROAS" value={num(item.l7.roas)} tone={item.l7.roas >= 1 ? "green" : "red"} />
                      <Metric label="CPA" value={item.l7.purchases > 0 ? money(item.l7.cpa) : "No sale"} tone={item.l7.purchases > 0 && item.l7.cpa <= 1200 ? "green" : "red"} />
                      <Metric label="Purch." value={num(item.l7.purchases, 0)} />
                      <Metric label="CTR" value={pct(item.l7.ctr)} />
                      <Metric label="Freq" value={num(item.l7.freq)} />
                      <ChevronDown className="h-4 w-4 opacity-45 transition group-open:rotate-180" />
                    </summary>

                    <div className="grid gap-3 px-4 pb-4 lg:grid-cols-[1fr_1fr_420px]">
                      <InfoBox title="Why" items={whyBullets(item)} icon={<AlertTriangle className="h-4 w-4" />} />
                      <InfoBox title="Creative Brief" items={creativeBrief(item)} icon={<Sparkles className="h-4 w-4" />} />
                      <TrendBox data={item.trend} />
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-current/10 bg-current/[0.035] px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-45">{label}</p>
      <p className="mt-0.5 font-black">{value}</p>
    </div>
  );
}

function BucketPill({ bucket, small = false }: { bucket: CreativeBucket; small?: boolean }) {
  const tone = bucketTone(bucket);

  const cls =
    tone === "red"
      ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
      : tone === "amber"
      ? "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300"
      : tone === "green"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
      : "border-slate-300 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70";

  return (
    <span
      className={`${small ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"} inline-flex rounded-full border font-black uppercase tracking-[0.12em] ${cls}`}
    >
      {bucket}
    </span>
  );
}

function StatusPill({ tone, children }: { tone: string; children: React.ReactNode }) {
  const cls =
    tone === "red"
      ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
      : tone === "amber"
      ? "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300"
      : tone === "green"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
      : "border-slate-300 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70";

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${cls}`}>
      {children}
    </span>
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
      <p className={tone === "red" ? "mt-0.5 font-black text-red-600 dark:text-red-300" : tone === "green" ? "mt-0.5 font-black text-emerald-600 dark:text-emerald-300" : "mt-0.5 font-black"}>
        {value}
      </p>
    </div>
  );
}

function InfoBox({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-current/10 bg-current/[0.025] p-3">
      <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] opacity-55">
        {icon}
        {title}
      </p>
      <ul className="mt-2 grid gap-1.5 text-xs leading-5 opacity-75">
        {items.map((item) => (
          <li key={item}>• {item}</li>
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
          CPA / ROAS Trend
        </p>
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
      </div>

      <div className="h-[150px] w-full">
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.16)" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "currentColor" }} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "currentColor" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `₹${Math.round(Number(v || 0) / 1000)}K`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "currentColor" }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              contentStyle={{
                background: "#111318",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                color: "white",
                fontSize: 11,
              }}
              formatter={(value: any, name: any) => {
                if (name === "CPA") return [money(Number(value || 0)), "CPA"];
                return [`${num(Number(value || 0))}x`, "ROAS"];
              }}
            />
            <Line yAxisId="left" type="monotone" dataKey="cpa" name="CPA" stroke="#b42318" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="#087f5b" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
