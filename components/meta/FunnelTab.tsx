"use client";

import { useMemo } from "react";
import { ChevronDown, Filter, Layers3, Table2 } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";
import type { MetaPerformanceRow } from "@/types/meta";

type Row = Record<string, any>;

type Metrics = {
  spend: number;
  revenue: number;
  clicks: number;
  lpv: number;
  atc: number;
  checkout: number;
  payment: number;
  purchases: number;
  aov: number;
  cpa: number;
  roas: number;
  gpt: number;
  clickToLpv: number;
  lpvToAtc: number;
  atcToCheckout: number;
  checkoutToPayment: number;
  paymentToPurchase: number;
  clickToPurchase: number;
};

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number, d = 1) => `${Number(n || 0).toFixed(d)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

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

function getPreviousMonthKey(monthKey: string) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return "";

  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);

  return d.toISOString().slice(0, 7);
}

function monthLabel(monthKey: string) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return "Unknown";

  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, 1));

  return d.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getSpend(row: Row) {
  return toNumber(
    row.spend ??
      row.amountSpent ??
      row.amount_spent ??
      row["Amount spent (INR)"] ??
      row["Amount spent"] ??
      row["amount spent inr"]
  );
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

function getAddToCart(row: Row) {
  return toNumber(
    row.addToCart ??
      row.add_to_cart ??
      row.addsToCart ??
      row.adds_to_cart ??
      row["Adds to cart"] ??
      row["Add to cart"] ??
      row["Website adds to cart"]
  );
}

function getCheckoutInitiate(row: Row) {
  return toNumber(
    row.initiateCheckout ??
      row.initiate_checkout ??
      row.checkoutsInitiated ??
      row.checkouts_initiated ??
      row["Checkouts initiated"] ??
      row["Initiate checkout"] ??
      row["Website checkouts initiated"]
  );
}

function getAddPaymentInfo(row: Row) {
  return toNumber(
    row.addPaymentInfo ??
      row.add_payment_info ??
      row.paymentInfo ??
      row.payment_info ??
      row["Adds of payment info"] ??
      row["Add payment info"] ??
      row["Website adds of payment info"]
  );
}

function summarize(rows: Row[]): Metrics {
  const spend = rows.reduce((s, row) => s + getSpend(row), 0);
  const revenue = rows.reduce((s, row) => s + getRevenue(row), 0);
  const purchases = rows.reduce((s, row) => s + getPurchases(row), 0);
  const clicks = rows.reduce((s, row) => s + getClicks(row), 0);
  const lpv = rows.reduce((s, row) => s + getLandingPageViews(row), 0);
  const atc = rows.reduce((s, row) => s + getAddToCart(row), 0);
  const checkout = rows.reduce((s, row) => s + getCheckoutInitiate(row), 0);
  const payment = rows.reduce((s, row) => s + getAddPaymentInfo(row), 0);

  const aov = safeDiv(revenue, purchases);
  const cpa = safeDiv(spend, purchases);
  const gpt = purchases > 0 ? aov - cpa : 0;

  return {
    spend,
    revenue,
    clicks,
    lpv,
    atc,
    checkout,
    payment,
    purchases,
    aov,
    cpa,
    roas: safeDiv(revenue, spend),
    gpt,
    clickToLpv: safeDiv(lpv, clicks) * 100,
    lpvToAtc: safeDiv(atc, lpv) * 100,
    atcToCheckout: safeDiv(checkout, atc) * 100,
    checkoutToPayment: safeDiv(payment, checkout) * 100,
    paymentToPurchase: safeDiv(purchases, payment) * 100,
    clickToPurchase: safeDiv(purchases, clicks) * 100,
  };
}

function multiple(current: number, previous: number) {
  if (!previous || previous <= 0) return current > 0 ? Infinity : 0;
  return current / previous;
}

function changePct(current: number, previous: number) {
  if (!previous || previous <= 0) return current > 0 ? Infinity : 0;
  return ((current - previous) / previous) * 100;
}

function formatMultiple(value: number) {
  if (!Number.isFinite(value)) return "New";
  return `${num(value, 2)}x`;
}

function formatChange(value: number) {
  if (!Number.isFinite(value)) return "New";
  return `${value >= 0 ? "+" : ""}${pct(value)}`;
}

function toneClass(tone: "red" | "green" | "blue" | "neutral") {
  if (tone === "red") return "text-red-600 dark:text-red-300";
  if (tone === "green") return "text-emerald-600 dark:text-emerald-300";
  if (tone === "blue") return "text-[#0A84FF]";
  return "";
}

function changeTone(label: string, change: number) {
  if (!Number.isFinite(change)) return "blue";

  const key = label.toLowerCase();

  if (key.includes("cpa")) return change <= 0 ? "green" : "red";
  if (key.includes("roas")) return change >= 0 ? "green" : "red";
  if (key.includes("gpt")) return change >= 0 ? "green" : "red";

  return change >= 0 ? "green" : "red";
}

function formatMetric(label: string, value: number) {
  const key = label.toLowerCase();

  if (key.includes("cpa")) return money(value);
  if (key.includes("gpt")) return money(value);
  if (key.includes("roas")) return `${num(value)}x`;
  if (key.includes("rate") || key.includes("/") || key.includes("cvr")) return pct(value, 2);

  return num(value, 0);
}

function getMetricValue(metrics: Metrics, key: string) {
  if (key === "clicks") return metrics.clicks;
  if (key === "lpv") return metrics.lpv;
  if (key === "atc") return metrics.atc;
  if (key === "checkout") return metrics.checkout;
  if (key === "payment") return metrics.payment;
  if (key === "purchases") return metrics.purchases;
  if (key === "cpa") return metrics.cpa;
  if (key === "roas") return metrics.roas;
  if (key === "gpt") return metrics.gpt;
  if (key === "clickToLpv") return metrics.clickToLpv;
  if (key === "lpvToAtc") return metrics.lpvToAtc;
  if (key === "atcToCheckout") return metrics.atcToCheckout;
  if (key === "checkoutToPayment") return metrics.checkoutToPayment;
  if (key === "paymentToPurchase") return metrics.paymentToPurchase;
  if (key === "clickToPurchase") return metrics.clickToPurchase;
  return 0;
}

function getWeekBucketsForMonth(monthKey: string) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return [];

  const [year, month] = monthKey.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(nextMonth);
  monthEnd.setUTCDate(monthEnd.getUTCDate() - 1);

  const buckets: Array<{ label: string; start: string; end: string; prevStart: string; prevEnd: string }> = [];
  let cursor = new Date(monthStart);
  let week = 1;

  while (cursor <= monthEnd) {
    const start = cursor.toISOString().slice(0, 10);

    const endDate = new Date(cursor);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    if (endDate > monthEnd) endDate.setTime(monthEnd.getTime());

    const end = endDate.toISOString().slice(0, 10);
    const prevStart = addDaysToDateKeyUtc(start, -7);
    const prevEnd = addDaysToDateKeyUtc(end, -7);

    buckets.push({
      label: `W${week}`,
      start,
      end,
      prevStart,
      prevEnd,
    });

    cursor = new Date(endDate);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    week += 1;
  }

  return buckets;
}

const SUMMARY_COLUMNS = [
  { key: "purchases", label: "Purchases" },
  { key: "cpa", label: "CPA" },
  { key: "roas", label: "ROAS" },
  { key: "gpt", label: "GPT" },
  { key: "clicks", label: "Clicks" },
  { key: "lpv", label: "LPV" },
  { key: "atc", label: "ATC" },
  { key: "checkout", label: "Checkout" },
  { key: "payment", label: "Payment" },
];

const RATE_COLUMNS = [
  { key: "clickToLpv", label: "LPV / Clicks" },
  { key: "lpvToAtc", label: "ATC / LPV" },
  { key: "atcToCheckout", label: "Checkout / ATC" },
  { key: "checkoutToPayment", label: "Payment / Checkout" },
  { key: "paymentToPurchase", label: "Purchase / Payment" },
  { key: "clickToPurchase", label: "Purchase / Clicks" },
];

function MetricCard({
  label,
  current,
  previous,
}: {
  label: string;
  current: number;
  previous: number;
}) {
  const mult = multiple(current, previous);
  const chg = changePct(current, previous);
  const tone = changeTone(label, chg);

  return (
    <div className="rounded-xl border border-current/10 bg-current/[0.025] px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.13em] opacity-50">{label}</p>
      <p className="mt-1 text-sm font-black">{formatMetric(label, current)}</p>
      <p className="mt-0.5 text-[10px] opacity-55">Prev {formatMetric(label, previous)}</p>
      <p className={`mt-1 text-[10px] font-black ${toneClass(tone)}`}>
        {formatMultiple(mult)} · {formatChange(chg)}
      </p>
    </div>
  );
}

function WeeklyTable({
  weekRows,
}: {
  weekRows: Array<{
    label: string;
    start: string;
    end: string;
    current: Metrics;
    previous: Metrics;
  }>;
}) {
  return (
    <div className="grid gap-4 p-4">
      <div className="overflow-x-auto rounded-2xl border border-current/10">
        <table className="w-full min-w-[1300px] border-collapse text-left text-xs">
          <thead className="monthly-table-head">
            <tr>
              {[
                "Week",
                "Date Range",
                "Purchases",
                "Purch. Multiple",
                "Purch. % Change",
                "CPA",
                "CPA % Change",
                "ROAS",
                "ROAS % Change",
                "GPT",
                "GPT % Change",
                "Clicks",
                "LPV",
                "ATC",
                "Checkout",
                "Payment",
              ].map((heading) => (
                <th key={heading} className="monthly-table-th">{heading}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {weekRows.map((row) => {
              const purchaseChange = changePct(row.current.purchases, row.previous.purchases);
              const purchaseMultiple = multiple(row.current.purchases, row.previous.purchases);
              const cpaChange = changePct(row.current.cpa, row.previous.cpa);
              const roasChange = changePct(row.current.roas, row.previous.roas);
              const gptChange = changePct(row.current.gpt, row.previous.gpt);

              return (
                <tr key={`${row.start}-${row.end}`} className="border-b border-current/10 hover:bg-current/[0.035]">
                  <td className="px-3 py-3 font-black">{row.label}</td>
                  <td className="px-3 py-3 opacity-70">{row.start} → {row.end}</td>
                  <td className="px-3 py-3 font-black">{num(row.current.purchases, 0)}</td>
                  <td className={`px-3 py-3 font-black ${toneClass(changeTone("Purchases", purchaseChange))}`}>{formatMultiple(purchaseMultiple)}</td>
                  <td className={`px-3 py-3 font-black ${toneClass(changeTone("Purchases", purchaseChange))}`}>{formatChange(purchaseChange)}</td>
                  <td className="px-3 py-3">{money(row.current.cpa)}</td>
                  <td className={`px-3 py-3 font-black ${toneClass(changeTone("CPA", cpaChange))}`}>{formatChange(cpaChange)}</td>
                  <td className="px-3 py-3">{num(row.current.roas)}x</td>
                  <td className={`px-3 py-3 font-black ${toneClass(changeTone("ROAS", roasChange))}`}>{formatChange(roasChange)}</td>
                  <td className="px-3 py-3">{money(row.current.gpt)}</td>
                  <td className={`px-3 py-3 font-black ${toneClass(changeTone("GPT", gptChange))}`}>{formatChange(gptChange)}</td>
                  <td className="px-3 py-3">{num(row.current.clicks, 0)}</td>
                  <td className="px-3 py-3">{num(row.current.lpv, 0)}</td>
                  <td className="px-3 py-3">{num(row.current.atc, 0)}</td>
                  <td className="px-3 py-3">{num(row.current.checkout, 0)}</td>
                  <td className="px-3 py-3">{num(row.current.payment, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-current/10">
        <table className="w-full min-w-[980px] border-collapse text-left text-xs">
          <thead className="monthly-table-head">
            <tr>
              {["Week", ...RATE_COLUMNS.map((column) => column.label)].map((heading) => (
                <th key={heading} className="monthly-table-th">{heading}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {weekRows.map((row) => (
              <tr key={`rate-${row.start}-${row.end}`} className="border-b border-current/10 hover:bg-current/[0.035]">
                <td className="px-3 py-3 font-black">{row.label}</td>
                {RATE_COLUMNS.map((column) => {
                  const current = getMetricValue(row.current, column.key);
                  const previous = getMetricValue(row.previous, column.key);
                  const chg = changePct(current, previous);

                  return (
                    <td key={column.key} className="px-3 py-3">
                      <p className="font-black">{pct(current, 2)}</p>
                      <p className="mt-0.5 text-[10px] opacity-55">Prev {pct(previous, 2)}</p>
                      <p className={`mt-0.5 text-[10px] font-black ${toneClass(changeTone(column.label, chg))}`}>
                        {formatChange(chg)}
                      </p>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FunnelTab() {
  const rows = useMetaStore((state) => state.performanceRows as MetaPerformanceRow[]);

  const data = useMemo(() => {
    const validRows = ((rows || []) as unknown as Row[]).filter((row) => getDate(row));
    const months = Array.from(new Set(validRows.map((row) => getMonthKey(getDate(row))).filter(Boolean))).sort();

    const monthlyRows = months
      .map((month) => {
        const previousMonth = getPreviousMonthKey(month);

        const currentRows = validRows.filter((row) => getMonthKey(getDate(row)) === month);
        const previousRows = validRows.filter((row) => getMonthKey(getDate(row)) === previousMonth);

        const currentDates = Array.from(new Set(currentRows.map(getDate).filter(Boolean))).sort();
        const previousDates = Array.from(new Set(previousRows.map(getDate).filter(Boolean))).sort();

        const current = summarize(currentRows);
        const previous = summarize(previousRows);

        const weekRows = getWeekBucketsForMonth(month).map((bucket) => {
          const weekCurrentRows = validRows.filter((row) => isDateInWindow(getDate(row), bucket.start, bucket.end));
          const weekPreviousRows = validRows.filter((row) => isDateInWindow(getDate(row), bucket.prevStart, bucket.prevEnd));

          return {
            ...bucket,
            current: summarize(weekCurrentRows),
            previous: summarize(weekPreviousRows),
          };
        });

        return {
          month,
          label: monthLabel(month),
          previousMonth,
          currentStart: currentDates[0] || `${month}-01`,
          currentEnd: currentDates[currentDates.length - 1] || "",
          previousStart: previousDates[0] || "",
          previousEnd: previousDates[previousDates.length - 1] || "",
          current,
          previous,
          weekRows,
        };
      })
      .sort((a, b) => b.month.localeCompare(a.month));

    return {
      monthlyRows,
      totalMonths: monthlyRows.length,
      latestMonth: monthlyRows[0],
    };
  }, [rows]);

  return (
    <div className="funnel-tab-root grid gap-4">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0A84FF]/30 bg-[#0A84FF]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A84FF]">
                <Filter className="h-3.5 w-3.5" />
                Funnel
              </span>
              <span className="rounded-full border border-current/10 bg-current/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-60">
                {data.totalMonths} months available
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-black">Funnel Movement Master Table</h1>
            <p className="mt-1 max-w-5xl text-sm opacity-60">
              One-view month-on-month funnel summary. Each card shows current value, previous month value, multiple and percentage change. Open a month to see week-wise breakdown.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="flex items-start gap-3">
          <Table2 className="mt-1 h-4 w-4 text-[#0A84FF]" />
          <div>
            <h2 className="text-lg font-black">Monthly Summary Cards</h2>
            <p className="mt-1 text-sm opacity-60">
              Headings are fixed inside every card: Period, Purchases, CPA, ROAS, GPT, Clicks, LPV, ATC, Checkout and Payment.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        {data.monthlyRows.map((row) => (
          <details key={row.month} className="group overflow-hidden rounded-2xl border border-current/10 bg-current/[0.025]">
            <summary className="cursor-pointer list-none p-4 hover:bg-current/[0.035]">
              <div className="grid gap-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-[220px]">
                    <p className="text-lg font-black">{row.label}</p>
                    <p className="mt-1 text-xs opacity-65">Current: {row.currentStart} → {row.currentEnd || "—"}</p>
                    <p className="mt-0.5 text-xs opacity-45">Previous: {row.previousStart || "—"} → {row.previousEnd || "—"}</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs opacity-60">
                    <span>Click to open weekly breakdown</span>
                    <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                  {SUMMARY_COLUMNS.map((column) => (
                    <MetricCard
                      key={column.key}
                      label={column.label}
                      current={getMetricValue(row.current, column.key)}
                      previous={getMetricValue(row.previous, column.key)}
                    />
                  ))}
                </div>
              </div>
            </summary>

            <div className="border-t border-current/10 bg-current/[0.018]">
              <div className="px-4 pt-4">
                <div className="flex items-start gap-3">
                  <Layers3 className="mt-1 h-4 w-4 text-[#0A84FF]" />
                  <div>
                    <h3 className="text-sm font-black">Weekly Breakdown inside {row.label}</h3>
                    <p className="mt-1 text-xs opacity-60">
                      Each week compares against the immediately previous 7-day period. The first table is volume/economics; the second table is funnel conversion rate.
                    </p>
                  </div>
                </div>
              </div>

              <WeeklyTable weekRows={row.weekRows} />
            </div>
          </details>
        ))}

        {!data.monthlyRows.length ? (
          <div className="rounded-xl border border-current/10 bg-current/[0.025] p-5">
            <p className="font-black">No funnel data available.</p>
            <p className="mt-1 text-sm opacity-60">Check if the Meta sheet rows include date and funnel columns.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
