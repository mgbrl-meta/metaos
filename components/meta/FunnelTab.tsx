"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Filter, Table2 } from "lucide-react";
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

/**
 * UTC-safe date logic.
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
  { key: "clicks", label: "Clicks" },
  { key: "lpv", label: "LPV" },
  { key: "atc", label: "ATC" },
  { key: "checkout", label: "Checkout" },
  { key: "payment", label: "Payment" },
  { key: "purchases", label: "Purchases" },
  { key: "cpa", label: "CPA" },
  { key: "roas", label: "ROAS" },
  { key: "gpt", label: "GPT" },
] as const;

const RATE_COLUMNS = [
  { key: "clickToLpv", label: "LPV / Clicks" },
  { key: "lpvToAtc", label: "ATC / LPV" },
  { key: "atcToCheckout", label: "Checkout / ATC" },
  { key: "checkoutToPayment", label: "Payment / Checkout" },
  { key: "paymentToPurchase", label: "Purchase / Payment" },
  { key: "clickToPurchase", label: "Purchase / Clicks" },
];

function CompactMetricCell({
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
    <td className="px-2 py-3 align-middle">
      <div className="min-w-0 rounded-xl border border-current/10 bg-current/[0.018] px-2.5 py-2">
        <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] opacity-50" title={label}>
          {label}
        </p>

        <p className="mt-1 truncate text-[13px] font-black leading-4" title={formatMetric(label, current)}>
          {formatMetric(label, current)}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-black leading-4">
          <span className={`rounded-full px-1.5 py-0.5 ${toneClass(tone)} bg-current/[0.06]`}>
            {formatMultiple(mult)}
          </span>
          <span className="opacity-45">vs prev</span>
          <span className={`rounded-full px-1.5 py-0.5 ${toneClass(tone)} bg-current/[0.06]`}>
            {formatChange(chg)}
          </span>
        </div>

        {previous > 0 ? (
          <p className="mt-1 truncate text-[10px] leading-4 opacity-45" title={`Previous ${formatMetric(label, previous)}`}>
            Prev {formatMetric(label, previous)}
          </p>
        ) : (
          <p className="mt-1 truncate text-[10px] leading-4 opacity-35">
            Prev NA
          </p>
        )}
      </div>
    </td>
  );
}

function MetricSplitCells({
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
    <>
      <td className="px-3 py-3 align-top">
        <p className="font-black">{formatMetric(label, current)}</p>
      </td>
      <td className={`px-3 py-3 align-top font-black ${toneClass(tone)}`}>
        {formatMultiple(mult)}
      </td>
      <td className={`px-3 py-3 align-top font-black ${toneClass(tone)}`}>
        {formatChange(chg)}
      </td>
    </>
  );
}

function WeeklyGroupedTable({
  weeks,
  monthLabel,
}: {
  weeks: any[];
  monthLabel: string;
}) {
  const weeklyColumns = SUMMARY_COLUMNS;

  return (
    <div className="border-t border-current/10 bg-black/10 px-5 py-4">
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="text-base font-black">Weekly Funnel Breakdown · {monthLabel}</h3>
        <p className="text-sm opacity-60">
          Each metric card shows current value, multiple vs previous 7-day period, and percentage change.
        </p>
      </div>

      <div className="grid gap-3">
        {weeks.map((week) => (
          <div
            key={week.key || week.label || week.periodLabel}
            className="rounded-2xl border border-current/10 bg-current/[0.025] p-3"
          >
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black">{week.label || week.week || "Week"}</p>
                <p className="text-xs opacity-55">
                  {week.periodLabel || week.currentPeriod || week.period || "Current period"}
                </p>
              </div>

              <p className="rounded-full border border-current/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] opacity-60">
                vs previous 7D
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
              {weeklyColumns.map((column) => (
                <WeeklyMetricCard
                  key={column.key}
                  label={column.label}
                  current={Number(week.current?.[column.key] ?? week[column.key] ?? 0)}
                  previous={Number(
                    week.previous?.[column.key] ??
                      week[`previous${String(column.key).charAt(0).toUpperCase()}${String(column.key).slice(1)}`] ??
                      0
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyMetricCard({
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
  const isGood = tone === "green";
  const isBad = tone === "red";
  const cardToneClass = isGood
    ? "border-emerald-500/20 bg-emerald-500/[0.045]"
    : isBad
      ? "border-red-500/20 bg-red-500/[0.045]"
      : "border-current/10 bg-black/10";

  return (
    <div className={`min-w-0 rounded-xl border px-2.5 py-2 ${cardToneClass}`}>
      <p className="truncate text-[9px] font-black uppercase tracking-[0.12em] opacity-50" title={label}>
        {label}
      </p>

      <p className="mt-1 truncate text-[13px] font-black leading-4" title={formatMetric(label, current)}>
        {formatMetric(label, current)}
      </p>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-black leading-4">
        <span className={`rounded-full border px-1.5 py-0.5 ${toneClass(tone)} ${isGood ? "border-emerald-500/20 bg-emerald-500/10" : isBad ? "border-red-500/20 bg-red-500/10" : "border-current/10 bg-current/[0.06]"}`}>
          {formatMultiple(mult)}
        </span>
        <span className="opacity-45">|</span>
        <span className={`rounded-full border px-1.5 py-0.5 ${toneClass(tone)} ${isGood ? "border-emerald-500/20 bg-emerald-500/10" : isBad ? "border-red-500/20 bg-red-500/10" : "border-current/10 bg-current/[0.06]"}`}>
          {formatChange(chg)}
        </span>
      </div>
    </div>
  );
}

export function FunnelTab() {
  const rows = useMetaStore((state) => state.performanceRows as MetaPerformanceRow[]);
  const [openMonth, setOpenMonth] = useState<string | null>(null);

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
    };
  }, [rows]);

  function toggleMonth(month: string) {
    setOpenMonth((current) => (current === month ? null : month));
  }

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
              Month-on-month funnel table with clear headers. Click a month row to open grouped weekly data below it.
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <Table2 className="mt-1 h-4 w-4 text-[#0A84FF]" />
            <div>
              <h2 className="text-lg font-black">Month on Month Funnel Table</h2>
              <p className="mt-1 text-sm opacity-60">
                Each cell shows current value on top, then multiple vs previous month and percentage change below.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-separate border-spacing-y-1 text-left text-[11px]">
            <thead className="monthly-table-head sticky top-0 z-10">
              <tr>
                <th className="monthly-table-th w-[105px] px-2 py-2 text-[10px]">Month</th>
                {SUMMARY_COLUMNS.map((column) => (
                  <th key={column.key} className="monthly-table-th px-2 py-2 text-[10px]">{column.label}</th>
                ))}
                <th className="monthly-table-th w-[42px] px-1 py-2 text-center"> </th>
              </tr>
            </thead>

            <tbody>
              {data.monthlyRows.map((row) => {
                const isOpen = openMonth === row.month;

                return (
                  <>
                    <tr
                      key={row.month}
                      onClick={() => toggleMonth(row.month)}
                      className={
                        isOpen
                          ? "cursor-pointer border-b border-[#0A84FF]/30 bg-[#0A84FF]/5"
                          : "cursor-pointer border-b border-current/10 hover:bg-current/[0.035]"
                      }
                    >
                      <td className="px-2 py-3 align-middle">
                        <div className="rounded-xl border border-current/10 bg-current/[0.025] px-2.5 py-2">
                          <p className="text-[13px] font-black leading-4">{row.label}</p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] opacity-40">
                            MoM
                          </p>
                        </div>
                      </td>

                      {SUMMARY_COLUMNS.map((column) => (
                        <CompactMetricCell
                          key={column.key}
                          label={column.label}
                          current={getMetricValue(row.current, column.key)}
                          previous={getMetricValue(row.previous, column.key)}
                        />
                      ))}

                      <td className="px-3 py-3 text-center align-middle">
                        <button
                          type="button"
                          aria-label={isOpen ? `Close ${row.label} weekly breakdown` : `Open ${row.label} weekly breakdown`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMonth(row.month);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-current/10 bg-current/[0.025] hover:bg-current/10"
                        >
                          <ChevronDown className={isOpen ? "h-4 w-4 rotate-180 transition" : "h-4 w-4 transition"} />
                        </button>
                      </td>
                    </tr>

                    {isOpen ? (
                      <tr key={`${row.month}-weekly`} className="border-b border-current/10">
                        <td colSpan={29} className="p-0">
                          <WeeklyGroupedTable weeks={row.weekRows} monthLabel={row.label} />
                        </td>
                      </tr>
                    ) : null}
                  </>
                );
              })}

              {!data.monthlyRows.length ? (
                <tr>
                  <td colSpan={29} className="p-5">
                    <p className="font-black">No funnel data available.</p>
                    <p className="mt-1 text-sm opacity-60">Check if the Meta sheet rows include date and funnel columns.</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
