"use client";

import { useMemo } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Sparkles,
  Table2,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMetaStore } from "@/store/metaStore";
import type { MetaPerformanceRow } from "@/types/meta";

type Row = Record<string, any>;

type Metrics = {
  spend: number;
  revenue: number;
  purchases: number;
  impressions: number;
  clicks: number;
  lpv: number;
  cpa: number;
  roas: number;
  ctr: number;
  cvr: number;
  aov: number;
  gpt: number;
};

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
const moneyCr = (n: number) => `₹${(Number(n || 0) / 10000000).toFixed(1)}Cr`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number, d = 2) => `${Number(n || 0).toFixed(d)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

const AGE_BUCKETS = [
  { key: "≤7D", label: "≤7D", min: 0, max: 7 },
  { key: "8–14D", label: "8–14D", min: 8, max: 14 },
  { key: "15–30D", label: "15–30D", min: 15, max: 30 },
  { key: "31–45D", label: "31–45D", min: 31, max: 45 },
  { key: "46–60D", label: "46–60D", min: 46, max: 60 },
  { key: "61–90D", label: "61–90D", min: 61, max: 90 },
  { key: "91–120D", label: "91–120D", min: 91, max: 120 },
  { key: "121–180D", label: "121–180D", min: 121, max: 180 },
  { key: "181–240D", label: "181–240D", min: 181, max: 240 },
  { key: "241–360D", label: "241–360D", min: 241, max: 360 },
  { key: "360D+", label: "360D+", min: 361, max: Infinity },
];

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
 * Do not replace with local-time date math.
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

    // Meta India exports are usually DD/MM/YYYY.
    const day = first > 12 ? first : second > 12 ? second : first;
    const month = first > 12 ? second : second > 12 ? first : second;

    return toUtcDateKeyFromParts(year, month, day);
  }

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

function diffDaysUtc(startKey: string, endKey: string) {
  const start = normalizeDateKey(startKey);
  const end = normalizeDateKey(endKey);

  if (!start || !end) return 0;

  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);

  const startMs = Date.UTC(sy, sm - 1, sd);
  const endMs = Date.UTC(ey, em - 1, ed);

  return Math.max(0, Math.floor((endMs - startMs) / 86400000));
}

function isDateInWindow(dateKey: string, startKey: string, endKey: string) {
  const key = normalizeDateKey(dateKey);
  return Boolean(key && startKey && endKey && key >= startKey && key <= endKey);
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

function getMonthKey(dateKey: string) {
  const key = normalizeDateKey(dateKey);
  return key ? key.slice(0, 7) : "";
}

function monthLabel(monthKey: string) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return "Unknown";

  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, 1));

  return d.toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function getAdId(row: Row) {
  return String(
    row.adId ??
      row.ad_id ??
      row["Ad ID"] ??
      row["ad id"] ??
      row.adName ??
      row.ad_name ??
      row["Ad name"] ??
      "unknown"
  );
}

function getAdName(row: Row) {
  return String(row.adName ?? row.ad_name ?? row["Ad name"] ?? row["Ad Name"] ?? row["ad name"] ?? "Unknown Ad");
}

function getSpend(row: Row) {
  return toNumber(row.spend ?? row.amountSpent ?? row.amount_spent ?? row["Amount spent (INR)"] ?? row["Amount spent"] ?? row["amount spent inr"]);
}

function getRevenue(row: Row) {
  return toNumber(
    row.revenue ??
      row.purchaseValue ??
      row.purchase_value ??
      row.conversionValue ??
      row.conversion_value ??
      row["Purchases conversion value"] ??
      row["Purchase conversion value"] ??
      row["Purchase Conversion Value"] ??
      row["purchases conversion value"]
  );
}

function getPurchases(row: Row) {
  return toNumber(row.purchases ?? row.Purchases ?? row.results ?? row.Results);
}

function getImpressions(row: Row) {
  return toNumber(row.impressions ?? row.Impressions);
}

function getClicks(row: Row) {
  return toNumber(
    row.linkClicks ??
      row.link_clicks ??
      row.clicks ??
      row["Link clicks"] ??
      row["Clicks (all)"] ??
      row["Outbound clicks"]
  );
}

function getLandingPageViews(row: Row) {
  return toNumber(
    row.landingPageViews ??
      row.landing_page_views ??
      row.lpv ??
      row["Landing page views"] ??
      row["Landing Page Views"]
  );
}

function summarize(rows: Row[]): Metrics {
  const spend = rows.reduce((s, row) => s + getSpend(row), 0);
  const revenue = rows.reduce((s, row) => s + getRevenue(row), 0);
  const purchases = rows.reduce((s, row) => s + getPurchases(row), 0);
  const impressions = rows.reduce((s, row) => s + getImpressions(row), 0);
  const clicks = rows.reduce((s, row) => s + getClicks(row), 0);
  const lpv = rows.reduce((s, row) => s + getLandingPageViews(row), 0);

  const aov = safeDiv(revenue, purchases);
  const cpa = safeDiv(spend, purchases);
  const gpt = purchases > 0 ? aov - cpa : 0;

  return {
    spend,
    revenue,
    purchases,
    impressions,
    clicks,
    lpv,
    cpa,
    roas: safeDiv(revenue, spend),
    ctr: safeDiv(clicks, impressions) * 100,
    cvr: safeDiv(purchases, clicks) * 100,
    aov,
    gpt,
  };
}

function getAgeBucket(ageDays: number) {
  return AGE_BUCKETS.find((bucket) => ageDays >= bucket.min && ageDays <= bucket.max) || AGE_BUCKETS[AGE_BUCKETS.length - 1];
}

function MetricCell({ metric, toneBy = "neutral" }: { metric: Metrics; toneBy?: "roas" | "gpt" | "neutral" }) {
  const gptTone =
    metric.gpt > 0
      ? "text-emerald-600 dark:text-emerald-300"
      : metric.gpt < 0
        ? "text-red-600 dark:text-red-300"
        : "";

  const roasTone =
    metric.roas >= 1
      ? "text-emerald-600 dark:text-emerald-300"
      : metric.roas > 0
        ? "text-red-600 dark:text-red-300"
        : "";

  return (
    <div className="grid min-w-[620px] grid-cols-7 gap-2">
      <span className="font-black">{money(metric.spend)}</span>
      <span>{metric.purchases > 0 ? money(metric.cpa) : "No sale"}</span>
      <span className={toneBy === "roas" ? roasTone : ""}>{num(metric.roas)}x</span>
      <span>{pct(metric.ctr)}</span>
      <span>{pct(metric.cvr)}</span>
      <span>{metric.purchases > 0 ? money(metric.aov) : "—"}</span>
      <span className={toneBy === "gpt" ? gptTone : gptTone}>{metric.purchases > 0 ? money(metric.gpt) : "—"}</span>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
      <div className="mb-3">
        <h2 className="text-sm font-black">{title}</h2>
        <p className="mt-1 text-xs opacity-65">{description}</p>
      </div>
      <div className="h-[280px]">{children}</div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "red" | "green" | "blue" | "neutral";
}) {
  const toneClass =
    tone === "red"
      ? "text-red-600 dark:text-red-300"
      : tone === "green"
        ? "text-emerald-600 dark:text-emerald-300"
        : tone === "blue"
          ? "text-[#0A84FF]"
          : "";

  return (
    <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">{label}</p>
      <p className={`mt-2 text-2xl font-black tracking-[-0.04em] ${toneClass}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs opacity-60">{sub}</p> : null}
    </div>
  );
}

export function CreativeAgeingTab() {
  const rows = useMetaStore((state) => state.performanceRows as MetaPerformanceRow[]);

  const data = useMemo(() => {
    const validRows = ((rows || []) as unknown as Row[]).filter((row) => getDate(row));
    const dates = Array.from(new Set(validRows.map(getDate).filter(Boolean))).sort();
    const latest = dates[dates.length - 1] || "";
    const latest30Start = addDaysToDateKeyUtc(latest, -29);

    const adFirstDate = new Map<string, string>();
    const adFirstName = new Map<string, string>();

    for (const row of validRows) {
      const adId = getAdId(row);
      const date = getDate(row);

      if (!adFirstDate.has(adId) || date < (adFirstDate.get(adId) || "")) {
        adFirstDate.set(adId, date);
        adFirstName.set(adId, getAdName(row));
      }
    }

    const allMonths = Array.from(new Set(validRows.map((row) => getMonthKey(getDate(row))).filter(Boolean))).sort();
    const last12Months = allMonths.slice(-12);

    const monthlyRows = last12Months
      .map((month) => {
        const monthRows = validRows.filter((row) => getMonthKey(getDate(row)) === month);

        const newRows = monthRows.filter((row) => getMonthKey(adFirstDate.get(getAdId(row)) || "") === month);
        const oldRows = monthRows.filter((row) => {
          const firstMonth = getMonthKey(adFirstDate.get(getAdId(row)) || "");
          return firstMonth && firstMonth < month;
        });

        const newCreativeIds = new Set(
          Array.from(adFirstDate.entries())
            .filter(([, firstDate]) => getMonthKey(firstDate) === month)
            .map(([adId]) => adId)
        );

        const oldCreativeIds = new Set(oldRows.map(getAdId));

        const newMetrics = summarize(newRows);
        const oldMetrics = summarize(oldRows);

        return {
          month,
          label: monthLabel(month),
          newCreatives: newCreativeIds.size,
          oldCreatives: oldCreativeIds.size,
          newMetrics,
          oldMetrics,
          totalSpend: newMetrics.spend + oldMetrics.spend,
          newSpendShare: safeDiv(newMetrics.spend, newMetrics.spend + oldMetrics.spend) * 100,
        };
      })
      .sort((a, b) => b.month.localeCompare(a.month));

    const chartMonths = monthlyRows.slice().reverse();

    const latestWindowRows = validRows.filter((row) => isDateInWindow(getDate(row), latest30Start, latest));

    const ageMap = new Map<string, Row[]>();

    for (const row of latestWindowRows) {
      const adId = getAdId(row);
      const firstDate = adFirstDate.get(adId) || getDate(row);
      const ageDays = diffDaysUtc(firstDate, getDate(row)) + 1;
      const bucket = getAgeBucket(ageDays);

      if (!ageMap.has(bucket.key)) ageMap.set(bucket.key, []);
      ageMap.get(bucket.key)!.push(row);
    }

    const ageRows = AGE_BUCKETS.map((bucket) => {
      const bucketRows = ageMap.get(bucket.key) || [];
      const creativeIds = new Set(bucketRows.map(getAdId));
      const metrics = summarize(bucketRows);

      return {
        bucket: bucket.label,
        creatives: creativeIds.size,
        spend: metrics.spend,
        cpa: metrics.cpa,
        roas: metrics.roas,
        ctr: metrics.ctr,
        cvr: metrics.cvr,
        aov: metrics.aov,
        gpt: metrics.gpt,
      };
    });

    const totals = summarize(validRows);
    const latestMonth = monthlyRows[0];

    return {
      latest,
      latest30Start,
      monthlyRows,
      chartMonths,
      ageRows,
      totals,
      latestMonth,
      totalCreatives: adFirstDate.size,
      totalFirstSeenMonths: last12Months.length,
    };
  }, [rows]);

  return (
    <div className="creative-ageing-tab-root grid gap-4">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0A84FF]/30 bg-[#0A84FF]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A84FF]">
                <Sparkles className="h-3.5 w-3.5" />
                Ageing
              </span>
              <span className="rounded-full border border-current/10 bg-current/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-60">
                Latest: {data.latest || "—"}
              </span>
              <span className="rounded-full border border-current/10 bg-current/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-60">
                L30D Age Window: {data.latest30Start || "—"} → {data.latest || "—"}
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-black">Creative Ageing Control</h1>
            <p className="mt-1 max-w-4xl text-sm opacity-60">
              Compares new creative cohorts against old creatives by month, with GPT added to understand whether new uploads are improving economics or only adding spend.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Kpi label="Total Creatives" value={String(data.totalCreatives)} tone="blue" />
        <Kpi label="Latest Month New" value={String(data.latestMonth?.newCreatives || 0)} sub={data.latestMonth?.label || ""} />
        <Kpi label="Latest New Spend" value={money(data.latestMonth?.newMetrics.spend || 0)} sub={`New cohort spend in ${data.latestMonth?.label || "latest month"}`} />
        <Kpi
          label="Latest New GPT"
          value={(data.latestMonth?.newMetrics.purchases || 0) > 0 ? money(data.latestMonth?.newMetrics.gpt || 0) : "—"}
          tone={(data.latestMonth?.newMetrics.gpt || 0) >= 0 ? "green" : "red"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="New Creative Upload Trend"
          description="Month-on-month count of newly uploaded creatives with new cohort spend."
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.chartMonths}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.16} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => moneyCr(Number(v))} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value: any, name: any) => {
                  if (name === "New Spend") return [money(Number(value)), name];
                  return [value, name];
                }}
                contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12 }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="newCreatives" name="New Creatives" fill="#0A84FF" radius={[8, 8, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="newMetrics.spend" name="New Spend" stroke="#34D399" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="New vs Old Spend Mix"
          description="Shows whether spend is being absorbed by newly uploaded creatives or older running creatives."
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.chartMonths}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.16} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => moneyCr(Number(v))} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value: any, name: any) => [money(Number(value)), name]}
                contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12 }}
              />
              <Legend />
              <Bar dataKey="newMetrics.spend" name="New Spend" stackId="spend" fill="#0A84FF" radius={[6, 6, 0, 0]} />
              <Bar dataKey="oldMetrics.spend" name="Old Spend" stackId="spend" fill="#64748B" radius={[6, 6, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Efficiency by Creative Age"
          description="L30D CPA and ROAS by age cohort. Use this to identify fatigue or fresh creative quality."
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.ageRows}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.16} />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tickFormatter={(v) => money(Number(v))} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value: any, name: any) => {
                  if (name === "CPA") return [money(Number(value)), name];
                  if (name === "ROAS") return [`${num(Number(value))}x`, name];
                  return [value, name];
                }}
                contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12 }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="cpa" name="CPA" fill="#64748B" radius={[8, 8, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="#34D399" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="overflow-hidden rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <Table2 className="mt-1 h-4 w-4 text-[#0A84FF]" />
            <div>
              <h2 className="text-lg font-black">Monthly New vs Old Creative Cohort Metrics</h2>
              <p className="mt-1 text-sm opacity-60">
                New = creatives first seen in that month. Old = creatives first seen before that month but still spending in that month. GPT = AOV − CPA.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1640px] border-collapse text-left text-xs">
            <thead>
              <tr className="monthly-table-head">
                <th className="monthly-table-th" rowSpan={2}>Month</th>
                <th className="monthly-table-th" colSpan={2}>Creative Count</th>
                <th className="monthly-table-th bg-[#0A84FF]/15" colSpan={7}>New Creative Cohort</th>
                <th className="monthly-table-th bg-slate-500/15" colSpan={7}>Old Creative Cohort</th>
                <th className="monthly-table-th" rowSpan={2}>New Spend Share</th>
              </tr>
              <tr className="monthly-table-head">
                <th className="monthly-table-th">New</th>
                <th className="monthly-table-th">Old Active</th>

                <th className="monthly-table-th">Spend</th>
                <th className="monthly-table-th">CPA</th>
                <th className="monthly-table-th">ROAS</th>
                <th className="monthly-table-th">CTR</th>
                <th className="monthly-table-th">CVR</th>
                <th className="monthly-table-th">AOV</th>
                <th className="monthly-table-th">GPT</th>

                <th className="monthly-table-th">Spend</th>
                <th className="monthly-table-th">CPA</th>
                <th className="monthly-table-th">ROAS</th>
                <th className="monthly-table-th">CTR</th>
                <th className="monthly-table-th">CVR</th>
                <th className="monthly-table-th">AOV</th>
                <th className="monthly-table-th">GPT</th>
              </tr>
            </thead>

            <tbody>
              {data.monthlyRows.map((row) => (
                <tr key={row.month} className="border-b border-current/10 hover:bg-current/[0.035]">
                  <td className="px-3 py-3 font-black">{row.label}</td>
                  <td className="px-3 py-3 font-black">{row.newCreatives}</td>
                  <td className="px-3 py-3">{row.oldCreatives}</td>

                  <td className="px-3 py-3 font-black">{money(row.newMetrics.spend)}</td>
                  <td className="px-3 py-3">{row.newMetrics.purchases > 0 ? money(row.newMetrics.cpa) : "No sale"}</td>
                  <td className={row.newMetrics.roas >= 1 ? "px-3 py-3 font-black text-emerald-600 dark:text-emerald-300" : "px-3 py-3 font-black text-red-600 dark:text-red-300"}>
                    {num(row.newMetrics.roas)}x
                  </td>
                  <td className="px-3 py-3">{pct(row.newMetrics.ctr)}</td>
                  <td className="px-3 py-3">{pct(row.newMetrics.cvr)}</td>
                  <td className="px-3 py-3">{row.newMetrics.purchases > 0 ? money(row.newMetrics.aov) : "—"}</td>
                  <td className={row.newMetrics.gpt >= 0 ? "px-3 py-3 font-black text-emerald-600 dark:text-emerald-300" : "px-3 py-3 font-black text-red-600 dark:text-red-300"}>
                    {row.newMetrics.purchases > 0 ? money(row.newMetrics.gpt) : "—"}
                  </td>

                  <td className="px-3 py-3 font-black">{money(row.oldMetrics.spend)}</td>
                  <td className="px-3 py-3">{row.oldMetrics.purchases > 0 ? money(row.oldMetrics.cpa) : "No sale"}</td>
                  <td className={row.oldMetrics.roas >= 1 ? "px-3 py-3 font-black text-emerald-600 dark:text-emerald-300" : "px-3 py-3 font-black text-red-600 dark:text-red-300"}>
                    {num(row.oldMetrics.roas)}x
                  </td>
                  <td className="px-3 py-3">{pct(row.oldMetrics.ctr)}</td>
                  <td className="px-3 py-3">{pct(row.oldMetrics.cvr)}</td>
                  <td className="px-3 py-3">{row.oldMetrics.purchases > 0 ? money(row.oldMetrics.aov) : "—"}</td>
                  <td className={row.oldMetrics.gpt >= 0 ? "px-3 py-3 font-black text-emerald-600 dark:text-emerald-300" : "px-3 py-3 font-black text-red-600 dark:text-red-300"}>
                    {row.oldMetrics.purchases > 0 ? money(row.oldMetrics.gpt) : "—"}
                  </td>

                  <td className="px-3 py-3 font-black">{pct(row.newSpendShare, 1)}</td>
                </tr>
              ))}

              {!data.monthlyRows.length ? (
                <tr>
                  <td colSpan={18} className="p-5">No creative ageing data available.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="flex items-start gap-3">
          <Activity className="mt-1 h-4 w-4 text-[#0A84FF]" />
          <div>
            <h2 className="text-lg font-black">Operator Read</h2>
            <p className="mt-1 text-sm opacity-65">
              Use the top charts to see upload volume, new-vs-old spend mix, and creative-age efficiency. Use the table below to decide whether newly uploaded creatives are actually improving CPA, ROAS, AOV, and GPT versus older creatives still carrying spend.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
