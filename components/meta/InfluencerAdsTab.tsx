"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Download, IndianRupee, Search, SlidersHorizontal } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";

type Row = Record<string, any>;

type WindowMetrics = {
  spend: number;
  revenue: number;
  purchases: number;
  cpa: number;
  roas: number;
};

type InfluencerRisk = "Top Spender" | "Approval Check" | "Monitor";

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
  risk: InfluencerRisk;
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

function sortRows(rows: InfluencerVideoRow[], sort: SortConfig) {
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
    <th className={align === "right" ? "infv2-th text-right" : "infv2-th"}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={active ? "infv2-sort active" : "infv2-sort"}
        title={`Sort by ${label}`}
      >
        <span>{label}</span>
        <span className="infv2-sort-icon">{icon}</span>
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
    "Campaign",
    "Ad Set",
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
    row.campaign,
    row.adSet,
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
  a.download = `influencer-ads-approval-queue-${dateKey(new Date())}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function InfluencerAdsTab() {
  const rows = useMetaStore((state) => state.performanceRows);
  const [threshold, setThreshold] = useState(5000);
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [sort, setSort] = useState<SortConfig>({
    key: "yesterday.spend",
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

    const items: InfluencerVideoRow[] = Array.from(grouped.entries())
      .map(([key, videoRows]) => {
        const yesterdayRows = videoRows.filter((row) => getDate(row) === latest);
        const yesterday = summarize(yesterdayRows);
        const last7 = summarize(windowRows(videoRows, latest, 7));
        const last14 = summarize(windowRows(videoRows, latest, 14));
        const last30 = summarize(windowRows(videoRows, latest, 30));
        const sample = videoRows[0];

        const risk: InfluencerRisk =
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
      });

    return {
      latest,
      items,
      totalYesterdaySpend: items.reduce((s, x) => s + x.yesterday.spend, 0),
      topSpenders: items.filter((x) => x.yesterday.spend >= 25000).length,
    };
  }, [rows, threshold, query]);

  const sortedItems = useMemo(() => sortRows(data.items, sort), [data.items, sort]);

  return (
    <div className="infv2-root grid gap-4">
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

            <h1 className="mt-3 text-2xl font-black tracking-[-0.04em]">
              Influencer Ads Approval Queue
            </h1>
            <p className="mt-1 max-w-4xl text-sm text-[var(--meta-text-muted)]">
              Active collab / creator videos spending yesterday. Main table shows current action metrics. Expand any row for full 14D/30D context.
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
              ₹25K+ Top
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
        <div className="flex flex-col gap-2 border-b border-current/10 px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-black">Active Influencer Videos</h2>
            <p className="mt-1 text-sm text-[var(--meta-text-muted)]">
              Approval queue for active creator videos. Campaign and ad set are shown below the video name; export keeps the full details.
            </p>
          </div>

          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--meta-text-muted)]">
            Main: yesterday + 7D · Expand: 14D + 30D
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="infv3-table">
            <thead>
              <tr>
                <SortHeader label="Video / Creator" sortKey="creative" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} />
                <SortHeader label="Risk" sortKey="risk" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} />
                <SortHeader label="Y Spend" sortKey="yesterday.spend" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <SortHeader label="Y CPA" sortKey="yesterday.cpa" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <SortHeader label="Y ROAS" sortKey="yesterday.roas" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <SortHeader label="7D Spend" sortKey="last7.spend" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <SortHeader label="7D CPA" sortKey="last7.cpa" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <SortHeader label="7D ROAS" sortKey="last7.roas" sort={sort} onSort={(key) => setSort((current) => toggleSort(current, key))} align="right" />
                <th className="infv3-th text-center">More</th>
              </tr>
            </thead>

            <tbody>
              {sortedItems.map((item) => {
                const isOpen = openKey === item.key;

                return (
                  <>
                    <tr key={item.key} className={isOpen ? "infv3-row open" : "infv3-row"}>
                      <td className="infv3-video">
                        <p className="truncate text-[13px] font-black">{item.creative}</p>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--meta-text-muted)]">{item.adName}</p>
                        <p className="mt-1 truncate text-[11px] text-[var(--meta-text-faint)]">
                          {item.campaign} · {item.adSet}
                        </p>
                      </td>

                      <td>
                        <span
                          className={
                            item.risk === "Top Spender"
                              ? "infv3-risk top"
                              : item.risk === "Approval Check"
                                ? "infv3-risk approval"
                                : "infv3-risk"
                          }
                        >
                          {item.risk}
                        </span>
                      </td>

                      <td className="text-right font-black">{money(item.yesterday.spend)}</td>
                      <td className="text-right font-black text-red-600 dark:text-red-300">
                        {item.yesterday.purchases > 0 ? money(item.yesterday.cpa) : "No sale"}
                      </td>
                      <td className="text-right font-black text-emerald-600 dark:text-emerald-300">{num(item.yesterday.roas)}x</td>

                      <td className="text-right">{money(item.last7.spend)}</td>
                      <td className="text-right">{item.last7.purchases > 0 ? money(item.last7.cpa) : "No sale"}</td>
                      <td className="text-right">{num(item.last7.roas)}x</td>

                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => setOpenKey(isOpen ? null : item.key)}
                          className="infv3-more"
                          title="Open full details"
                        >
                          <ChevronDown className={isOpen ? "h-4 w-4 rotate-180 transition" : "h-4 w-4 transition"} />
                        </button>
                      </td>
                    </tr>

                    {isOpen ? (
                      <tr key={`${item.key}-details`} className="infv3-detail-row">
                        <td colSpan={9}>
                          <div className="infv3-detail-grid">
                            <div className="infv3-detail-card infv3-detail-wide">
                              <p className="infv3-detail-title">Full placement context</p>
                              <p><strong>Campaign:</strong> {item.campaign}</p>
                              <p><strong>Ad Set:</strong> {item.adSet}</p>
                              <p><strong>Ad:</strong> {item.adName}</p>
                              <p><strong>Creative:</strong> {item.creative}</p>
                            </div>

                            <div className="infv3-detail-card">
                              <p className="infv3-detail-title">14D performance</p>
                              <p><strong>Spend:</strong> {money(item.last14.spend)}</p>
                              <p><strong>CPA:</strong> {item.last14.purchases > 0 ? money(item.last14.cpa) : "No sale"}</p>
                              <p><strong>ROAS:</strong> {num(item.last14.roas)}x</p>
                              <p><strong>Purchases:</strong> {num(item.last14.purchases, 0)}</p>
                            </div>

                            <div className="infv3-detail-card">
                              <p className="infv3-detail-title">30D performance</p>
                              <p><strong>Spend:</strong> {money(item.last30.spend)}</p>
                              <p><strong>CPA:</strong> {item.last30.purchases > 0 ? money(item.last30.cpa) : "No sale"}</p>
                              <p><strong>ROAS:</strong> {num(item.last30.roas)}x</p>
                              <p><strong>Purchases:</strong> {num(item.last30.purchases, 0)}</p>
                            </div>

                            <div className="infv3-detail-card">
                              <p className="infv3-detail-title">Operator action</p>
                              <p>
                                {item.risk === "Top Spender"
                                  ? "High daily spend. Confirm creator approval, coupon/code validity, and whitelisting status today."
                                  : item.risk === "Approval Check"
                                    ? "Check if collaboration approval/code is still valid before increasing spend."
                                    : "Monitor. No immediate approval risk unless spend increases."}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </>
                );
              })}

              {!sortedItems.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-[var(--meta-text-muted)]">
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
