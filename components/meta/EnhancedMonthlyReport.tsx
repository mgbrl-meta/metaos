"use client";

import { useMemo } from "react";
import { TrendingUp, FileText } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";

type Row = Record<string, any>;

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number, d = 1) => `${num(Number(n || 0) * 100, d)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getDate(row: Row) {
  return String(row.date || row.day || row.Day || "");
}

function monthKey(value?: string) {
  const d = parseDate(value);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

function summarize(rows: Row[]) {
  const spend = rows.reduce((s, r) => s + getSpend(r), 0);
  const revenue = rows.reduce((s, r) => s + getRevenue(r), 0);
  const purchases = rows.reduce((s, r) => s + getPurchases(r), 0);
  const impressions = rows.reduce((s, r) => s + getImpressions(r), 0);
  const clicks = rows.reduce((s, r) => s + getClicks(r), 0);

  return {
    spend,
    revenue,
    purchases,
    impressions,
    clicks,
    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, purchases),
    ctr: safeDiv(clicks, impressions),
    purchaseCvr: safeDiv(purchases, clicks),
  };
}

function change(current: number, prior: number) {
  if (!prior) return 0;
  return (current - prior) / prior;
}

function buildMonthlyRows(rows: Row[]) {
  const map = new Map<string, Row[]>();

  rows.forEach((row) => {
    const key = monthKey(getDate(row));
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  const monthly = Array.from(map.entries())
    .map(([month, monthRows]) => ({
      month,
      ...summarize(monthRows),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return monthly.map((row, index) => {
    const prior = index > 0 ? monthly[index - 1] : null;

    const incrementalSpendAmount = prior ? row.spend - prior.spend : 0;
    const incrementalSpendPct = prior ? change(row.spend, prior.spend) : 0;

    const incrementalCpaAmount = prior ? row.cpa - prior.cpa : 0;
    const incrementalCpaPct = prior ? change(row.cpa, prior.cpa) : 0;

    const roasChange = prior ? change(row.roas, prior.roas) : 0;
    const purchaseChange = prior ? change(row.purchases, prior.purchases) : 0;

    return {
      ...row,
      prior,
      incrementalSpendAmount,
      incrementalSpendPct,
      incrementalCpaAmount,
      incrementalCpaPct,
      roasChange,
      purchaseChange,
    };
  });
}

function toneClass(tone: "green" | "red" | "amber" | "neutral") {
  if (tone === "green") return "text-emerald-600 dark:text-emerald-300";
  if (tone === "red") return "text-red-600 dark:text-red-300";
  if (tone === "amber") return "text-orange-600 dark:text-orange-300";
  return "";
}

function spendTone(row: any) {
  if (!row.prior) return "neutral";
  if (row.incrementalSpendAmount > 0 && row.roasChange >= 0) return "green";
  if (row.incrementalSpendAmount > 0 && row.roasChange < 0) return "amber";
  if (row.incrementalSpendAmount < 0 && row.roasChange < 0) return "red";
  return "neutral";
}

function cpaTone(row: any) {
  if (!row.prior) return "neutral";
  if (row.incrementalCpaAmount < 0) return "green";
  if (row.incrementalCpaAmount > 0) return "red";
  return "neutral";
}

export function EnhancedMonthlyReport() {
  const rows = useMetaStore((state) => state.performanceRows);

  const data = useMemo(() => {
    const monthlyRows = buildMonthlyRows(rows || []);
    const current = monthlyRows[monthlyRows.length - 1];
    const prior = monthlyRows[monthlyRows.length - 2];

    return {
      monthlyRows,
      current,
      prior,
      spendChange: current && prior ? change(current.spend, prior.spend) : 0,
      revenueChange: current && prior ? change(current.revenue, prior.revenue) : 0,
      roasChange: current && prior ? change(current.roas, prior.roas) : 0,
      cpaChange: current && prior ? change(current.cpa, prior.cpa) : 0,
      purchaseChange: current && prior ? change(current.purchases, prior.purchases) : 0,
      incrementalSpendAmount: current && prior ? current.spend - prior.spend : 0,
      incrementalCpaAmount: current && prior ? current.cpa - prior.cpa : 0,
    };
  }, [rows]);

  return (
    <div className="grid gap-3">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em]">
              Monthly Performance
            </p>
            <h1 className="mt-1 text-2xl font-black">This Month vs Last Month</h1>
            <p className="mt-1 text-sm opacity-60">
              Monthly performance with incremental spend and incremental CPA impact added.
            </p>
          </div>

          <div className="flex gap-2">
            <button className="rounded-lg border border-current/10 px-4 py-2 text-xs font-black">
              Copy Report
            </button>
            <button className="rounded-lg bg-[#0A84FF] px-4 py-2 text-xs font-black text-white">
              Export PDF
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#0A84FF]" />
          <h2 className="text-lg font-black">Incremental Movement Summary</h2>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <Kpi
            label="Incremental Spend"
            value={money(data.incrementalSpendAmount)}
            sub={pct(data.spendChange)}
            tone={data.incrementalSpendAmount >= 0 && data.roasChange >= 0 ? "green" : data.incrementalSpendAmount >= 0 ? "amber" : "neutral"}
          />
          <Kpi
            label="Incremental CPA"
            value={money(data.incrementalCpaAmount)}
            sub={pct(data.cpaChange)}
            tone={data.incrementalCpaAmount <= 0 ? "green" : "red"}
          />
          <Kpi
            label="Revenue Change"
            value={pct(data.revenueChange)}
            sub={data.current ? money(data.current.revenue) : "NA"}
            tone={data.revenueChange >= 0 ? "green" : "red"}
          />
          <Kpi
            label="ROAS Change"
            value={pct(data.roasChange)}
            sub={data.current ? `${num(data.current.roas)}x` : "NA"}
            tone={data.roasChange >= 0 ? "green" : "red"}
          />
          <Kpi
            label="Purchase Change"
            value={pct(data.purchaseChange)}
            sub={data.current ? num(data.current.purchases, 0) : "NA"}
            tone={data.purchaseChange >= 0 ? "green" : "red"}
          />
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="flex items-center gap-2 border-b border-current/10 px-4 py-3">
          <FileText className="h-4 w-4 text-[#0A84FF]" />
          <div>
            <h2 className="text-lg font-black">Monthly MoM Table</h2>
            <p className="mt-1 text-sm opacity-60">
              Includes incremental spend amount, incremental spend %, incremental CPA and incremental CPA %.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] border-collapse text-left">
            <thead>
              <tr className="bg-[#14233b] text-white">
                <th>Month</th>
                <th>Spend</th>
                <th>Revenue</th>
                <th>ROAS</th>
                <th>CPA</th>
                <th>Purchases</th>
                <th>CTR</th>
                <th>Purchase CVR</th>
                <th>Incr. Spend ₹</th>
                <th>Incr. Spend %</th>
                <th>Incr. CPA ₹</th>
                <th>Incr. CPA %</th>
              </tr>
            </thead>

            <tbody>
              {data.monthlyRows.map((row) => {
                const sTone = spendTone(row);
                const cTone = cpaTone(row);

                return (
                  <tr key={row.month} className="border-b border-current/10">
                    <td className="font-black">{row.month}</td>
                    <td>{money(row.spend)}</td>
                    <td>{money(row.revenue)}</td>
                    <td className={row.roas >= 1 ? "font-black text-emerald-600 dark:text-emerald-300" : "font-black text-red-600 dark:text-red-300"}>
                      {num(row.roas)}
                    </td>
                    <td>{money(row.cpa)}</td>
                    <td>{num(row.purchases, 0)}</td>
                    <td>{pct(row.ctr, 2)}</td>
                    <td>{pct(row.purchaseCvr, 2)}</td>

                    <td className={`font-black ${toneClass(sTone)}`}>
                      {row.prior ? money(row.incrementalSpendAmount) : "—"}
                    </td>

                    <td className={`font-black ${toneClass(sTone)}`}>
                      {row.prior ? pct(row.incrementalSpendPct) : "—"}
                    </td>

                    <td className={`font-black ${toneClass(cTone)}`}>
                      {row.prior ? money(row.incrementalCpaAmount) : "—"}
                    </td>

                    <td className={`font-black ${toneClass(cTone)}`}>
                      {row.prior ? pct(row.incrementalCpaPct) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "red" | "green" | "amber" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-current/10 bg-current/[0.025] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">{label}</p>
      <p className={`mt-1 text-xl font-black ${toneClass(tone || "neutral")}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs opacity-60">{sub}</p> : null}
    </div>
  );
}
