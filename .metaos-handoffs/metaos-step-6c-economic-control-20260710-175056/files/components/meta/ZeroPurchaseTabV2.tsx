"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, Copy, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";
import { normalizeUnknownRows } from "@/lib/meta/normalize";
import {
  buildZeroPurchaseOutput,
  type ZeroPurchaseItem,
} from "@/lib/meta/tabEngines/zeroPurchaseEngine";
import {
  formatCpa,
  formatINRCompact,
  formatNumberCompact,
  formatRoas,
  formatShortDate,
} from "@/lib/meta/formatters";
import { MetaEmptyState } from "@/components/meta/shared/MetaEmptyState";

function toHandleOnly(adName: string) {
  const value = String(adName || "").trim();
  const handle = value.match(/@[a-zA-Z0-9._]+/);
  if (handle?.[0]) return handle[0];

  return value
    .split(/\s+-\s+/)[0]
    .replace(/[|·,\s]+$/g, "")
    .trim();
}

async function copyUnique(lines: string[]) {
  const clean = Array.from(new Set(lines.map((line) => line.trim()).filter(Boolean)));
  await navigator.clipboard.writeText(clean.join("\n"));
  return clean.length;
}

function KpiCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "red" | "green" | "neutral";
}) {
  const toneClass =
    tone === "red"
      ? "text-red-600 dark:text-red-300"
      : tone === "green"
        ? "text-emerald-600 dark:text-emerald-300"
        : "text-slate-950 dark:text-white";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111827]">
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-xl font-black ${toneClass}`}>{value}</div>
    </div>
  );
}

function MetricCell({ value, tone = "neutral" }: { value: string; tone?: "red" | "green" | "neutral" }) {
  const toneClass =
    tone === "red"
      ? "text-red-600 dark:text-red-300"
      : tone === "green"
        ? "text-emerald-600 dark:text-emerald-300"
        : "text-slate-800 dark:text-slate-200";

  return (
    <td className={`whitespace-nowrap px-3 py-3 text-right text-sm font-semibold tabular-nums ${toneClass}`}>
      {value}
    </td>
  );
}

function TrendTable({ item }: { item: ZeroPurchaseItem }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <h3 className="text-sm font-black text-slate-950 dark:text-white">Latest 7-Day Trend</h3>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111827]">
        <table className="w-full min-w-[620px] border-collapse">
          <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.14em]">Date</th>
              <th className="px-3 py-2 text-right text-[11px] font-black uppercase tracking-[0.14em]">Spend</th>
              <th className="px-3 py-2 text-right text-[11px] font-black uppercase tracking-[0.14em]">Clicks</th>
              <th className="px-3 py-2 text-right text-[11px] font-black uppercase tracking-[0.14em]">LPV</th>
              <th className="px-3 py-2 text-right text-[11px] font-black uppercase tracking-[0.14em]">Purchases</th>
              <th className="px-3 py-2 text-right text-[11px] font-black uppercase tracking-[0.14em]">ROAS</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {item.trend.map((row) => (
              <tr key={row.date}>
                <td className="whitespace-nowrap px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {formatShortDate(row.date)}
                </td>
                <MetricCell value={formatINRCompact(row.spend)} />
                <MetricCell value={formatNumberCompact(row.clicks)} />
                <MetricCell value={formatNumberCompact(row.lpv)} />
                <MetricCell value={formatNumberCompact(row.purchases)} tone={row.purchases <= 0 ? "red" : "green"} />
                <MetricCell value={formatRoas(row.roas)} tone={row.roas <= 0 ? "red" : "green"} />
              </tr>
            ))}

            {!item.trend.length ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                  No trend data available.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailBox({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <h3 className="text-sm font-black text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-2 grid gap-1 text-sm text-slate-600 dark:text-slate-300">
        {lines.map((line) => (
          <p key={line}>• {line}</p>
        ))}
      </div>
    </div>
  );
}

export function ZeroPurchaseTabV2() {
  const performanceRows = useMetaStore((state) => state.performanceRows);
  const [threshold, setThreshold] = useState(3000);
  const [openId, setOpenId] = useState("");
  const [copied, setCopied] = useState("");

  const cleanRows = useMemo(
    () => normalizeUnknownRows((performanceRows || []) as unknown as Record<string, unknown>[]),
    [performanceRows]
  );

  const output = useMemo(
    () => buildZeroPurchaseOutput(cleanRows, threshold),
    [cleanRows, threshold]
  );

  async function copyHandles() {
    const count = await copyUnique(output.items.map((item) => toHandleOnly(item.adName)));
    setCopied(`${count} handles copied`);
    window.setTimeout(() => setCopied(""), 1800);
  }

  async function copyFullNames() {
    const count = await copyUnique(output.items.map((item) => item.adName));
    setCopied(`${count} ad names copied`);
    window.setTimeout(() => setCopied(""), 1800);
  }

  if (!cleanRows.length) {
    return (
      <MetaEmptyState
        title="Zero Purchase data not loaded"
        description="Refresh Meta data to activate zero-purchase diagnostics."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111827]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-600 dark:text-red-300">
              <ShieldAlert className="h-3.5 w-3.5" />
              Zero Purchase V2
            </div>

            <h1 className="mt-3 text-xl font-black text-slate-950 dark:text-white">
              Zero-Purchase Waste Control
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Engine-based view of ads with spend but zero purchases. No API fetch inside tab. No layout hacks.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <KpiCard label="Ads" value={String(output.totalItems)} tone={output.totalItems > 0 ? "red" : "green"} />
            <KpiCard label="Lifetime Waste" value={formatINRCompact(output.totalLifetimeSpend)} tone={output.totalLifetimeSpend > 0 ? "red" : "green"} />
            <KpiCard label="Latest Waste" value={formatINRCompact(output.totalLatestSpend)} tone={output.totalLatestSpend > 0 ? "red" : "green"} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111827]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#0A84FF]" />
            <div>
              <h2 className="text-base font-black text-slate-950 dark:text-white">Lifetime Spend Threshold</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Latest date: {output.latestDate || "NA"} · Filter ads by lifetime zero-purchase spend.
              </p>
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
                    : "rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                }
              >
                {formatINRCompact(value)}
              </button>
            ))}

            <input
              type="number"
              value={threshold}
              onChange={(event) => setThreshold(Math.max(0, Number(event.target.value || 0)))}
              className="w-[130px] rounded-full border border-slate-200 bg-transparent px-3 py-1.5 text-xs font-black text-slate-900 outline-none dark:border-white/10 dark:text-white"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111827]">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Ads With Zero Purchases</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Lifetime purchases = 0, lifetime spend above {formatINRCompact(threshold)}, and active in latest / last 7 days.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {copied ? (
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-300">{copied}</span>
            ) : null}

            <button
              type="button"
              onClick={copyHandles}
              className="inline-flex items-center gap-2 rounded-full bg-[#0A84FF] px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Handles
            </button>

            <button
              type="button"
              onClick={copyFullNames}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-700 dark:border-white/10 dark:text-slate-300"
            >
              Full Names
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse">
            <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="w-[330px] px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em]">Ad</th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">Lifetime Spend</th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">Latest Spend</th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">L7D Spend</th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">Clicks</th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">LPV</th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">Purchases</th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">CPA</th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">ROAS</th>
                <th className="w-[70px] px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.14em]">Open</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {output.items.map((item) => {
                const isOpen = openId === item.id;

                return (
                  <Fragment key={item.id}>
                    <tr className="hover:bg-slate-50/70 dark:hover:bg-white/[0.03]">
                      <td className="px-3 py-3 text-left">
                        <div className="min-w-0">
                          <div className="mb-1 inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-red-600 dark:text-red-300">
                            Zero Purchase
                          </div>

                          <div className="max-w-[310px] truncate text-sm font-black text-slate-950 dark:text-white" title={item.adName}>
                            {item.adName}
                          </div>

                          <div className="mt-0.5 max-w-[310px] truncate text-xs text-slate-500 dark:text-slate-400" title={`${item.campaignName} · ${item.adSetName}`}>
                            {item.campaignName} · {item.adSetName}
                          </div>
                        </div>
                      </td>

                      <MetricCell value={formatINRCompact(item.lifetime.spend)} tone="red" />
                      <MetricCell value={formatINRCompact(item.latest.spend)} tone={item.latest.spend > 0 ? "red" : "neutral"} />
                      <MetricCell value={formatINRCompact(item.last7.spend)} tone={item.last7.spend > 0 ? "red" : "neutral"} />
                      <MetricCell value={formatNumberCompact(item.lifetime.clicks)} />
                      <MetricCell value={formatNumberCompact(item.lifetime.lpv)} />
                      <MetricCell value={formatNumberCompact(item.lifetime.purchases)} tone="red" />
                      <MetricCell value={item.lifetime.purchases > 0 ? formatCpa(item.lifetime.cpa) : "No sale"} tone="red" />
                      <MetricCell value={formatRoas(item.lifetime.roas)} tone="red" />

                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setOpenId(isOpen ? "" : item.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                        >
                          <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      </td>
                    </tr>

                    {isOpen ? (
                      <tr>
                        <td colSpan={10} className="bg-slate-50/70 px-4 py-4 dark:bg-white/[0.03]">
                          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.3fr]">
                            <DetailBox
                              title="Why This Is Critical"
                              lines={[
                                `Lifetime spend is ${formatINRCompact(item.lifetime.spend)} with zero purchases.`,
                                `Latest-day spend is ${formatINRCompact(item.latest.spend)}.`,
                                `Last 7-day spend is ${formatINRCompact(item.last7.spend)}.`,
                              ]}
                            />

                            <DetailBox
                              title="Operator Action"
                              lines={[
                                "Pause if this ad has crossed the kill threshold.",
                                "Check if it has ATC/LPV signal before killing permanently.",
                                "If CTR is strong but purchases are zero, inspect PDP/offer mismatch.",
                              ]}
                            />

                            <TrendTable item={item} />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}

              {!output.items.length ? (
                <tr>
                  <td colSpan={10} className="px-4 py-6">
                    <MetaEmptyState
                      title="No zero-purchase ads found at this threshold"
                      description="Try lowering the spend threshold or refresh Meta data."
                    />
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
