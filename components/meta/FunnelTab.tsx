"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Filter,
  Layers3,
} from "lucide-react";
import { useMetaStore } from "@/store/metaStore";
import { onlyLiveRows } from "@/lib/liveFilter";
import type { MetaPerformanceRow } from "@/types/meta";

type Row = Record<string, any>;

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
  return toNumber(row.spend ?? row.amountSpent ?? row.amount_spent ?? row["Amount spent (INR)"] ?? row["Amount spent"]);
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
      row["Purchase Conversion Value"]
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

function summarize(rows: Row[]) {
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

function metricTone(metric: string, change: number) {
  if (!Number.isFinite(change)) return "blue";

  const lower = metric.toLowerCase();

  if (lower === "cpa") return change <= 0 ? "green" : "red";
  if (lower === "gpt") return change >= 0 ? "green" : "red";
  if (lower === "roas") return change >= 0 ? "green" : "red";

  return change >= 0 ? "green" : "red";
}

function toneClass(tone: "red" | "green" | "blue" | "orange" | "neutral") {
  if (tone === "red") return "text-red-600 dark:text-red-300";
  if (tone === "green") return "text-emerald-600 dark:text-emerald-300";
  if (tone === "blue") return "text-[#0A84FF]";
  if (tone === "orange") return "text-orange-600 dark:text-orange-300";
  return "";
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
  tone?: "red" | "green" | "blue" | "orange" | "neutral";
}) {
  return (
    <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">{label}</p>
      <p className={`mt-2 text-2xl font-black tracking-[-0.04em] ${toneClass(tone)}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs opacity-60">{sub}</p> : null}
    </div>
  );
}

function MetricRow({
  label,
  current,
  previous,
  format,
}: {
  label: string;
  current: number;
  previous: number;
  format: (value: number) => string;
}) {
  const mult = multiple(current, previous);
  const chg = changePct(current, previous);
  const tone = metricTone(label, chg);

  return (
    <tr className="border-b border-current/10 hover:bg-current/[0.035]">
      <td className="px-3 py-3 font-black">{label}</td>
      <td className="px-3 py-3">{format(current)}</td>
      <td className="px-3 py-3 opacity-70">{format(previous)}</td>
      <td className={`px-3 py-3 font-black ${toneClass(tone)}`}>{formatMultiple(mult)}</td>
      <td className={`px-3 py-3 font-black ${toneClass(tone)}`}>{formatChange(chg)}</td>
    </tr>
  );
}

function FunnelStepRow({
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
  const tone = !Number.isFinite(chg) || chg >= 0 ? "green" : "red";

  return (
    <tr className="border-b border-current/10 hover:bg-current/[0.035]">
      <td className="px-3 py-3 font-black">{label}</td>
      <td className="px-3 py-3">{pct(current, 2)}</td>
      <td className="px-3 py-3 opacity-70">{pct(previous, 2)}</td>
      <td className={`px-3 py-3 font-black ${toneClass(tone)}`}>{formatMultiple(mult)}</td>
      <td className={`px-3 py-3 font-black ${toneClass(tone)}`}>{formatChange(chg)}</td>
    </tr>
  );
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

export function FunnelTab() {
  const rows = useMetaStore((state) => state.performanceRows as MetaPerformanceRow[]);
  const [selectedMonth, setSelectedMonth] = useState("");

  const base = useMemo(() => {
    const liveRows = onlyLiveRows(rows || []) as unknown as Row[];
    const validRows = liveRows.filter((row) => getDate(row));
    const dates = Array.from(new Set(validRows.map(getDate).filter(Boolean))).sort();
    const months = Array.from(new Set(validRows.map((row) => getMonthKey(getDate(row))).filter(Boolean))).sort();

    return {
      rows: validRows,
      dates,
      months,
      latestDate: dates[dates.length - 1] || "",
      latestMonth: months[months.length - 1] || "",
    };
  }, [rows]);

  useEffect(() => {
    if (!selectedMonth && base.latestMonth) setSelectedMonth(base.latestMonth);
  }, [base.latestMonth, selectedMonth]);

  const activeMonth = selectedMonth || base.latestMonth;

  const data = useMemo(() => {
    const previousMonth = getPreviousMonthKey(activeMonth);

    const currentRows = base.rows.filter((row) => getMonthKey(getDate(row)) === activeMonth);
    const previousRows = base.rows.filter((row) => getMonthKey(getDate(row)) === previousMonth);

    const currentDates = Array.from(new Set(currentRows.map(getDate).filter(Boolean))).sort();
    const previousDates = Array.from(new Set(previousRows.map(getDate).filter(Boolean))).sort();

    const current = summarize(currentRows);
    const previous = summarize(previousRows);

    const weeklyRows = getWeekBucketsForMonth(activeMonth).map((bucket) => {
      const weekRows = base.rows.filter((row) => isDateInWindow(getDate(row), bucket.start, bucket.end));
      const prevWeekRows = base.rows.filter((row) => isDateInWindow(getDate(row), bucket.prevStart, bucket.prevEnd));

      const week = summarize(weekRows);
      const prevWeek = summarize(prevWeekRows);

      return {
        ...bucket,
        week,
        prevWeek,
        purchaseChange: changePct(week.purchases, prevWeek.purchases),
        cpaChange: changePct(week.cpa, prevWeek.cpa),
        roasChange: changePct(week.roas, prevWeek.roas),
        gptChange: changePct(week.gpt, prevWeek.gpt),
      };
    });

    return {
      activeMonth,
      previousMonth,
      currentStart: currentDates[0] || `${activeMonth}-01`,
      currentEnd: currentDates[currentDates.length - 1] || "",
      previousStart: previousDates[0] || "",
      previousEnd: previousDates[previousDates.length - 1] || "",
      current,
      previous,
      weeklyRows,
    };
  }, [base.rows, activeMonth]);

  const purchaseChange = changePct(data.current.purchases, data.previous.purchases);
  const cpaChange = changePct(data.current.cpa, data.previous.cpa);
  const roasChange = changePct(data.current.roas, data.previous.roas);
  const gptChange = changePct(data.current.gpt, data.previous.gpt);

  return (
    <div className="funnel-tab-root grid gap-4">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0A84FF]/30 bg-[#0A84FF]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A84FF]">
                <Filter className="h-3.5 w-3.5" />
                Funnel
              </span>
              <span className="rounded-full border border-current/10 bg-current/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-60">
                Current: {data.currentStart || "—"} → {data.currentEnd || "—"}
              </span>
              <span className="rounded-full border border-current/10 bg-current/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-60">
                Previous: {data.previousStart || "—"} → {data.previousEnd || "—"}
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-black">Funnel Movement Control</h1>
            <p className="mt-1 max-w-4xl text-sm opacity-60">
              Select a month to compare it against the previous month. The selected month is also distributed week-by-week below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-current/10 bg-current/[0.035] px-3 py-1.5">
              <CalendarDays className="h-4 w-4 text-[#0A84FF]" />
              <select
                value={activeMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-black outline-none"
              >
                {base.months.slice().reverse().map((month) => (
                  <option key={month} value={month} className="bg-[#111827] text-white">
                    {monthLabel(month)}
                  </option>
                ))}
              </select>
            </div>

            <span className="rounded-full bg-[#0A84FF] px-4 py-2 text-xs font-black text-white">
              MoM View
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Kpi
          label="MoM Purchases"
          value={formatChange(purchaseChange)}
          sub={`${num(data.current.purchases, 0)} vs ${num(data.previous.purchases, 0)}`}
          tone={!Number.isFinite(purchaseChange) || purchaseChange >= 0 ? "green" : "red"}
        />
        <Kpi
          label="MoM CPA"
          value={formatChange(cpaChange)}
          sub={`${money(data.current.cpa)} vs ${money(data.previous.cpa)}`}
          tone={cpaChange <= 0 ? "green" : "red"}
        />
        <Kpi
          label="MoM ROAS"
          value={formatChange(roasChange)}
          sub={`${num(data.current.roas)}x vs ${num(data.previous.roas)}x`}
          tone={!Number.isFinite(roasChange) || roasChange >= 0 ? "green" : "red"}
        />
        <Kpi
          label="MoM GPT"
          value={formatChange(gptChange)}
          sub={`${money(data.current.gpt)} vs ${money(data.previous.gpt)}`}
          tone={!Number.isFinite(gptChange) || gptChange >= 0 ? "green" : "red"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-current/10 bg-current/[0.025]">
          <div className="border-b border-current/10 px-4 py-3">
            <div className="flex items-start gap-3">
              <BarChart3 className="mt-1 h-4 w-4 text-[#0A84FF]" />
              <div>
                <h2 className="text-lg font-black">Monthly Funnel Volume Movement</h2>
                <p className="mt-1 text-sm opacity-60">Selected month vs previous month.</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead className="monthly-table-head">
                <tr>
                  {["Metric", "Current Month", "Previous Month", "Multiple", "% Change"].map((h) => (
                    <th key={h} className="monthly-table-th">{h}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                <MetricRow label="Link Clicks" current={data.current.clicks} previous={data.previous.clicks} format={(v) => num(v, 0)} />
                <MetricRow label="Landing Page Views" current={data.current.lpv} previous={data.previous.lpv} format={(v) => num(v, 0)} />
                <MetricRow label="Add to Cart" current={data.current.atc} previous={data.previous.atc} format={(v) => num(v, 0)} />
                <MetricRow label="Checkout Initiate" current={data.current.checkout} previous={data.previous.checkout} format={(v) => num(v, 0)} />
                <MetricRow label="Add Payment Info" current={data.current.payment} previous={data.previous.payment} format={(v) => num(v, 0)} />
                <MetricRow label="Purchase" current={data.current.purchases} previous={data.previous.purchases} format={(v) => num(v, 0)} />
                <MetricRow label="CPA" current={data.current.cpa} previous={data.previous.cpa} format={(v) => money(v)} />
                <MetricRow label="ROAS" current={data.current.roas} previous={data.previous.roas} format={(v) => `${num(v)}x`} />
                <MetricRow label="GPT" current={data.current.gpt} previous={data.previous.gpt} format={(v) => money(v)} />
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-current/10 bg-current/[0.025]">
          <div className="border-b border-current/10 px-4 py-3">
            <div className="flex items-start gap-3">
              <Layers3 className="mt-1 h-4 w-4 text-[#0A84FF]" />
              <div>
                <h2 className="text-lg font-black">Monthly Funnel Conversion Movement</h2>
                <p className="mt-1 text-sm opacity-60">Stage-wise conversion movement vs previous month.</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead className="monthly-table-head">
                <tr>
                  {["Step", "Current Month", "Previous Month", "Multiple", "% Change"].map((h) => (
                    <th key={h} className="monthly-table-th">{h}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                <FunnelStepRow label="LPV / Clicks" current={data.current.clickToLpv} previous={data.previous.clickToLpv} />
                <FunnelStepRow label="ATC / LPV" current={data.current.lpvToAtc} previous={data.previous.lpvToAtc} />
                <FunnelStepRow label="Checkout / ATC" current={data.current.atcToCheckout} previous={data.previous.atcToCheckout} />
                <FunnelStepRow label="Payment / Checkout" current={data.current.checkoutToPayment} previous={data.previous.checkoutToPayment} />
                <FunnelStepRow label="Purchase / Payment" current={data.current.paymentToPurchase} previous={data.previous.paymentToPurchase} />
                <FunnelStepRow label="Purchase / Clicks" current={data.current.clickToPurchase} previous={data.previous.clickToPurchase} />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <h2 className="text-lg font-black">Weekly Breakdown inside {monthLabel(activeMonth)}</h2>
          <p className="mt-1 text-sm opacity-60">
            Each week in the selected month is compared against the immediately previous 7-day period.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1160px] border-collapse text-left text-xs">
            <thead className="monthly-table-head">
              <tr>
                {[
                  "Week",
                  "Date Range",
                  "Purch.",
                  "Purch. % Chg",
                  "CPA",
                  "CPA % Chg",
                  "ROAS",
                  "ROAS % Chg",
                  "GPT",
                  "GPT % Chg",
                  "Clicks",
                  "LPV",
                  "ATC",
                  "Checkout",
                  "Payment",
                ].map((h) => (
                  <th key={h} className="monthly-table-th">{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.weeklyRows.map((row) => (
                <tr key={`${row.start}-${row.end}`} className="border-b border-current/10 hover:bg-current/[0.035]">
                  <td className="px-3 py-3 font-black">{row.label}</td>
                  <td className="px-3 py-3 opacity-70">{row.start} → {row.end}</td>
                  <td className="px-3 py-3 font-black">{num(row.week.purchases, 0)}</td>
                  <td className={`px-3 py-3 font-black ${toneClass(!Number.isFinite(row.purchaseChange) || row.purchaseChange >= 0 ? "green" : "red")}`}>
                    {formatChange(row.purchaseChange)}
                  </td>
                  <td className="px-3 py-3">{money(row.week.cpa)}</td>
                  <td className={`px-3 py-3 font-black ${toneClass(row.cpaChange <= 0 ? "green" : "red")}`}>
                    {formatChange(row.cpaChange)}
                  </td>
                  <td className="px-3 py-3">{num(row.week.roas)}x</td>
                  <td className={`px-3 py-3 font-black ${toneClass(!Number.isFinite(row.roasChange) || row.roasChange >= 0 ? "green" : "red")}`}>
                    {formatChange(row.roasChange)}
                  </td>
                  <td className="px-3 py-3">{money(row.week.gpt)}</td>
                  <td className={`px-3 py-3 font-black ${toneClass(!Number.isFinite(row.gptChange) || row.gptChange >= 0 ? "green" : "red")}`}>
                    {formatChange(row.gptChange)}
                  </td>
                  <td className="px-3 py-3">{num(row.week.clicks, 0)}</td>
                  <td className="px-3 py-3">{num(row.week.lpv, 0)}</td>
                  <td className="px-3 py-3">{num(row.week.atc, 0)}</td>
                  <td className="px-3 py-3">{num(row.week.checkout, 0)}</td>
                  <td className="px-3 py-3">{num(row.week.payment, 0)}</td>
                </tr>
              ))}

              {!data.weeklyRows.length ? (
                <tr>
                  <td colSpan={15} className="p-5">No weekly data available for selected month.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-black">Operator Read</h2>
            <p className="mt-1 text-sm opacity-60">
              Use the month dropdown to compare every available month against the previous month. Then use the weekly breakdown to identify which week created the movement.
            </p>
          </div>

          <div className="grid gap-2 text-xs lg:min-w-[360px]">
            <div className="flex items-center gap-2 rounded-2xl border border-current/10 bg-current/[0.025] px-3 py-2">
              {purchaseChange >= 0 || !Number.isFinite(purchaseChange) ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              <span>
                Purchases moved from <b>{num(data.previous.purchases, 0)}</b> to <b>{num(data.current.purchases, 0)}</b>.
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-current/10 bg-current/[0.025] px-3 py-2">
              {cpaChange <= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              <span>
                CPA moved from <b>{money(data.previous.cpa)}</b> to <b>{money(data.current.cpa)}</b>.
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-current/10 bg-current/[0.025] px-3 py-2">
              {gptChange >= 0 || !Number.isFinite(gptChange) ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              <span>
                GPT moved from <b>{money(data.previous.gpt)}</b> to <b>{money(data.current.gpt)}</b>.
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
