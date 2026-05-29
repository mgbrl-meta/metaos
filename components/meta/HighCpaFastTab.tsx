"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  LineChart as LineChartIcon,
  RefreshCw,
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

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number, d = 2) => `${num(Number(n || 0) * 100, d)}%`;

export function HighCpaFastTab() {
  const [threshold, setThreshold] = useState(3000);
  const [customThreshold, setCustomThreshold] = useState("3000");
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<any>(null);
  const [error, setError] = useState("");

  async function load(force = false) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/meta-os-fast?view=high_cpa&threshold=${threshold}${force ? `&force=${Date.now()}` : ""}`,
        { cache: "no-store" }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load High CPA data");

      setPayload(json);
    } catch (err: any) {
      setError(err?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold]);

  const data = payload?.data;
  const items: any[] = data?.items || [];
  const campaigns: any[] = data?.campaigns || [];

  const summary = useMemo(() => {
    return {
      count: items.length,
      campaigns: campaigns.length,
      totalSpend: data?.totalSpend || 0,
      totalPurchases: data?.totalPurchases || 0,
      yesterdaySpend: data?.yesterdaySpend || 0,
      latest: data?.latest || "NA",
      activeAdCount: data?.activeAdCount || 0,
      rawRowsUsed: data?.rawRowsUsed || 0,
    };
  }, [items, campaigns, data]);

  return (
    <div className="grid gap-3">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-300">
              High CPA Control
            </p>
            <h1 className="mt-1 text-2xl font-black">Live High CPA Ads</h1>
            <p className="mt-1 text-sm opacity-60">
              Only ads that spent yesterday are shown. Lifetime CPA is calculated as lifetime spend divided by lifetime purchases.
            </p>
          </div>

          <button
            type="button"
            onClick={() => load(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-current/10 px-4 py-2 text-xs font-black"
          >
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="grid gap-2 md:grid-cols-6">
          <Kpi label="High CPA Ads" value={String(summary.count)} tone={summary.count > 0 ? "red" : "green"} />
          <Kpi label="Campaigns" value={String(summary.campaigns)} tone={summary.campaigns > 0 ? "red" : "green"} />
          <Kpi label="Lifetime Spend" value={money(summary.totalSpend)} />
          <Kpi label="Purchases" value={num(summary.totalPurchases, 0)} />
          <Kpi label="Yesterday Spend" value={money(summary.yesterdaySpend)} />
          <Kpi label="Active Ads" value={String(summary.activeAdCount)} />
        </div>

        {payload?.cached ? <p className="mt-3 text-xs opacity-60">Loaded from 10-minute server cache.</p> : null}

        {error ? (
          <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-black text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#0A84FF]" />
            <div>
              <h2 className="text-lg font-black">Lifetime CPA Threshold</h2>
              <p className="text-sm opacity-60">Show active-yesterday ads where lifetime purchases are above 0 and lifetime CPA crosses your selected threshold.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[1000, 2000, 3000, 5000].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setThreshold(value);
                  setCustomThreshold(String(value));
                }}
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
              value={customThreshold}
              onChange={(e) => setCustomThreshold(e.target.value)}
              onBlur={() => setThreshold(Math.max(0, Number(customThreshold || 0)))}
              onKeyDown={(e) => {
                if (e.key === "Enter") setThreshold(Math.max(0, Number(customThreshold || 0)));
              }}
              className="w-[130px] rounded-full border border-current/10 bg-transparent px-3 py-1.5 text-xs font-black outline-none"
              placeholder="Custom"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <h2 className="text-lg font-black">High CPA Campaigns</h2>
          <p className="mt-1 text-sm opacity-60">
            Campaigns containing active ads with lifetime CPA above {money(threshold)}.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="monthly-table-head">
              <tr>
                {["Campaign", "Ads", "Lifetime Spend", "Purchases", "CPA", "ROAS", "Yesterday Spend"].map((h) => (
                  <th key={h} className="monthly-table-th">{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {campaigns.map((row) => (
                <tr key={row.campaign} className="border-b border-current/10">
                  <td className="font-black">{row.campaign}</td>
                  <td>{row.ads}</td>
                  <td>{money(row.spend)}</td>
                  <td>{num(row.purchases, 0)}</td>
                  <td className="font-black text-red-600 dark:text-red-300">{money(row.cpa)}</td>
                  <td className={row.roas >= 1 ? "font-black text-emerald-600 dark:text-emerald-300" : "font-black text-red-600 dark:text-red-300"}>
                    {num(row.roas)}x
                  </td>
                  <td>{money(row.yesterdaySpend)}</td>
                </tr>
              ))}

              {!campaigns.length ? (
                <tr>
                  <td colSpan={7} className="p-5">
                    No high CPA campaigns found at this threshold.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="flex items-center justify-between gap-3 border-b border-current/10 px-4 py-3">
          <div>
            <h2 className="text-lg font-black">High CPA Ads</h2>
            <p className="mt-1 text-sm opacity-60">
              Showing ads live yesterday where lifetime purchases > 0 and lifetime CPA is above {money(threshold)}.
            </p>
          </div>

          <span className="rounded-full border border-current/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
            Latest {summary.latest}
          </span>
        </div>

        <div className="divide-y divide-current/10">
          {loading && !items.length ? <div className="p-5 text-sm opacity-60">Loading fast High CPA view...</div> : null}

          {items.map((item) => (
            <details key={item.key} className="group">
              <summary className="grid cursor-pointer list-none grid-cols-[1fr_90px_78px_78px_78px_78px_78px_24px] items-center gap-3 px-4 py-3 text-xs hover:bg-current/[0.035]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                      High CPA
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

                <Metric label="Life Spend" value={money(item.lifetime.spend)} />
                <Metric label="CPM" value={money(item.lifetime.cpm)} />
                <Metric label="CTR" value={pct(item.lifetime.ctr)} />
                <Metric label="CPA" value={money(item.lifetime.cpa)} tone="red" />
                <Metric label="AOV" value={money(item.lifetime.aov)} />
                <Metric label="ROAS" value={`${num(item.lifetime.roas)}x`} tone={item.lifetime.roas >= 1 ? "green" : "red"} />
                <ChevronDown className="h-4 w-4 opacity-45 transition group-open:rotate-180" />
              </summary>

              <div className="grid gap-3 px-4 pb-4 lg:grid-cols-[1fr_1fr_440px]">
                <InfoBox
                  title="Why This Is Critical"
                  lines={[
                    `This ad has lifetime CPA of ${money(item.lifetime.cpa)}, above selected threshold ${money(threshold)}.`,
                    `Lifetime spend is ${money(item.lifetime.spend)} with ${num(item.lifetime.purchases, 0)} purchases.`,
                    `It still spent yesterday, so it is active and can continue consuming budget.`,
                    "Reduce, cap, or rebuild unless the ad has strategic value or strong downstream quality.",
                  ]}
                />

                <InfoBox
                  title="Metric Read"
                  lines={[
                    `CPM: ${money(item.lifetime.cpm)}`,
                    `CTR: ${pct(item.lifetime.ctr)}`,
                    `CPC: ${money(item.lifetime.cpc)}`,
                    `AOV: ${money(item.lifetime.aov)}`,
                    `ROAS: ${num(item.lifetime.roas)}x`,
                  ]}
                />

                <TrendBox data={item.trend} />
              </div>
            </details>
          ))}

          {!loading && !items.length ? (
            <div className="p-5">
              <p className="font-black">No high CPA live ads found at this threshold.</p>
              <p className="mt-1 text-sm opacity-60">Try lowering the CPA threshold.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "red" | "green" }) {
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

function Metric({ label, value, tone }: { label: string; value: string; tone?: "red" | "green" }) {
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
          CPM / CTR / CPA / AOV / ROAS Trend
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
                if (name === "CPA") return [money(Number(value || 0)), "CPA"];
                if (name === "AOV") return [money(Number(value || 0)), "AOV"];
                if (name === "CTR") return [pct(Number(value || 0)), "CTR"];
                if (name === "ROAS") return [`${num(Number(value || 0))}x`, "ROAS"];
                return [value, name];
              }}
            />
            <Line yAxisId="money" type="monotone" dataKey="cpm" name="CPM" stroke="#0A84FF" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="money" type="monotone" dataKey="cpa" name="CPA" stroke="#b42318" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="money" type="monotone" dataKey="aov" name="AOV" stroke="#9333ea" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="rate" type="monotone" dataKey="ctr" name="CTR" stroke="#087f5b" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="rate" type="monotone" dataKey="roas" name="ROAS" stroke="#f97316" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
