"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Filter, TrendingUp } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";

type Row = Record<string, any>;
type QualityFilter = "all" | "efficient_scale" | "bad_scale" | "underfed_winner" | "spend_cut_risk" | "hold";

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number, d = 1) => `${num(Number(n || 0) * 100, d)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function getRowsFromStore(store: any): Row[] {
  return (
    store.rows ||
    store.metaRows ||
    store.rawRows ||
    store.data ||
    store.sheetRows ||
    store.metaData ||
    []
  );
}

function getDate(row: Row) {
  const raw = String(row.date ?? row.day ?? row.Day ?? row.Date ?? row["Reporting starts"] ?? "").trim();
  if (!raw) return "";

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return raw.slice(0, 10);
}

function getAdId(row: Row) {
  return String(row.ad_id ?? row.adId ?? row.Ad_ID ?? row["Ad ID"] ?? row.adName ?? row.ad_name ?? row.Ad_name ?? "").trim();
}

function getAdName(row: Row) {
  return String(row.ad_name ?? row.adName ?? row.Ad_name ?? row["Ad name"] ?? row.Creative_Name_ ?? "Untitled Creative");
}

function getCampaign(row: Row) {
  return String(row.campaign_name ?? row.campaignName ?? row.Campaign_name ?? row["Campaign name"] ?? "Unknown Campaign");
}

function getAdSet(row: Row) {
  return String(row.adset_name ?? row.adSetName ?? row.Ad_set_name ?? row["Ad set name"] ?? "Unknown Ad Set");
}

function getSpend(row: Row) {
  return Number(row.spend ?? row.amountSpent ?? row.amount_spent ?? row.Amount_spent__INR_ ?? row["Amount spent (INR)"] ?? 0);
}

function getRevenue(row: Row) {
  return Number(
    row.revenue ??
      row.purchaseValue ??
      row.purchase_value ??
      row.Purchases_conversion_value ??
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
      row.Link_clicks ??
      row.outboundClicks ??
      row.outbound_clicks ??
      row.Outbound_clicks ??
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
    cpa: safeDiv(spend, purchases),
    roas: safeDiv(revenue, spend),
    aov: safeDiv(revenue, purchases),
    ctr: safeDiv(clicks, impressions),
    cpm: safeDiv(spend * 1000, impressions),
  };
}

function changePct(current: number, previous: number) {
  if (!previous) return 0;
  return (current - previous) / previous;
}

function toneClass(tone: "red" | "green" | "amber" | "neutral") {
  if (tone === "red") return "text-red-600 dark:text-red-300";
  if (tone === "green") return "text-emerald-600 dark:text-emerald-300";
  if (tone === "amber") return "text-orange-600 dark:text-orange-300";
  return "";
}

function verdictLabel(verdict: QualityFilter) {
  if (verdict === "efficient_scale") return "Efficient Scale";
  if (verdict === "bad_scale") return "Bad Scale";
  if (verdict === "underfed_winner") return "Underfed Winner";
  if (verdict === "spend_cut_risk") return "Spend Cut Risk";
  return "Hold";
}

function verdictTone(verdict: QualityFilter): "red" | "green" | "amber" | "neutral" {
  if (verdict === "efficient_scale") return "green";
  if (verdict === "bad_scale") return "red";
  if (verdict === "underfed_winner") return "green";
  if (verdict === "spend_cut_risk") return "amber";
  return "neutral";
}

function buildScaleRows(rows: Row[]) {
  const dates = Array.from(new Set(rows.map(getDate).filter(Boolean))).sort();
  const latestDate = dates[dates.length - 1] || "";
  const last7Dates = new Set(dates.slice(-7));
  const prev7Dates = new Set(dates.slice(-14, -7));

  const activeAdIds = new Set(
    rows
      .filter((row) => getDate(row) === latestDate && getSpend(row) > 0)
      .map(getAdId)
      .filter(Boolean)
  );

  const grouped = new Map<string, Row[]>();

  rows.forEach((row) => {
    const adId = getAdId(row);
    if (!adId || !activeAdIds.has(adId)) return;

    if (!grouped.has(adId)) grouped.set(adId, []);
    grouped.get(adId)!.push(row);
  });

  return Array.from(grouped.entries())
    .map(([adId, adRows]) => {
      const last7 = summarize(adRows.filter((row) => last7Dates.has(getDate(row))));
      const prev7 = summarize(adRows.filter((row) => prev7Dates.has(getDate(row))));
      const lifetime = summarize(adRows);

      const incrementalSpend = last7.spend - prev7.spend;
      const incrementalRevenue = last7.revenue - prev7.revenue;
      const incrementalPurchases = last7.purchases - prev7.purchases;
      const incrementalRoas = safeDiv(incrementalRevenue, incrementalSpend);
      const incrementalCpa = safeDiv(incrementalSpend, incrementalPurchases);

      const spendChange = changePct(last7.spend, prev7.spend);
      const cpaChange = changePct(last7.cpa, prev7.cpa);
      const roasChange = changePct(last7.roas, prev7.roas);
      const purchaseChange = changePct(last7.purchases, prev7.purchases);

      let verdict: QualityFilter = "hold";

      const spendUp = last7.spend > prev7.spend && incrementalSpend > 500;
      const spendDown = last7.spend < prev7.spend && Math.abs(incrementalSpend) > 500;
      const cpaImproved = prev7.cpa > 0 && last7.cpa > 0 && last7.cpa <= prev7.cpa * 0.9;
      const cpaWorse = prev7.cpa > 0 && last7.cpa >= prev7.cpa * 1.15;
      const roasImproved = prev7.roas > 0 && last7.roas >= prev7.roas * 1.1;
      const roasWorse = prev7.roas > 0 && last7.roas <= prev7.roas * 0.85;

      if (spendUp && (cpaImproved || roasImproved)) verdict = "efficient_scale";
      if (spendUp && cpaWorse && roasWorse) verdict = "bad_scale";
      if (!spendUp && last7.spend < 3000 && last7.purchases >= 2 && last7.roas >= 1.2 && last7.cpa <= lifetime.cpa) verdict = "underfed_winner";
      if (spendDown && roasWorse && last7.purchases > 0) verdict = "spend_cut_risk";

      const score =
        Math.abs(incrementalSpend) / 1000 +
        (verdict === "bad_scale" ? 40 : 0) +
        (verdict === "efficient_scale" ? 30 : 0) +
        (verdict === "underfed_winner" ? 25 : 0) +
        (verdict === "spend_cut_risk" ? 20 : 0);

      return {
        key: adId,
        adId,
        adName: getAdName(adRows[0]),
        campaign: getCampaign(adRows[0]),
        adSet: getAdSet(adRows[0]),
        latestDate,
        lifetime,
        last7,
        prev7,
        incrementalSpend,
        incrementalRevenue,
        incrementalPurchases,
        incrementalRoas,
        incrementalCpa,
        spendChange,
        cpaChange,
        roasChange,
        purchaseChange,
        verdict,
        score,
      };
    })
    .filter((item) => item.last7.spend > 0 || item.prev7.spend > 0)
    .sort((a, b) => b.score - a.score);
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "red" | "green" | "amber" | "neutral" }) {
  return (
    <div className="min-w-[86px]">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">{label}</p>
      <p className={`mt-1 text-sm font-black ${toneClass(tone)}`}>{value}</p>
    </div>
  );
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "red" | "green" | "amber" | "neutral" }) {
  return (
    <div className="rounded-xl border border-current/10 bg-current/[0.025] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">{label}</p>
      <p className={`mt-1 text-xl font-black ${toneClass(tone)}`}>{value}</p>
    </div>
  );
}

function Tag({ verdict }: { verdict: QualityFilter }) {
  const tone = verdictTone(verdict);
  const cls =
    tone === "green"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
      : tone === "red"
        ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
        : tone === "amber"
          ? "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300"
          : "border-current/10 bg-current/[0.04]";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${cls}`}>
      {verdictLabel(verdict)}
    </span>
  );
}

function InfoBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-xl border border-current/10 bg-current/[0.025] p-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] opacity-60">{title}</p>
      <ul className="mt-2 space-y-1 text-sm opacity-80">
        {lines.map((line) => (
          <li key={line}>• {line}</li>
        ))}
      </ul>
    </div>
  );
}

export function ScaleQualityTab() {
  const store = useMetaStore() as any;
  const rows = getRowsFromStore(store);
  const [filter, setFilter] = useState<QualityFilter>("all");

  const data = useMemo(() => {
    const items = buildScaleRows(rows);

    return {
      items,
      latest: items[0]?.latestDate || "",
      efficientScale: items.filter((x) => x.verdict === "efficient_scale").length,
      badScale: items.filter((x) => x.verdict === "bad_scale").length,
      underfedWinner: items.filter((x) => x.verdict === "underfed_winner").length,
      spendCutRisk: items.filter((x) => x.verdict === "spend_cut_risk").length,
      incrementalSpend: items.reduce((s, x) => s + x.incrementalSpend, 0),
      incrementalRevenue: items.reduce((s, x) => s + x.incrementalRevenue, 0),
    };
  }, [rows]);

  const visibleItems = useMemo(() => {
    if (filter === "all") return data.items;
    return data.items.filter((x) => x.verdict === filter);
  }, [data.items, filter]);

  const filterButtons: { key: QualityFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: data.items.length },
    { key: "efficient_scale", label: "Efficient Scale", count: data.efficientScale },
    { key: "bad_scale", label: "Bad Scale", count: data.badScale },
    { key: "underfed_winner", label: "Underfed Winner", count: data.underfedWinner },
    { key: "spend_cut_risk", label: "Spend Cut Risk", count: data.spendCutRisk },
    { key: "hold", label: "Hold", count: data.items.filter((x) => x.verdict === "hold").length },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#0A84FF]" />
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0A84FF]">Budget Movement Quality</p>
            </div>
            <h1 className="mt-1 text-2xl font-black">Incremental Scale Quality</h1>
            <p className="mt-1 max-w-4xl text-sm opacity-60">
              Compares Last 7D vs Previous 7D to show whether additional spend created efficient revenue or only raised acquisition cost.
            </p>
          </div>

          <div className="rounded-full border border-current/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] opacity-70">
            Latest {data.latest || "NA"}
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-5">
          <Kpi label="Efficient Scale" value={String(data.efficientScale)} tone={data.efficientScale ? "green" : "neutral"} />
          <Kpi label="Bad Scale" value={String(data.badScale)} tone={data.badScale ? "red" : "green"} />
          <Kpi label="Underfed Winners" value={String(data.underfedWinner)} tone={data.underfedWinner ? "green" : "neutral"} />
          <Kpi label="Incremental Spend" value={money(data.incrementalSpend)} tone={data.incrementalSpend > 0 ? "amber" : "neutral"} />
          <Kpi label="Incremental Revenue" value={money(data.incrementalRevenue)} tone={data.incrementalRevenue >= 0 ? "green" : "red"} />
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#0A84FF]" />
          <h2 className="text-lg font-black">Scale Quality Filters</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {filterButtons.map((button) => (
            <button
              key={button.key}
              type="button"
              onClick={() => setFilter(button.key)}
              className={
                filter === button.key
                  ? "rounded-full bg-[#0A84FF] px-3 py-1.5 text-xs font-black text-white"
                  : "rounded-full border border-current/10 px-3 py-1.5 text-xs font-black"
              }
            >
              {button.label} · {button.count}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <h2 className="text-lg font-black">Scale Quality Action Queue</h2>
          <p className="mt-1 text-sm opacity-60">
            Shows active creatives where budget movement created a clear efficiency signal.
          </p>
        </div>

        <div className="divide-y divide-current/10">
          {visibleItems.map((item) => (
            <details key={item.key} className="group">
              <summary className="creative-summary-row cursor-pointer list-none px-4 py-3 text-xs hover:bg-current/[0.035]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag verdict={item.verdict} />
                  </div>

                  <p className="mt-2 truncate text-sm font-black">{item.adName}</p>
                  <p className="mt-0.5 truncate opacity-60">
                    {item.campaign} · {item.adSet}
                  </p>
                </div>

                <Metric label="Prev 7D Spend" value={money(item.prev7.spend)} />
                <Metric label="Last 7D Spend" value={money(item.last7.spend)} />
                <Metric label="Incr. Spend" value={money(item.incrementalSpend)} tone={item.incrementalSpend > 0 ? "amber" : "neutral"} />
                <Metric label="Prev CPA" value={item.prev7.purchases > 0 ? money(item.prev7.cpa) : "No sale"} />
                <Metric label="Last CPA" value={item.last7.purchases > 0 ? money(item.last7.cpa) : "No sale"} tone={item.cpaChange > 0 ? "red" : "green"} />
                <Metric label="Prev ROAS" value={`${num(item.prev7.roas)}x`} />
                <Metric label="Last ROAS" value={`${num(item.last7.roas)}x`} tone={item.roasChange >= 0 ? "green" : "red"} />
                <Metric label="Incr. ROAS" value={`${num(item.incrementalRoas)}x`} tone={item.incrementalRoas >= item.last7.roas ? "green" : "red"} />

                <ChevronDown className="h-4 w-4 opacity-45 transition group-open:rotate-180" />
              </summary>

              <div className="grid gap-3 px-4 pb-4 lg:grid-cols-3">
                <InfoBox
                  title="What Changed"
                  lines={[
                    `Spend moved from ${money(item.prev7.spend)} to ${money(item.last7.spend)} (${pct(item.spendChange)}).`,
                    `Revenue moved from ${money(item.prev7.revenue)} to ${money(item.last7.revenue)}.`,
                    `Purchases moved from ${num(item.prev7.purchases, 0)} to ${num(item.last7.purchases, 0)} (${pct(item.purchaseChange)}).`,
                  ]}
                />

                <InfoBox
                  title="Efficiency Read"
                  lines={[
                    `CPA moved from ${item.prev7.purchases > 0 ? money(item.prev7.cpa) : "No sale"} to ${item.last7.purchases > 0 ? money(item.last7.cpa) : "No sale"} (${pct(item.cpaChange)}).`,
                    `ROAS moved from ${num(item.prev7.roas)}x to ${num(item.last7.roas)}x (${pct(item.roasChange)}).`,
                    `Incremental ROAS on added spend: ${num(item.incrementalRoas)}x.`,
                  ]}
                />

                <InfoBox
                  title="Recommended Action"
                  lines={[
                    item.verdict === "efficient_scale" ? "Eligible for cautious budget increase." : "",
                    item.verdict === "bad_scale" ? "Stop increasing budget. Reduce or refresh." : "",
                    item.verdict === "underfed_winner" ? "Consider giving more budget/testing extraction into control." : "",
                    item.verdict === "spend_cut_risk" ? "Investigate why spend was cut while performance also weakened." : "",
                    item.verdict === "hold" ? "No strong scale signal. Keep monitoring." : "",
                  ].filter(Boolean)}
                />
              </div>
            </details>
          ))}

          {!visibleItems.length ? (
            <div className="p-5">
              <p className="font-black">No creatives found for this scale quality filter.</p>
              <p className="mt-1 text-sm opacity-60">
                Try checking All, or wait for more spend in the current 7D window.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
