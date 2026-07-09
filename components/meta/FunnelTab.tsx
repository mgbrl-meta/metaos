"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Filter, Table2 } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";

type Row = Record<string, any>;

type Metrics = {
  clicks: number;
  lpv: number;
  atc: number;
  checkout: number;
  payment: number;
  purchases: number;
  spend: number;
  revenue: number;
  cpa: number;
  roas: number;
  gpt: number;
};

type MonthRow = {
  key: string;
  label: string;
  current: Metrics;
  previous: Metrics;
  weeks: WeekRow[];
};

type WeekRow = {
  key: string;
  label: string;
  current: Metrics;
  previous: Metrics;
};

const FUNNEL_METRICS = [
  { key: "clicks", label: "Clicks", type: "volume" },
  { key: "lpv", label: "LPV", type: "volume" },
  { key: "atc", label: "ATC", type: "volume" },
  { key: "checkout", label: "Checkout", type: "volume" },
  { key: "payment", label: "Payment", type: "volume" },
  { key: "purchases", label: "Purchases", type: "volume" },
  { key: "cpa", label: "CPA", type: "cost" },
  { key: "roas", label: "ROAS", type: "efficiency" },
  { key: "gpt", label: "GPT", type: "efficiency" },
] as const;

function n(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .replace(/%/g, "")
    .trim();

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeDiv(a: number, b: number) {
  return b > 0 ? a / b : 0;
}

function dateKey(value: unknown) {
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

    const day = first > 12 ? first : second > 12 ? second : first;
    const month = first > 12 ? second : second > 12 ? first : second;

    return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()))
      .toISOString()
      .slice(0, 10);
  }

  return "";
}

function getDate(row: Row) {
  return dateKey(row.date ?? row.day ?? row.Date ?? row.Day ?? row["Date"] ?? row["Day"]);
}

function getMonthKeyFromDate(key: string) {
  return key.slice(0, 7);
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function addDays(key: string, days: number) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfMonth(monthKey: string) {
  return `${monthKey}-01`;
}

function endOfMonth(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

function previousMonthKey(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 2, 1));
  return date.toISOString().slice(0, 7);
}

function inRange(row: Row, start: string, end: string) {
  const d = getDate(row);
  return Boolean(d && d >= start && d <= end);
}

function getClicks(row: Row) {
  return n(row.linkClicks ?? row.link_clicks ?? row.clicks ?? row["Link clicks"] ?? row["Clicks"]);
}

function getLpv(row: Row) {
  return n(
    row.landingPageViews ??
      row.landing_page_views ??
      row.lpv ??
      row["Landing page views"] ??
      row["Landing Page Views"]
  );
}

function getAtc(row: Row) {
  return n(row.addToCart ?? row.add_to_cart ?? row.atc ?? row["Adds to cart"] ?? row["Add to cart"]);
}

function getCheckout(row: Row) {
  return n(
    row.checkoutInitiate ??
      row.initiateCheckout ??
      row.initiate_checkout ??
      row.checkout ??
      row["Checkouts initiated"] ??
      row["Initiate checkout"]
  );
}

function getPayment(row: Row) {
  return n(
    row.addPaymentInfo ??
      row.addsPaymentInfo ??
      row.add_payment_info ??
      row.paymentInfo ??
      row["Adds of payment info"] ??
      row["Add payment info"]
  );
}

function getPurchases(row: Row) {
  return n(row.purchases ?? row.Purchases ?? row.results ?? row.Results);
}

function getSpend(row: Row) {
  return n(row.spend ?? row.amountSpent ?? row.amount_spent ?? row["Amount spent"] ?? row["Amount spent (INR)"]);
}

function getRevenue(row: Row) {
  return n(
    row.revenue ??
      row.purchaseValue ??
      row.purchase_value ??
      row["Purchases conversion value"] ??
      row["Purchase conversion value"]
  );
}

function summarize(rows: Row[]): Metrics {
  const clicks = rows.reduce((s, row) => s + getClicks(row), 0);
  const lpv = rows.reduce((s, row) => s + getLpv(row), 0);
  const atc = rows.reduce((s, row) => s + getAtc(row), 0);
  const checkout = rows.reduce((s, row) => s + getCheckout(row), 0);
  const payment = rows.reduce((s, row) => s + getPayment(row), 0);
  const purchases = rows.reduce((s, row) => s + getPurchases(row), 0);
  const spend = rows.reduce((s, row) => s + getSpend(row), 0);
  const revenue = rows.reduce((s, row) => s + getRevenue(row), 0);

  const cpa = safeDiv(spend, purchases);
  const roas = safeDiv(revenue, spend);
  const aov = safeDiv(revenue, purchases);
  const gpt = purchases > 0 ? aov - cpa : 0;

  return {
    clicks,
    lpv,
    atc,
    checkout,
    payment,
    purchases,
    spend,
    revenue,
    cpa,
    roas,
    gpt,
  };
}

function multiple(current: number, previous: number) {
  if (previous === 0 && current > 0) return null;
  if (previous === 0) return 0;
  return current / previous;
}

function changePct(current: number, previous: number) {
  if (previous === 0 && current > 0) return null;
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function tone(metricType: string, current: number, previous: number) {
  const chg = changePct(current, previous);
  if (chg === null || chg === 0) return "neutral";

  if (metricType === "cost") {
    return chg < 0 ? "green" : "red";
  }

  return chg > 0 ? "green" : "red";
}

function toneClass(t: "green" | "red" | "neutral") {
  if (t === "green") return "text-emerald-500";
  if (t === "red") return "text-red-500";
  return "opacity-70";
}

function formatValue(key: string, value: number) {
  if (key === "cpa" || key === "gpt") return `₹${Math.round(value).toLocaleString("en-IN")}`;
  if (key === "roas") return `${value.toFixed(2)}x`;
  return Math.round(value).toLocaleString("en-IN");
}

function formatMultiple(value: number | null) {
  if (value === null) return "New";
  return `${value.toFixed(2)}x`;
}

function formatChange(value: number | null) {
  if (value === null) return "New";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function MetricCell({
  metricKey,
  metricType,
  current,
  previous,
}: {
  metricKey: keyof Metrics;
  metricType: string;
  current: number;
  previous: number;
}) {
  const m = multiple(current, previous);
  const c = changePct(current, previous);
  const t = tone(metricType, current, previous);

  return (
    <td className="px-2 py-2 align-middle">
      <div className="leading-4">
        <div className="text-[12px] font-black">{formatValue(metricKey, current)}</div>
        <div className={`mt-0.5 text-[10px] font-black ${toneClass(t)}`}>
          {formatMultiple(m)}
          <span className="mx-1 opacity-40">|</span>
          {formatChange(c)}
        </div>
        <div className="mt-0.5 truncate text-[10px] opacity-50">
          Prev {formatValue(metricKey, previous)}
        </div>
      </div>
    </td>
  );
}

function buildWeekRows(rows: Row[], monthKey: string): WeekRow[] {
  const start = startOfMonth(monthKey);
  const end = endOfMonth(monthKey);

  const weeks: WeekRow[] = [];
  let cursor = start;
  let index = 1;

  while (cursor <= end) {
    const weekStart = cursor;
    const weekEnd = addDays(weekStart, 6) > end ? end : addDays(weekStart, 6);

    const prevStart = addDays(weekStart, -7);
    const prevEnd = addDays(weekEnd, -7);

    weeks.push({
      key: `${monthKey}-w${index}`,
      label: `W${index}`,
      current: summarize(rows.filter((row) => inRange(row, weekStart, weekEnd))),
      previous: summarize(rows.filter((row) => inRange(row, prevStart, prevEnd))),
    });

    cursor = addDays(weekEnd, 1);
    index += 1;
  }

  return weeks;
}

function buildMonthRows(rows: Row[]): MonthRow[] {
  const validRows = rows.filter((row) => getDate(row));
  const months = Array.from(new Set(validRows.map((row) => getMonthKeyFromDate(getDate(row))))).sort().reverse();

  return months.map((monthKey) => {
    const prevMonth = previousMonthKey(monthKey);

    return {
      key: monthKey,
      label: monthLabel(monthKey),
      current: summarize(validRows.filter((row) => inRange(row, startOfMonth(monthKey), endOfMonth(monthKey)))),
      previous: summarize(validRows.filter((row) => inRange(row, startOfMonth(prevMonth), endOfMonth(prevMonth)))),
      weeks: buildWeekRows(validRows, monthKey),
    };
  });
}

function WeeklyTable({ weeks }: { weeks: WeekRow[] }) {
  return (
    <div className="border-t border-current/10 bg-current/[0.018] px-3 py-3">
      <table className="w-full table-fixed border-collapse text-left text-xs">
        <thead className="bg-current/[0.04]">
          <tr>
            <th className="w-[72px] px-2 py-2 text-[10px] font-black uppercase tracking-[0.12em] opacity-70">
              Week
            </th>
            {FUNNEL_METRICS.map((metric) => (
              <th key={metric.key} className="px-2 py-2 text-[10px] font-black uppercase tracking-[0.12em] opacity-70">
                {metric.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {weeks.map((week) => (
            <tr key={week.key} className="border-b border-current/10 last:border-b-0 hover:bg-current/[0.025]">
              <td className="px-2 py-2 text-xs font-black">{week.label}</td>
              {FUNNEL_METRICS.map((metric) => (
                <MetricCell
                  key={metric.key}
                  metricKey={metric.key}
                  metricType={metric.type}
                  current={week.current[metric.key]}
                  previous={week.previous[metric.key]}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FunnelTab() {
  const rows = useMetaStore((state) => state.performanceRows as Row[]);
  const [openMonth, setOpenMonth] = useState<string>("");

  const monthRows = useMemo(() => buildMonthRows(rows || []), [rows]);

  return (
    <div className="funnel-tab-root grid gap-3">
      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0A84FF]/30 bg-[#0A84FF]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A84FF]">
            <Filter className="h-3.5 w-3.5" />
            Funnel
          </span>
          <span className="rounded-full border border-current/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-60">
            {monthRows.length} months
          </span>
        </div>

        <h1 className="text-xl font-black">Funnel Movement Master Table</h1>
        <p className="mt-1 text-sm opacity-60">
          Simple month-on-month table. Click arrow to see week-on-week breakdown.
        </p>
      </section>

      <section className="overflow-hidden rounded-xl border border-current/10 bg-current/[0.02]">
        <div className="border-b border-current/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Table2 className="h-4 w-4 text-[#0A84FF]" />
            <div>
              <h2 className="text-lg font-black">Month on Month Funnel Table</h2>
              <p className="text-sm opacity-60">
                Each cell shows current value, multiple vs previous month, % change and previous value.
              </p>
            </div>
          </div>
        </div>

        <table className="w-full table-fixed border-collapse text-left text-xs">
          <thead className="bg-[#0A84FF]/15">
            <tr>
              <th className="w-[96px] px-2 py-2 text-[10px] font-black uppercase tracking-[0.12em]">Month</th>
              {FUNNEL_METRICS.map((metric) => (
                <th key={metric.key} className="px-2 py-2 text-[10px] font-black uppercase tracking-[0.12em]">
                  {metric.label}
                </th>
              ))}
              <th className="w-[52px] px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.12em]">
                Open
              </th>
            </tr>
          </thead>

          <tbody>
            {monthRows.map((row) => {
              const isOpen = openMonth === row.key;

              return (
                <>
                  <tr key={row.key} className="border-b border-current/10 hover:bg-current/[0.025]">
                    <td className="px-2 py-2 align-middle text-sm font-black">{row.label}</td>

                    {FUNNEL_METRICS.map((metric) => (
                      <MetricCell
                        key={metric.key}
                        metricKey={metric.key}
                        metricType={metric.type}
                        current={row.current[metric.key]}
                        previous={row.previous[metric.key]}
                      />
                    ))}

                    <td className="px-2 py-2 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => setOpenMonth(isOpen ? "" : row.key)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-current/15 bg-current/[0.03] hover:bg-current/[0.07]"
                        aria-label={`Open ${row.label} weekly breakdown`}
                      >
                        <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    </td>
                  </tr>

                  {isOpen ? (
                    <tr key={`${row.key}-weeks`}>
                      <td colSpan={FUNNEL_METRICS.length + 2} className="p-0">
                        <WeeklyTable weeks={row.weeks} />
                      </td>
                    </tr>
                  ) : null}
                </>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
