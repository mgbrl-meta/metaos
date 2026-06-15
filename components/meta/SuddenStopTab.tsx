"use client";

import { useMemo, useState } from "react";
import { Download, IndianRupee, PauseCircle, Search, SlidersHorizontal } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";


function toUtcDateKeyFromParts(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function addDaysToDateKeyUtc(dateKey: string, days: number) {
  const raw = String(dateKey || "").slice(0, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return "";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);
}

type Row = Record<string, any>;

type WindowMetrics = {
  spend: number;
  revenue: number;
  purchases: number;
  cpa: number;
  roas: number;
};

type SuddenStopRow = {
  key: string;
  creative: string;
  adName: string;
  adSet: string;
  campaign: string;
  yesterday: WindowMetrics;
  last7: WindowMetrics;
  last14: WindowMetrics;
  last30: WindowMetrics;
  issue: "Critical Stop" | "Likely Approval Stop" | "Monitor";
  action: string;
  priorityScore: number;
};

type SortDirection = "asc" | "desc";

type SortConfig = {
  key: string;
  direction: SortDirection;
};

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function getNestedValue(row: any, key: string) {
  return key.split(".").reduce((value, part) => value?.[part], row);
}

function toggleSort(current: SortConfig, key: string): SortConfig {
  if (current.key === key) {
    return {
      key,
      direction: current.direction === "asc" ? "desc" : "asc",
    };
  }

  return {
    key,
    direction: "desc",
  };
}

function sortRows(rows: SuddenStopRow[], sort: SortConfig) {
  return [...rows].sort((a, b) => {
    const av = getNestedValue(a, sort.key);
    const bv = getNestedValue(b, sort.key);

    const an = Number(av);
    const bn = Number(bv);

    let result = 0;

    if (!Number.isNaN(an) && !Number.isNaN(bn)) {
      result = an - bn;
    } else {
      result = String(av ?? "").localeCompare(String(bv ?? ""));
    }

    return sort.direction === "asc" ? result : -result;
  });
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: string;
  sort: SortConfig;
  onSort: (key: string) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === sortKey;
  const icon = active ? (sort.direction === "asc" ? "↑" : "↓") : "↕";

  return (
    <th className={align === "right" ? "sudden-stop-th text-right" : "sudden-stop-th"}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={active ? "sudden-stop-sort-btn active" : "sudden-stop-sort-btn"}
        title={`Sort by ${label}`}
      >
        <span>{label}</span>
        <span className="sudden-stop-sort-icon">{icon}</span>
      </button>
    </th>
  );
}

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

  // Inclusive calendar window: L7D ending 2026-06-14 starts 2026-06-08, not 2026-06-07.
  const start = addDaysToDateKeyUtc(end, 1 - days);

  return rows.filter((row) => {
    const d = getDate(row);
    return d >= start && d <= endDate;
  });
}

function getIssue(last7: WindowMetrics, minSpend: number, targetRoas: number, targetCpa: number): SuddenStopRow["issue"] {
  const goodRoas = last7.roas >= targetRoas;
  const goodCpa = last7.purchases > 0 && last7.cpa <= targetCpa;

  if (last7.spend >= minSpend * 3 && (goodRoas || goodCpa)) return "Critical Stop";
  if (last7.spend >= minSpend && (goodRoas || goodCpa)) return "Likely Approval Stop";
  return "Monitor";
}

function getAction(issue: SuddenStopRow["issue"]) {
  if (issue === "Critical Stop") return "Check creator approval / code expiry immediately";
  if (issue === "Likely Approval Stop") return "Verify partnership status before restarting spend";
  return "Monitor delivery and recheck tomorrow";
}

function getPriorityScore(last7: WindowMetrics, last14: WindowMetrics, minSpend: number, targetRoas: number, targetCpa: number) {
  let score = 0;

  score += Math.min(40, safeDiv(last7.spend, Math.max(minSpend, 1)) * 10);

  if (last7.roas >= targetRoas) score += 25;
  if (last7.purchases > 0 && last7.cpa <= targetCpa) score += 25;

  if (last14.spend > 0 && last7.spend / last14.spend >= 0.35) score += 10;

  return Math.round(score);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function exportExcel(rows: SuddenStopRow[]) {
  const headers = [
    "Creative / Video",
    "Ad Name",
    "Campaign",
    "Ad Set",
    "Issue",
    "Action",
    "Priority Score",
    "Yesterday Spend",
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
    row.campaign,
    row.adSet,
    row.issue,
    row.action,
    row.priorityScore,
    Math.round(row.yesterday.spend),
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
      <head><meta charset="UTF-8" /></head>
      <body>
        <table border="1">
          <thead>
            <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${body.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}
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
  a.download = `sudden-stop-approval-check-${dateKey(new Date())}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function SuddenStopTab() {
  const rows = useMetaStore((state) => state.performanceRows);

  const [minLast7Spend, setMinLast7Spend] = useState(10000);
  const [targetRoas, setTargetRoas] = useState(0.8);
  const [targetCpa, setTargetCpa] = useState(1500);
  const [query, setQuery] = useState("");

  const [sort, setSort] = useState<SortConfig>({
    key: "priorityScore",
    direction: "desc",
  });

  const data = useMemo(() => {
    const validRows = rows.filter((row) => getDate(row));
    const latest = validRows.map((row) => getDate(row)).sort().at(-1) || "";

    const grouped = new Map<string, Row[]>();

    validRows.filter(influencerIntent).forEach((row) => {
      const key = `${getCreative(row)}||${getAdName(row)}||${getAdSet(row)}||${getCampaign(row)}`;

      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row);
    });

    const items: SuddenStopRow[] = Array.from(grouped.entries())
      .map(([key, videoRows]) => {
        const yesterdayRows = videoRows.filter((row) => getDate(row) === latest);
        const yesterday = summarize(yesterdayRows);
        const last7 = summarize(windowRows(videoRows, latest, 7));
        const last14 = summarize(windowRows(videoRows, latest, 14));
        const last30 = summarize(windowRows(videoRows, latest, 30));
        const sample = videoRows[0];

        const issue = getIssue(last7, minLast7Spend, targetRoas, targetCpa);

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
          issue,
          action: getAction(issue),
          priorityScore: getPriorityScore(last7, last14, minLast7Spend, targetRoas, targetCpa),
        };
      })
      .filter((item) => item.yesterday.spend === 0)
      .filter((item) => item.last7.spend >= minLast7Spend)
      .filter((item) => item.last7.purchases > 0)
      .filter((item) => item.last7.roas >= targetRoas || item.last7.cpa <= targetCpa)
      .filter((item) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();

        return `${item.creative} ${item.adName} ${item.adSet} ${item.campaign}`.toLowerCase().includes(q);
      });

    return {
      latest,
      items,
      critical: items.filter((x) => x.issue === "Critical Stop").length,
      lost7dSpend: items.reduce((s, x) => s + x.last7.spend, 0),
    };
  }, [rows, minLast7Spend, targetRoas, targetCpa, query]);

  const sortedItems = useMemo(() => sortRows(data.items, sort), [data.items, sort]);

  return (
    <div className="sudden-stop-root grid gap-4">
      <section className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-600 dark:text-red-300">
                Sudden Stop
              </span>
              <span className="rounded-full border border-current/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--meta-text-muted)]">
                Latest {data.latest || "NA"}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-black tracking-[-0.04em]">Good Videos Suddenly Stopped</h1>
            <p className="mt-1 max-w-4xl text-sm text-[var(--meta-text-muted)]">
              Collab / creator videos with exactly ₹0 spend yesterday, but strong recent spend and acceptable CPA/ROAS in the last 7 days. Use this to catch paused partnership ads, creator approval issues, or accidental delivery stops.
            </p>
          </div>

          <button
            type="button"
            onClick={() => exportExcel(sortedItems)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#0A84FF] px-4 text-xs font-black text-white shadow-lg shadow-blue-500/20"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto_auto] xl:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--meta-text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search creator, video, campaign, ad set..."
              className="h-11 w-full rounded-2xl border border-current/10 bg-transparent pl-10 pr-4 text-sm font-semibold text-[var(--meta-text)] outline-none"
            />
          </div>

          <label className="flex h-11 items-center gap-2 rounded-2xl border border-current/10 px-3">
            <SlidersHorizontal className="h-4 w-4 text-[#0A84FF]" />
            <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--meta-text-muted)]">7D Spend</span>
            <IndianRupee className="h-3.5 w-3.5 text-[var(--meta-text-muted)]" />
            <input
              type="number"
              value={minLast7Spend}
              onChange={(e) => setMinLast7Spend(Math.max(0, Number(e.target.value || 0)))}
              className="w-[100px] bg-transparent text-sm font-black text-[var(--meta-text)] outline-none"
            />
          </label>

          <label className="flex h-11 items-center gap-2 rounded-2xl border border-current/10 px-3">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--meta-text-muted)]">Min ROAS</span>
            <input
              type="number"
              step="0.1"
              value={targetRoas}
              onChange={(e) => setTargetRoas(Math.max(0, Number(e.target.value || 0)))}
              className="w-[70px] bg-transparent text-sm font-black text-[var(--meta-text)] outline-none"
            />
          </label>

          <label className="flex h-11 items-center gap-2 rounded-2xl border border-current/10 px-3">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--meta-text-muted)]">Max CPA</span>
            <IndianRupee className="h-3.5 w-3.5 text-[var(--meta-text-muted)]" />
            <input
              type="number"
              value={targetCpa}
              onChange={(e) => setTargetCpa(Math.max(0, Number(e.target.value || 0)))}
              className="w-[90px] bg-transparent text-sm font-black text-[var(--meta-text)] outline-none"
            />
          </label>

          <div className="flex h-11 items-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 px-3">
            <PauseCircle className="h-4 w-4 text-red-600 dark:text-red-300" />
            <span className="text-xs font-black uppercase tracking-[0.12em] text-red-600 dark:text-red-300">Y Spend = ₹0</span>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--meta-text-muted)]">Videos stopped</p>
            <p className="mt-1 text-xl font-black">{data.items.length}</p>
          </div>

          <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--meta-text-muted)]">Critical stops</p>
            <p className="mt-1 text-xl font-black text-red-600 dark:text-red-300">{data.critical}</p>
          </div>

          <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--meta-text-muted)]">Recent 7D spend at risk</p>
            <p className="mt-1 text-xl font-black">{money(data.lost7dSpend)}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <h2 className="text-lg font-black">Stopped High-Potential Videos</h2>
          <p className="mt-1 text-sm text-[var(--meta-text-muted)]">
            Sorted by priority score by default. One line per stopped creator video.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1800px] border-collapse text-left text-xs">
            <thead className="bg-[#14233b] text-white">
              <tr>
                <SortHeader label="Video / Creative" sortKey="creative" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} />
                <SortHeader label="Campaign" sortKey="campaign" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} />
                <SortHeader label="Ad Set" sortKey="adSet" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} />
                <SortHeader label="Issue" sortKey="issue" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} />
                <SortHeader label="Score" sortKey="priorityScore" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <SortHeader label="Y Spend" sortKey="yesterday.spend" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <SortHeader label="7D Spend" sortKey="last7.spend" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <SortHeader label="7D CPA" sortKey="last7.cpa" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <SortHeader label="7D ROAS" sortKey="last7.roas" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <SortHeader label="14D Spend" sortKey="last14.spend" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <SortHeader label="14D CPA" sortKey="last14.cpa" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <SortHeader label="14D ROAS" sortKey="last14.roas" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <SortHeader label="30D Spend" sortKey="last30.spend" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <SortHeader label="30D CPA" sortKey="last30.cpa" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <SortHeader label="30D ROAS" sortKey="last30.roas" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <SortHeader label="Action" sortKey="action" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} />
              </tr>
            </thead>

            <tbody>
              {sortedItems.map((item) => (
                <tr key={item.key} className="border-b border-current/10 hover:bg-current/[0.035]">
                  <td className="sticky left-0 z-10 max-w-[320px] bg-[var(--meta-surface)] px-3 py-2.5">
                    <p className="truncate font-black">{item.creative}</p>
                    <p className="mt-0.5 truncate text-[11px] text-[var(--meta-text-muted)]">{item.adName}</p>
                  </td>

                  <td className="max-w-[240px] px-3 py-2.5">
                    <p className="truncate">{item.campaign}</p>
                  </td>

                  <td className="max-w-[260px] px-3 py-2.5">
                    <p className="truncate">{item.adSet}</p>
                  </td>

                  <td className="px-3 py-2.5">
                    <span
                      className={
                        item.issue === "Critical Stop"
                          ? "rounded-full border border-red-300 bg-red-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
                          : item.issue === "Likely Approval Stop"
                            ? "rounded-full border border-orange-300 bg-orange-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300"
                            : "rounded-full border border-current/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em]"
                      }
                    >
                      {item.issue}
                    </span>
                  </td>

                  <td className="px-3 py-2.5 text-right font-black">{item.priorityScore}</td>
                  <td className="px-3 py-2.5 text-right font-black text-red-600 dark:text-red-300">{money(item.yesterday.spend)}</td>

                  <td className="px-3 py-2.5 text-right font-black">{money(item.last7.spend)}</td>
                  <td className="px-3 py-2.5 text-right">{item.last7.purchases > 0 ? money(item.last7.cpa) : "No sale"}</td>
                  <td className="px-3 py-2.5 text-right font-black text-emerald-600 dark:text-emerald-300">{num(item.last7.roas)}x</td>

                  <td className="px-3 py-2.5 text-right">{money(item.last14.spend)}</td>
                  <td className="px-3 py-2.5 text-right">{item.last14.purchases > 0 ? money(item.last14.cpa) : "No sale"}</td>
                  <td className="px-3 py-2.5 text-right">{num(item.last14.roas)}x</td>

                  <td className="px-3 py-2.5 text-right">{money(item.last30.spend)}</td>
                  <td className="px-3 py-2.5 text-right">{item.last30.purchases > 0 ? money(item.last30.cpa) : "No sale"}</td>
                  <td className="px-3 py-2.5 text-right">{num(item.last30.roas)}x</td>

                  <td className="max-w-[260px] px-3 py-2.5">
                    <p className="truncate font-semibold text-[var(--meta-text-muted)]">{item.action}</p>
                  </td>
                </tr>
              ))}

              {!sortedItems.length ? (
                <tr>
                  <td colSpan={16} className="px-4 py-8 text-center text-sm text-[var(--meta-text-muted)]">
                    No sudden-stop videos found with current thresholds.
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
