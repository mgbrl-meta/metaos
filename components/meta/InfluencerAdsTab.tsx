"use client";

import { useMemo, useState } from "react";
import { Download, IndianRupee, Search, SlidersHorizontal } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";

type Row = Record<string, any>;

type WindowMetrics = {
  spend: number;
  revenue: number;
  purchases: number;
  cpa: number;
  roas: number;
};

type InfluencerVideoRow = {
  key: string;
  creative: string;
  adName: string;
  adSet: string;
  campaign: string;
  yesterday: WindowMetrics;
  last7: WindowMetrics;
  last14: WindowMetrics;
  last30: WindowMetrics;
  risk: "Top Spender" | "Approval Check" | "Monitor";
};

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function getDate(row: Row) {
  return String(row.date || row.day || row.Day || "");
}

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getSpend(row: Row) {
  return Number(
    row.spend ??
      row.amountSpent ??
      row.amount_spent ??
      row["Amount spent (INR)"] ??
      row.Amount_spent__INR_ ??
      0
  );
}

function getRevenue(row: Row) {
  return Number(
    row.revenue ??
      row.purchaseValue ??
      row.purchase_value ??
      row.conversionValue ??
      row.conversion_value ??
      row["Purchases conversion value"] ??
      row.Purchases_conversion_value ??
      0
  );
}

function getPurchases(row: Row) {
  return Number(row.purchases ?? row.Purchases ?? 0);
}

function getCreative(row: Row) {
  return String(
    row.creativeName ??
      row.creative_name ??
      row.Creative_Name_ ??
      row.adName ??
      row.ad_name ??
      row.Ad_name ??
      "Unknown Creative"
  );
}

function getAdName(row: Row) {
  return String(row.adName ?? row.ad_name ?? row.Ad_name ?? "Unknown Ad");
}

function getAdSet(row: Row) {
  return String(row.adSetName ?? row.adsetName ?? row.ad_set_name ?? row.Ad_set_name ?? "Unknown Ad Set");
}

function getCampaign(row: Row) {
  return String(row.campaignName ?? row.campaign_name ?? row.Campaign_name ?? "Unknown Campaign");
}

function influencerIntent(row: Row) {
  const text = `${getCreative(row)} ${getAdName(row)} ${getAdSet(row)} ${getCampaign(row)}`.toLowerCase();

  return (
    text.includes("collab") ||
    text.includes("creator") ||
    text.includes("influencer") ||
    text.includes("partnership") ||
    text.includes("paid partnership") ||
    text.includes("@")
  );
}

function summarize(rows: Row[]): WindowMetrics {
  const spend = rows.reduce((s, r) => s + getSpend(r), 0);
  const revenue = rows.reduce((s, r) => s + getRevenue(r), 0);
  const purchases = rows.reduce((s, r) => s + getPurchases(r), 0);

  return {
    spend,
    revenue,
    purchases,
    cpa: safeDiv(spend, purchases),
    roas: safeDiv(revenue, spend),
  };
}

function windowRows(rows: Row[], endDate: string, days: number) {
  const end = parseDate(endDate);
  if (!end) return [];

  const start = dateKey(addDays(end, -(days - 1)));

  return rows.filter((row) => {
    const d = getDate(row);
    return d >= start && d <= endDate;
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function exportExcel(rows: InfluencerVideoRow[]) {
  const headers = [
    "Creative / Video",
    "Ad Name",
    "Ad Set",
    "Campaign",
    "Risk",
    "Yesterday Spend",
    "Yesterday CPA",
    "Yesterday ROAS",
    "Last 7D Spend",
    "Last 7D CPA",
    "Last 7D ROAS",
    "Last 14D Spend",
    "Last 14D CPA",
    "Last 14D ROAS",
    "Last 30D Spend",
    "Last 30D CPA",
    "Last 30D ROAS",
  ];

  const body = rows.map((row) => [
    row.creative,
    row.adName,
    row.adSet,
    row.campaign,
    row.risk,
    Math.round(row.yesterday.spend),
    row.yesterday.purchases > 0 ? Math.round(row.yesterday.cpa) : "No sale",
    num(row.yesterday.roas),
    Math.round(row.last7.spend),
    row.last7.purchases > 0 ? Math.round(row.last7.cpa) : "No sale",
    num(row.last7.roas),
    Math.round(row.last14.spend),
    row.last14.purchases > 0 ? Math.round(row.last14.cpa) : "No sale",
    num(row.last14.roas),
    Math.round(row.last30.spend),
    row.last30.purchases > 0 ? Math.round(row.last30.cpa) : "No sale",
    num(row.last30.roas),
  ]);

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${body
              .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `influencer-ads-approval-queue-${dateKey(new Date())}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "green" | "red" | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "red"
        ? "text-red-600 dark:text-red-300"
        : tone === "amber"
          ? "text-orange-600 dark:text-orange-300"
          : "text-[var(--meta-text)]";

  return (
    <div className="min-w-[92px]">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--meta-text-muted)]">
        {label}
      </p>
      <p className={`mt-1 text-xs font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

export function InfluencerAdsTab() {
  const rows = useMetaStore((state) => state.performanceRows);
  const [threshold, setThreshold] = useState(5000);
  const [query, setQuery] = useState("");

  const data = useMemo(() => {
    const validRows = rows.filter((row) => getDate(row));
    const latest = validRows.map((row) => getDate(row)).sort().at(-1) || "";

    const grouped = new Map<string, Row[]>();

    validRows.filter(influencerIntent).forEach((row) => {
      const key = `${getCreative(row)}||${getAdName(row)}||${getAdSet(row)}||${getCampaign(row)}`;

      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row);
    });

    const items: InfluencerVideoRow[] = Array.from(grouped.entries())
      .map(([key, videoRows]) => {
        const yesterdayRows = videoRows.filter((row) => getDate(row) === latest);
        const yesterday = summarize(yesterdayRows);
        const last7 = summarize(windowRows(videoRows, latest, 7));
        const last14 = summarize(windowRows(videoRows, latest, 14));
        const last30 = summarize(windowRows(videoRows, latest, 30));

        const sample = videoRows[0];

        const risk: InfluencerVideoRow["risk"] =
          yesterday.spend >= 25000
            ? "Top Spender"
            : yesterday.spend >= 5000
              ? "Approval Check"
              : "Monitor";

        return {
          key,
          creative: getCreative(sample),
          adName: getAdName(sample),
          adSet: getAdSet(sample),
          campaign: getCampaign(sample),
          yesterday,
          last7,
          last14,
          last30,
          risk,
        };
      })
      .filter((item) => item.yesterday.spend >= threshold)
      .filter((item) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();

        return `${item.creative} ${item.adName} ${item.adSet} ${item.campaign}`.toLowerCase().includes(q);
      })
      .sort((a, b) => b.yesterday.spend - a.yesterday.spend);

    return {
      latest,
      items,
      totalYesterdaySpend: items.reduce((s, x) => s + x.yesterday.spend, 0),
      topSpenders: items.filter((x) => x.yesterday.spend >= 25000).length,
    };
  }, [rows, threshold, query]);

  return (
    <div className="grid gap-4 influencer-ads-root">
      <section className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#0A84FF]/30 bg-[#0A84FF]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A84FF]">
                Influencer Ads
              </span>
              <span className="rounded-full border border-current/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--meta-text-muted)]">
                Latest {data.latest || "NA"}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-black tracking-[-0.04em]">Influencer Ads Approval Queue</h1>
            <p className="mt-1 max-w-3xl text-sm text-[var(--meta-text-muted)]">
              Active collab / creator videos that spent yesterday. Use this to catch coupon expiry, approval dependency, or creator-code issues before high-spend videos waste budget.
            </p>
          </div>

          <button
            type="button"
            onClick={() => exportExcel(data.items)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#0A84FF] px-4 text-xs font-black text-white shadow-lg shadow-blue-500/20"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--meta-text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search creator, ad, ad set, campaign..."
              className="h-11 w-full rounded-2xl border border-current/10 bg-transparent pl-10 pr-4 text-sm font-semibold text-[var(--meta-text)] outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setThreshold(5000)}
              className={
                threshold === 5000
                  ? "h-10 rounded-full bg-[#0A84FF] px-4 text-xs font-black text-white"
                  : "h-10 rounded-full border border-current/10 px-4 text-xs font-black"
              }
            >
              ₹5K+ Active
            </button>

            <button
              type="button"
              onClick={() => setThreshold(25000)}
              className={
                threshold === 25000
                  ? "h-10 rounded-full bg-[#0A84FF] px-4 text-xs font-black text-white"
                  : "h-10 rounded-full border border-current/10 px-4 text-xs font-black"
              }
            >
              ₹25K+ Top Spenders
            </button>
          </div>

          <label className="flex h-11 items-center gap-2 rounded-2xl border border-current/10 px-3">
            <SlidersHorizontal className="h-4 w-4 text-[#0A84FF]" />
            <IndianRupee className="h-3.5 w-3.5 text-[var(--meta-text-muted)]" />
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Number(e.target.value || 0)))}
              className="w-[120px] bg-transparent text-sm font-black text-[var(--meta-text)] outline-none"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--meta-text-muted)]">Videos visible</p>
            <p className="mt-1 text-xl font-black">{data.items.length}</p>
          </div>

          <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--meta-text-muted)]">Yesterday spend</p>
            <p className="mt-1 text-xl font-black">{money(data.totalYesterdaySpend)}</p>
          </div>

          <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--meta-text-muted)]">Top spenders</p>
            <p className="mt-1 text-xl font-black text-orange-600 dark:text-orange-300">{data.topSpenders}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <h2 className="text-lg font-black">Active Influencer Videos</h2>
          <p className="mt-1 text-sm text-[var(--meta-text-muted)]">
            Sorted by yesterday spend. One line per active creator video.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1780px] border-collapse text-left text-xs">
            <thead className="bg-[#14233b] text-white">
              <tr>
                {[
                  "Video / Creative",
                  "Risk",
                  "Y Spend",
                  "Y CPA",
                  "Y ROAS",
                  "7D Spend",
                  "7D CPA",
                  "7D ROAS",
                  "14D Spend",
                  "14D CPA",
                  "14D ROAS",
                  "30D Spend",
                  "30D CPA",
                  "30D ROAS",
                  "Campaign",
                  "Ad Set",
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.items.map((item) => (
                <tr key={item.key} className="border-b border-current/10 hover:bg-current/[0.035]">
                  <td className="max-w-[360px] px-3 py-3">
                    <p className="truncate font-black">{item.creative}</p>
                    <p className="mt-0.5 truncate text-[var(--meta-text-muted)]">{item.adName}</p>
                  </td>

                  <td className="px-3 py-3">
                    <span
                      className={
                        item.risk === "Top Spender"
                          ? "rounded-full border border-orange-300 bg-orange-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300"
                          : item.risk === "Approval Check"
                            ? "rounded-full border border-red-300 bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
                            : "rounded-full border border-current/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em]"
                      }
                    >
                      {item.risk}
                    </span>
                  </td>

                  <td className="px-3 py-3 font-black">{money(item.yesterday.spend)}</td>
                  <td className="px-3 py-3 font-black text-red-600 dark:text-red-300">
                    {item.yesterday.purchases > 0 ? money(item.yesterday.cpa) : "No sale"}
                  </td>
                  <td className="px-3 py-3 font-black text-emerald-600 dark:text-emerald-300">{num(item.yesterday.roas)}x</td>

                  <td className="px-3 py-3">{money(item.last7.spend)}</td>
                  <td className="px-3 py-3">{item.last7.purchases > 0 ? money(item.last7.cpa) : "No sale"}</td>
                  <td className="px-3 py-3">{num(item.last7.roas)}x</td>

                  <td className="px-3 py-3">{money(item.last14.spend)}</td>
                  <td className="px-3 py-3">{item.last14.purchases > 0 ? money(item.last14.cpa) : "No sale"}</td>
                  <td className="px-3 py-3">{num(item.last14.roas)}x</td>

                  <td className="px-3 py-3">{money(item.last30.spend)}</td>
                  <td className="px-3 py-3">{item.last30.purchases > 0 ? money(item.last30.cpa) : "No sale"}</td>
                  <td className="px-3 py-3">{num(item.last30.roas)}x</td>

                  <td className="max-w-[280px] px-3 py-3">
                    <p className="truncate">{item.campaign}</p>
                  </td>
                  <td className="max-w-[280px] px-3 py-3">
                    <p className="truncate">{item.adSet}</p>
                  </td>
                </tr>
              ))}

              {!data.items.length ? (
                <tr>
                  <td colSpan={16} className="px-4 py-8 text-center text-sm text-[var(--meta-text-muted)]">
                    No active influencer videos found above {money(threshold)} yesterday spend.
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
