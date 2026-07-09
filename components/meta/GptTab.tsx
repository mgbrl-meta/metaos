"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Copy,
  IndianRupee,
  SlidersHorizontal,
  TrendingDown,
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

  // Google Sheet serial date support.
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

function getAdId(row: Row) {
  return String(
    row.adId ??
      row.ad_id ??
      row["Ad ID"] ??
      row.adName ??
      row.ad_name ??
      row["Ad name"] ??
      "unknown"
  );
}

function getAdName(row: Row) {
  return String(row.adName ?? row.ad_name ?? row["Ad name"] ?? row["Ad Name"] ?? "Unknown Ad");
}

function getCampaign(row: Row) {
  return String(row.campaignName ?? row.campaign_name ?? row["Campaign name"] ?? row["Campaign Name"] ?? "Unknown Campaign");
}

function getAdSet(row: Row) {
  return String(row.adSetName ?? row.adsetName ?? row.adset_name ?? row["Ad set name"] ?? row["Ad Set Name"] ?? "Unknown Ad Set");
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

function getImpressions(row: Row) {
  return toNumber(row.impressions ?? row.Impressions);
}

function getClicks(row: Row) {
  return toNumber(row.linkClicks ?? row.link_clicks ?? row.clicks ?? row["Link clicks"] ?? row["Clicks (all)"]);
}

function summarize(rows: Row[]) {
  const spend = rows.reduce((s, row) => s + getSpend(row), 0);
  const revenue = rows.reduce((s, row) => s + getRevenue(row), 0);
  const purchases = rows.reduce((s, row) => s + getPurchases(row), 0);
  const impressions = rows.reduce((s, row) => s + getImpressions(row), 0);
  const clicks = rows.reduce((s, row) => s + getClicks(row), 0);

  const aov = safeDiv(revenue, purchases);
  const cpa = safeDiv(spend, purchases);
  const gpt = purchases > 0 ? aov - cpa : 0;

  return {
    spend,
    revenue,
    purchases,
    impressions,
    clicks,
    aov,
    cpa,
    gpt,
    roas: safeDiv(revenue, spend),
    cpm: safeDiv(spend * 1000, impressions),
    ctr: safeDiv(clicks, impressions) * 100,
    cvr: safeDiv(purchases, clicks) * 100,
  };
}

function handleOnly(adName: string) {
  return String(adName || "")
    .split(" - ")[0]
    .replace(/[|·,\s]+$/g, "")
    .trim();
}

async function copyText(values: string[]) {
  const deduped = Array.from(new Set(values.map((v) => String(v || "").trim()).filter(Boolean)));
  const text = deduped.join("\r\n");
  if (!text) return 0;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  return deduped.length;
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
  const toneClass =
    tone === "red"
      ? "text-red-600 dark:text-red-300"
      : tone === "green"
        ? "text-emerald-600 dark:text-emerald-300"
        : tone === "blue"
          ? "text-[#0A84FF]"
          : tone === "orange"
            ? "text-orange-600 dark:text-orange-300"
            : "";

  return (
    <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">{label}</p>
      <p className={`mt-2 text-2xl font-black tracking-[-0.04em] ${toneClass}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs opacity-60">{sub}</p> : null}
    </div>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "red" | "green" | "blue" | "orange" | "neutral" }) {
  const toneClass =
    tone === "red"
      ? "text-red-600 dark:text-red-300"
      : tone === "green"
        ? "text-emerald-600 dark:text-emerald-300"
        : tone === "blue"
          ? "text-[#0A84FF]"
          : tone === "orange"
            ? "text-orange-600 dark:text-orange-300"
            : "";

  return (
    <div className="min-w-[86px]">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-50">{label}</p>
      <p className={`mt-1 text-xs font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function buildGptItems(rows: Row[], gptThreshold: number) {
  const validRows = rows.filter((row) => getDate(row));
  const dates = Array.from(new Set(validRows.map(getDate).filter(Boolean))).sort();
  const latest = dates[dates.length - 1] || "";

  const l7Start = addDaysToDateKeyUtc(latest, -6);
  const l7End = latest;

  const activeIds = new Set(
    validRows
      .filter((row) => getDate(row) === latest)
      .filter((row) => getSpend(row) > 0)
      .map(getAdId)
  );

  const campaignRowsMap = new Map<string, Row[]>();
  const adRowsMap = new Map<string, Row[]>();

  for (const row of validRows) {
    const adId = getAdId(row);
    if (!activeIds.has(adId)) continue;

    const campaign = getCampaign(row);

    if (!campaignRowsMap.has(campaign)) campaignRowsMap.set(campaign, []);
    campaignRowsMap.get(campaign)!.push(row);

    if (!adRowsMap.has(adId)) adRowsMap.set(adId, []);
    adRowsMap.get(adId)!.push(row);
  }

  const campaignMetrics = new Map<string, ReturnType<typeof summarize>>();

  for (const [campaign, campaignRows] of campaignRowsMap.entries()) {
    campaignMetrics.set(campaign, summarize(campaignRows));
  }

  const items = Array.from(adRowsMap.entries())
    .map(([key, adRows]) => {
      const sample = adRows[0];
      const campaign = getCampaign(sample);
      const lifetime = summarize(adRows);
      const last7 = summarize(adRows.filter((row) => isDateInWindow(getDate(row), l7Start, l7End)));
      const yesterday = summarize(adRows.filter((row) => getDate(row) === latest));
      const campaignAvg = campaignMetrics.get(campaign) || summarize([]);

      const cpaAboveCampaign = lifetime.purchases > 0 && campaignAvg.purchases > 0 && lifetime.cpa > campaignAvg.cpa;
      const gptBelowCampaign = lifetime.purchases > 0 && campaignAvg.purchases > 0 && lifetime.gpt < campaignAvg.gpt;
      const gptBelowTarget = lifetime.purchases > 0 && lifetime.gpt < gptThreshold;

      return {
        key,
        ad: getAdName(sample),
        campaign,
        adSet: getAdSet(sample),
        lifetime,
        last7,
        yesterday,
        campaignAvg,
        cpaAboveCampaign,
        gptBelowCampaign,
        gptBelowTarget,
      };
    })
    .filter((item) => item.yesterday.spend > 0)
    .filter((item) => item.lifetime.purchases > 0)
    .filter((item) => item.cpaAboveCampaign)
    .filter((item) => item.gptBelowCampaign)
    .filter((item) => item.gptBelowTarget)
    .sort((a, b) => a.lifetime.gpt - b.lifetime.gpt || b.yesterday.spend - a.yesterday.spend);

  return {
    latest,
    l7Start,
    l7End,
    items,
    totalSpend: items.reduce((s, item) => s + item.lifetime.spend, 0),
    yesterdaySpend: items.reduce((s, item) => s + item.yesterday.spend, 0),
    avgGpt: safeDiv(items.reduce((s, item) => s + item.lifetime.gpt * item.lifetime.purchases, 0), items.reduce((s, item) => s + item.lifetime.purchases, 0)),
  };
}

export function GptTab() {
  const rows = useMetaStore((state) => state.performanceRows as MetaPerformanceRow[]);
  const [gptThreshold, setGptThreshold] = useState(100);
  const [copied, setCopied] = useState("");

  const data = useMemo(() => {
    const liveRows = onlyLiveRows(rows || []) as unknown as Row[];
    return buildGptItems(liveRows, gptThreshold);
  }, [rows, gptThreshold]);

  async function copyGptHandles() {
    const count = await copyText(data.items.map((item) => handleOnly(item.ad)));
    setCopied(count ? `Copied ${count} handles` : "No GPT ads found");
    window.setTimeout(() => setCopied(""), 2200);
  }

  async function copyGptFullNames() {
    const count = await copyText(data.items.map((item) => item.ad));
    setCopied(count ? `Copied ${count} ad names` : "No GPT ads found");
    window.setTimeout(() => setCopied(""), 2200);
  }

  return (
    <div className="gpt-tab-root grid gap-4">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0A84FF]/30 bg-[#0A84FF]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A84FF]">
                <IndianRupee className="h-3.5 w-3.5" />
                GPT
              </span>
              <span className="rounded-full border border-current/10 bg-current/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-60">
                Latest: {data.latest || "—"}
              </span>
              <span className="rounded-full border border-current/10 bg-current/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-60">
                L7D: {data.l7Start || "—"} → {data.l7End || "—"}
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-black">GPT Control</h1>
            <p className="mt-1 max-w-4xl text-sm opacity-60">
              GPT = AOV − Cost Per Result. AOV is calculated as Purchase Conversion Value ÷ Purchases. This tab flags active ads where CPA is above campaign average and GPT is below campaign average and below your target GPT.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {copied ? (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-300">
                {copied}
              </span>
            ) : null}

            <button
              type="button"
              onClick={copyGptHandles}
              className="rounded-full bg-[#0A84FF] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-white"
            >
              Copy Handles
            </button>

            <button
              type="button"
              onClick={copyGptFullNames}
              className="rounded-full border border-current/10 bg-current/[0.035] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em]"
            >
              Full Names
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#0A84FF]" />
            <div>
              <h2 className="text-lg font-black">Dynamic GPT Threshold</h2>
              <p className="text-sm opacity-60">
                Show active ads where GPT is below this value, while also underperforming their campaign average.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[-500, 0, 100, 250, 500].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setGptThreshold(value)}
                className={
                  gptThreshold === value
                    ? "rounded-full bg-[#0A84FF] px-3 py-1.5 text-xs font-black text-white"
                    : "rounded-full border border-current/10 px-3 py-1.5 text-xs font-black"
                }
              >
                {money(value)}
              </button>
            ))}

            <input
              type="number"
              value={gptThreshold}
              onChange={(e) => setGptThreshold(Number(e.target.value || 0))}
              className="w-[130px] rounded-full border border-current/10 bg-transparent px-3 py-1.5 text-xs font-black outline-none"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Kpi label="GPT Risk Ads" value={String(data.items.length)} tone={data.items.length ? "red" : "green"} />
        <Kpi label="Lifetime Spend at Risk" value={money(data.totalSpend)} tone={data.totalSpend > 0 ? "red" : "green"} />
        <Kpi label="Yesterday Spend" value={money(data.yesterdaySpend)} tone="blue" />
        <Kpi label="Weighted Avg GPT" value={money(data.avgGpt)} tone={data.avgGpt < gptThreshold ? "red" : "green"} />
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-4 w-4 text-red-500" />
            <div>
              <h2 className="text-lg font-black">GPT Risk Creatives</h2>
              <p className="mt-1 text-sm opacity-60">
                Active ads where ad CPA is above campaign average and ad GPT is below campaign average and below {money(gptThreshold)}.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-current/10">
          {data.items.map((item) => (
            <details key={item.key} className="group">
              <summary className="creative-summary-row cursor-pointer list-none px-4 py-3 text-xs hover:bg-current/[0.035]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                      GPT Risk
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

                <Metric label="AOV" value={money(item.lifetime.aov)} />
                <Metric label="CPA" value={money(item.lifetime.cpa)} tone="red" />
                <Metric label="GPT" value={money(item.lifetime.gpt)} tone={item.lifetime.gpt < gptThreshold ? "red" : "orange"} />
                <Metric label="Campaign CPA" value={money(item.campaignAvg.cpa)} />
                <Metric label="Campaign GPT" value={money(item.campaignAvg.gpt)} />
                <Metric label="ROAS" value={`${num(item.lifetime.roas)}x`} tone={item.lifetime.roas >= 1 ? "green" : "red"} />
                <Metric label="L7D GPT" value={money(item.last7.gpt)} tone={item.last7.gpt >= item.lifetime.gpt ? "green" : "red"} />
                <ChevronDown className="h-4 w-4 opacity-45 transition group-open:rotate-180" />
              </summary>

              <div className="grid gap-3 px-4 pb-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
                  <h3 className="text-sm font-black">GPT Formula</h3>
                  <div className="mt-3 grid gap-2 text-xs opacity-80">
                    <p>Purchase Conversion Value: <span className="font-black">{money(item.lifetime.revenue)}</span></p>
                    <p>Purchases: <span className="font-black">{num(item.lifetime.purchases, 0)}</span></p>
                    <p>AOV = Revenue ÷ Purchases: <span className="font-black">{money(item.lifetime.aov)}</span></p>
                    <p>CPA = Spend ÷ Purchases: <span className="font-black">{money(item.lifetime.cpa)}</span></p>
                    <p className="font-black">GPT = AOV − CPA: {money(item.lifetime.gpt)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
                  <h3 className="text-sm font-black">Campaign Benchmark</h3>
                  <div className="mt-3 grid gap-2 text-xs opacity-80">
                    <p>Ad CPA: <span className="font-black text-red-600 dark:text-red-300">{money(item.lifetime.cpa)}</span></p>
                    <p>Campaign Avg CPA: <span className="font-black">{money(item.campaignAvg.cpa)}</span></p>
                    <p>Ad GPT: <span className="font-black text-red-600 dark:text-red-300">{money(item.lifetime.gpt)}</span></p>
                    <p>Campaign Avg GPT: <span className="font-black">{money(item.campaignAvg.gpt)}</span></p>
                  </div>
                </div>

                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                  <h3 className="text-sm font-black text-red-600 dark:text-red-300">Why This Is Flagged</h3>
                  <div className="mt-3 grid gap-2 text-xs opacity-80">
                    <p>CPA is above campaign average.</p>
                    <p>GPT is below campaign average.</p>
                    <p>GPT is below your selected target of {money(gptThreshold)}.</p>
                    <p>Review offer, AOV path, creator quality, and spend continuation.</p>
                  </div>
                </div>
              </div>
            </details>
          ))}

          {!data.items.length ? (
            <div className="p-5">
              <p className="font-black">No GPT risk ads found.</p>
              <p className="mt-1 text-sm opacity-60">Try increasing the GPT threshold or check if active ads are above campaign benchmarks.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
