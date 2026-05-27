"use client";

import { useMemo, useState } from "react";
import { FileText, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMetaStore } from "@/store/metaStore";

type Row = Record<string, any>;

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number, d = 1) => `${num(Number(n || 0) * 100, d)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

const MONTH_COLORS = [
  "#ef4444",
  "#eab308",
  "#a855f7",
  "#06b6d4",
  "#f97316",
  "#6366f1",
  "#e11d48",
  "#0f766e",
  "#7c3aed",
  "#65a30d",
  "#3b82f6",
  "#22c55e",
];

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

function monthNameLabel(value?: string) {
  const d = parseDate(value);
  if (!d) return "";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
  });
}

function weekStartKey(value?: string) {
  const d = parseDate(value);
  if (!d) return "";

  const copy = new Date(d);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);

  return `${copy.getFullYear()}-${String(copy.getMonth() + 1).padStart(2, "0")}-${String(
    copy.getDate()
  ).padStart(2, "0")}`;
}

function monthColor(month: string) {
  const m = Number(String(month || "").split("-")[1] || 1);
  return MONTH_COLORS[(m - 1) % MONTH_COLORS.length];
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

function buildWeeklyRows(rows: Row[]) {
  const map = new Map<string, Row[]>();

  rows.forEach((row) => {
    const key = weekStartKey(getDate(row));
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  const weekly = Array.from(map.entries())
    .map(([week, weekRows]) => {
      const s = summarize(weekRows);
      const month = monthKey(week);
      const monthLabel = monthNameLabel(week);

      return {
        week,
        month,
        monthLabel,
        monthTick: "",
        spend: s.spend,
        spendLog: Math.max(s.spend, 1),
        revenue: s.revenue,
        purchases: s.purchases,
        cpa: s.cpa > 0 ? s.cpa : null,
        roas: s.roas,
        color: monthColor(month),
      };
    })
    .sort((a, b) => a.week.localeCompare(b.week));

  const seenMonths = new Set<string>();

  return weekly.map((row) => {
    if (!seenMonths.has(row.month)) {
      seenMonths.add(row.month);
      return {
        ...row,
        monthTick: row.monthLabel,
      };
    }

    return {
      ...row,
      monthTick: "",
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

function formatAxisMoney(v: any) {
  const n = Number(v || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${Math.round(n / 1000)}K`;
  return `₹${Math.round(n)}`;
}

export function EnhancedMonthlyReport() {
  const rows = useMetaStore((state) => state.performanceRows);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const data = useMemo(() => {
    const monthlyRows = buildMonthlyRows(rows || []);
    const weeklyRows = buildWeeklyRows(rows || []);
    const current = monthlyRows[monthlyRows.length - 1];
    const prior = monthlyRows[monthlyRows.length - 2];

    return {
      monthlyRows,
      weeklyRows,
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

  const scatterRows = data.weeklyRows.filter((row: any) => {
    const hasValidPoint = row.spend > 0 && row.cpa !== null && row.cpa > 0;
    const matchesMonth = selectedMonth ? row.month === selectedMonth : true;
    return hasValidPoint && matchesMonth;
  });

  return (
    <div className="grid gap-3">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em]">Monthly Performance</p>
            <h1 className="mt-1 text-2xl font-black">This Month vs Last Month</h1>
            <p className="mt-1 text-sm opacity-60">
              Monthly performance with incremental spend, incremental CPA, weekly scale trend and spend/CPA scatter.
            </p>
          </div>

          <div className="flex gap-2">
            <button className="rounded-lg border border-current/10 px-4 py-2 text-xs font-black">Copy Report</button>
            <button className="rounded-lg bg-[#0A84FF] px-4 py-2 text-xs font-black text-white">Export PDF</button>
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

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0A84FF]">Lifetime Weekly Trend</p>
            <h2 className="text-lg font-black">Weekly Spend vs CPA</h2>
            <p className="mt-1 text-sm opacity-60">
              Spend is shown as weekly bars on a log scale. CPA is shown as a line. Bar color changes by month.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.1em] opacity-70">
            <span>Bar: Spend</span>
            <span>Line: CPA</span>
            <span>Color: Month</span>
          </div>
        </div>

        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.weeklyRows} margin={{ top: 10, right: 24, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.18)" />
              <XAxis dataKey="monthTick" tick={{ fontSize: 10, fill: "currentColor" }} axisLine={false} tickLine={false} minTickGap={14} />
              <YAxis
                yAxisId="spend"
                scale="log"
                domain={[1, "auto"]}
                tick={{ fontSize: 10, fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
                width={72}
                tickFormatter={formatAxisMoney}
              />
              <YAxis
                yAxisId="cpa"
                orientation="right"
                tick={{ fontSize: 10, fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
                width={72}
                tickFormatter={(v) => `₹${Math.round(Number(v || 0))}`}
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
                  if (name === "CPA") return [money(Number(value || 0)), "CPA"];
                  return [value, name];
                }}
                labelFormatter={(_, payload) => {
                  const row = Array.isArray(payload) ? payload?.[0]?.payload : undefined;
                  return row ? `${row.monthLabel} · Week starting ${row.week}` : "";
                }}
              />

              <Bar yAxisId="spend" dataKey="spendLog" name="Spend" radius={[4, 4, 0, 0]}>
                {data.weeklyRows.map((entry: any) => (
                  <Cell key={entry.week} fill={entry.color} />
                ))}
              </Bar>

              <Line yAxisId="cpa" type="monotone" dataKey="cpa" name="CPA" stroke="#b42318" strokeWidth={2} dot={false} connectNulls />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <MonthLegend rows={data.weeklyRows} />
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0A84FF]">Weekly Scale Efficiency</p>
            <h2 className="text-lg font-black">Weekly Spend vs Weekly CPA Scatter</h2>
            <p className="mt-1 text-sm opacity-60">
              Each dot is one week. X-axis shows weekly spend, Y-axis shows weekly CPA. Dot color changes by month.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.1em] opacity-70">
            <span>X: Weekly Spend</span>
            <span>Y: Weekly CPA</span>
            <span>Dot: Week</span>
          </div>
        </div>

        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 24, left: 16, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.18)" />
              <XAxis
                type="number"
                dataKey="spend"
                name="Weekly Spend"
                tick={{ fontSize: 10, fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatAxisMoney}
              />
              <YAxis
                type="number"
                dataKey="cpa"
                name="Weekly CPA"
                tick={{ fontSize: 10, fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
                width={72}
                tickFormatter={(v) => `₹${Math.round(Number(v || 0))}`}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "#111318",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  color: "white",
                  fontSize: 11,
                }}
                formatter={(value: any, name: any) => {
                  if (name === "Weekly Spend") return [money(Number(value || 0)), "Weekly Spend"];
                  if (name === "Weekly CPA") return [money(Number(value || 0)), "Weekly CPA"];
                  return [value, name];
                }}
                labelFormatter={(_, payload) => {
                  const row = Array.isArray(payload) ? payload?.[0]?.payload : undefined;
                  return row ? `${row.monthLabel} · Week starting ${row.week}` : "";
                }}
              />

              <Scatter name="Weekly Spend vs CPA" data={scatterRows} fill="#0A84FF">
                {scatterRows.map((entry: any) => (
                  <Cell key={`scatter-${entry.week}`} fill={entry.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <MonthLegend
          rows={data.weeklyRows}
          selectedMonth={selectedMonth}
          onSelectMonth={(month) => {
            setSelectedMonth((current) => (current === month ? null : month));
          }}
          showAllReset
        />
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
            <thead className="monthly-table-head">
              <tr>
                {[
                  "Month",
                  "Spend",
                  "Revenue",
                  "ROAS",
                  "CPA",
                  "Purchases",
                  "CTR",
                  "Purchase CVR",
                  "Incr. Spend ₹",
                  "Incr. Spend %",
                  "Incr. CPA ₹",
                  "Incr. CPA %",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="monthly-table-th"
                    style={{
                      backgroundColor: "#14233b",
                      color: "#ffffff",
                      opacity: 1,
                      fontWeight: 900,
                      fontSize: 10,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      padding: "8px 10px",
                      borderBottom: "1px solid rgba(255,255,255,0.16)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {heading}
                  </th>
                ))}
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
                    <td className={`font-black ${toneClass(sTone)}`}>{row.prior ? money(row.incrementalSpendAmount) : "—"}</td>
                    <td className={`font-black ${toneClass(sTone)}`}>{row.prior ? pct(row.incrementalSpendPct) : "—"}</td>
                    <td className={`font-black ${toneClass(cTone)}`}>{row.prior ? money(row.incrementalCpaAmount) : "—"}</td>
                    <td className={`font-black ${toneClass(cTone)}`}>{row.prior ? pct(row.incrementalCpaPct) : "—"}</td>
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

function MonthLegend({
  rows,
  selectedMonth,
  onSelectMonth,
  showAllReset = false,
}: {
  rows: any[];
  selectedMonth?: string | null;
  onSelectMonth?: (month: string | null) => void;
  showAllReset?: boolean;
}) {
  const months = Array.from(new Map(rows.map((row: any) => [row.month, row])).values());

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {showAllReset ? (
        <button
          type="button"
          onClick={() => onSelectMonth?.(null)}
          className={
            !selectedMonth
              ? "inline-flex items-center gap-2 rounded-full border border-[#0A84FF] bg-[#0A84FF] px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white"
              : "inline-flex items-center gap-2 rounded-full border border-current/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em]"
          }
        >
          All Months
        </button>
      ) : null}

      {months.map((row: any) => {
        const isActive = selectedMonth === row.month;
        const isDimmed = selectedMonth && !isActive;

        const className = onSelectMonth
          ? isActive
            ? "inline-flex items-center gap-2 rounded-full border border-[#0A84FF] bg-[#0A84FF] px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white"
            : isDimmed
            ? "inline-flex items-center gap-2 rounded-full border border-current/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] opacity-35"
            : "inline-flex items-center gap-2 rounded-full border border-current/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em]"
          : "inline-flex items-center gap-2 rounded-full border border-current/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em]";

        const content = (
          <>
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
            {row.monthLabel}
          </>
        );

        if (!onSelectMonth) {
          return (
            <span key={row.month} className={className}>
              {content}
            </span>
          );
        }

        return (
          <button
            key={row.month}
            type="button"
            onClick={() => onSelectMonth(row.month)}
            className={className}
            title={isActive ? "Click again to show all months" : `Show only ${row.monthLabel}`}
          >
            {content}
          </button>
        );
      })}
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
