"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Sparkles,
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
 * Do not replace this with local-time date math.
 * L7D ending 2026-06-14 must start 2026-06-08, not 2026-06-07.
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
      row["Purchase conversion value"]
  );
}

function getPurchases(row: Row) {
  return toNumber(row.purchases ?? row.Purchases ?? row.results ?? row.Results);
}

function getImpressions(row: Row) {
  return toNumber(row.impressions ?? row.Impressions);
}

function getReach(row: Row) {
  return toNumber(row.reach ?? row.Reach);
}

function getClicks(row: Row) {
  return toNumber(row.linkClicks ?? row.link_clicks ?? row.clicks ?? row["Link clicks"] ?? row["Clicks (all)"]);
}

function getVideo3s(row: Row) {
  return toNumber(
    row.video3SecondViews ??
      row.video_3_sec_views ??
      row.threeSecondVideoViews ??
      row["3-second video plays"] ??
      row["3-second video views"] ??
      row["Video plays at 3 seconds"] ??
      row["ThruPlays"]
  );
}

function summarize(rows: Row[]) {
  const spend = rows.reduce((s, row) => s + getSpend(row), 0);
  const revenue = rows.reduce((s, row) => s + getRevenue(row), 0);
  const purchases = rows.reduce((s, row) => s + getPurchases(row), 0);
  const impressions = rows.reduce((s, row) => s + getImpressions(row), 0);
  const reach = rows.reduce((s, row) => s + getReach(row), 0);
  const clicks = rows.reduce((s, row) => s + getClicks(row), 0);
  const video3s = rows.reduce((s, row) => s + getVideo3s(row), 0);

  return {
    spend,
    revenue,
    purchases,
    impressions,
    reach,
    clicks,
    video3s,
    cpm: safeDiv(spend * 1000, impressions),
    ctr: safeDiv(clicks, impressions) * 100,
    cvr: safeDiv(purchases, clicks) * 100,
    cpa: safeDiv(spend, purchases),
    roas: safeDiv(revenue, spend),
    frequency: safeDiv(impressions, reach),
    thumbstop: safeDiv(video3s, impressions) * 100,
  };
}

function changePct(current: number, previous: number) {
  if (!previous || previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
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

function SignalPill({ active, label, value }: { active: boolean; label: string; value: string }) {
  return (
    <span
      className={
        active
          ? "rounded-full border border-red-500/25 bg-red-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-red-600 dark:text-red-300"
          : "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-300"
      }
    >
      {label}: {value}
    </span>
  );
}

function Kpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "red" | "green" | "blue" | "neutral";
}) {
  const toneClass =
    tone === "red"
      ? "text-red-600 dark:text-red-300"
      : tone === "green"
        ? "text-emerald-600 dark:text-emerald-300"
        : tone === "blue"
          ? "text-[#0A84FF]"
          : "";

  return (
    <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">{label}</p>
      <p className={`mt-2 text-2xl font-black tracking-[-0.04em] ${toneClass}`}>{value}</p>
    </div>
  );
}

export function CreativeTab() {
  const rows = useMetaStore((state) => state.performanceRows as MetaPerformanceRow[]);
  const [minSignals, setMinSignals] = useState(2);
  const [copied, setCopied] = useState("");

  const data = useMemo(() => {
    const liveRows = onlyLiveRows(rows || []) as unknown as Row[];
    const validRows = liveRows.filter((row) => getDate(row));
    const dates = Array.from(new Set(validRows.map(getDate).filter(Boolean))).sort();
    const latest = dates[dates.length - 1] || "";

    const l7Start = addDaysToDateKeyUtc(latest, -6);
    const l7End = latest;
    const prev7Start = addDaysToDateKeyUtc(latest, -13);
    const prev7End = addDaysToDateKeyUtc(latest, -7);

    const activeIds = new Set(
      validRows
        .filter((row) => getDate(row) === latest)
        .filter((row) => getSpend(row) > 0)
        .map(getAdId)
    );

    const map = new Map<string, Row[]>();

    for (const row of validRows) {
      const key = getAdId(row);
      if (!activeIds.has(key)) continue;

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }

    const items = Array.from(map.entries())
      .map(([key, adRows]) => {
        const sample = adRows[0];
        const current = summarize(adRows.filter((row) => isDateInWindow(getDate(row), l7Start, l7End)));
        const previous = summarize(adRows.filter((row) => isDateInWindow(getDate(row), prev7Start, prev7End)));
        const yesterday = summarize(adRows.filter((row) => getDate(row) === latest));

        const cpmChange = changePct(current.cpm, previous.cpm);
        const ctrChange = changePct(current.ctr, previous.ctr);

        const cpmFatigue = previous.cpm > 0 && cpmChange >= 20;
        const ctrFatigue = previous.ctr > 0 && ctrChange <= -15;
        const thumbstopFatigue = current.impressions > 0 && current.thumbstop > 0 && current.thumbstop < 25;
        const frequencyFatigue = current.frequency > 3;

        const signalCount = [cpmFatigue, ctrFatigue, thumbstopFatigue, frequencyFatigue].filter(Boolean).length;

        return {
          key,
          ad: getAdName(sample),
          campaign: getCampaign(sample),
          adSet: getAdSet(sample),
          current,
          previous,
          yesterday,
          cpmChange,
          ctrChange,
          cpmFatigue,
          ctrFatigue,
          thumbstopFatigue,
          frequencyFatigue,
          signalCount,
        };
      })
      .filter((item) => item.current.spend > 0)
      .sort((a, b) => b.signalCount - a.signalCount || b.current.spend - a.current.spend);

    const fatigued = items.filter((item) => item.signalCount >= minSignals);
    const highRisk = items.filter((item) => item.signalCount >= 3);
    const monitored = items.filter((item) => item.signalCount > 0 && item.signalCount < minSignals);

    return {
      latest,
      l7Start,
      l7End,
      prev7Start,
      prev7End,
      items,
      fatigued,
      highRisk,
      monitored,
      totalSpend: fatigued.reduce((s, x) => s + x.current.spend, 0),
    };
  }, [rows, minSignals]);

  async function copyFatigueHandles() {
    const count = await copyText(data.fatigued.map((item) => handleOnly(item.ad)));
    setCopied(count ? `Copied ${count} handles` : "No fatigue ads found");
    window.setTimeout(() => setCopied(""), 2200);
  }

  async function copyFatigueFullNames() {
    const count = await copyText(data.fatigued.map((item) => item.ad));
    setCopied(count ? `Copied ${count} ad names` : "No fatigue ads found");
    window.setTimeout(() => setCopied(""), 2200);
  }

  return (
    <div className="creative-fatigue-tab-root grid gap-4">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0A84FF]/30 bg-[#0A84FF]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A84FF]">
                <Sparkles className="h-3.5 w-3.5" />
                Creative
              </span>
              <span className="rounded-full border border-current/10 bg-current/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-60">
                L7D: {data.l7Start || "—"} → {data.l7End || "—"}
              </span>
              <span className="rounded-full border border-current/10 bg-current/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-60">
                Prev7D: {data.prev7Start || "—"} → {data.prev7End || "—"}
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-black">Creative Fatigue Control</h1>
            <p className="mt-1 max-w-4xl text-sm opacity-60">
              Flags active creatives where CPM is up 20% WoW, CTR is down 15% WoW, thumbstop is below 25%, or frequency is above 3.0.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMinSignals(value)}
                className={
                  minSignals === value
                    ? "rounded-full bg-[#0A84FF] px-3 py-1.5 text-xs font-black text-white"
                    : "rounded-full border border-current/10 px-3 py-1.5 text-xs font-black opacity-70"
                }
              >
                {value}+ Signals
              </button>
            ))}

            {copied ? (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-300">
                {copied}
              </span>
            ) : null}

            <button
              type="button"
              onClick={copyFatigueHandles}
              className="rounded-full bg-[#0A84FF] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-white"
            >
              Copy Handles
            </button>

            <button
              type="button"
              onClick={copyFatigueFullNames}
              className="rounded-full border border-current/10 bg-current/[0.035] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em]"
            >
              Full Names
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Kpi label="Fatigue candidates" value={String(data.fatigued.length)} tone={data.fatigued.length ? "red" : "green"} />
        <Kpi label="High risk 3+ signals" value={String(data.highRisk.length)} tone={data.highRisk.length ? "red" : "green"} />
        <Kpi label="Watchlist below filter" value={String(data.monitored.length)} tone="blue" />
        <Kpi label="Fatigued L7D spend" value={money(data.totalSpend)} tone={data.totalSpend > 0 ? "red" : "green"} />
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-4 w-4 text-red-500" />
            <div>
              <h2 className="text-lg font-black">Creative Fatigue Candidates</h2>
              <p className="mt-1 text-sm opacity-60">
                Showing active creatives with at least {minSignals} fatigue signal{minSignals > 1 ? "s" : ""}.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-current/10">
          {data.fatigued.map((item) => (
            <div key={item.key} className="grid gap-3 px-4 py-3 text-xs xl:grid-cols-[1.2fr_0.9fr_1.4fr]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      item.signalCount >= 3
                        ? "rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-red-600 dark:text-red-300"
                        : "rounded-full border border-orange-500/25 bg-orange-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-orange-600 dark:text-orange-300"
                    }
                  >
                    {item.signalCount} Fatigue Signal{item.signalCount > 1 ? "s" : ""}
                  </span>

                  {item.signalCount >= 3 ? (
                    <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-red-600 dark:text-red-300">
                      Refresh Priority
                    </span>
                  ) : (
                    <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-orange-600 dark:text-orange-300">
                      Watch
                    </span>
                  )}
                </div>

                <p className="mt-1 truncate text-sm font-black">{item.ad}</p>
                <p className="mt-0.5 truncate opacity-60">{item.campaign} · {item.adSet}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.13em] opacity-55">L7D Spend</p>
                  <p className="mt-1 font-black">{money(item.current.spend)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.13em] opacity-55">CPA</p>
                  <p className="mt-1 font-black">{item.current.purchases > 0 ? money(item.current.cpa) : "No sale"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.13em] opacity-55">ROAS</p>
                  <p className={item.current.roas >= 1 ? "mt-1 font-black text-emerald-600 dark:text-emerald-300" : "mt-1 font-black text-red-600 dark:text-red-300"}>
                    {num(item.current.roas)}x
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <SignalPill active={item.cpmFatigue} label="CPM WoW" value={pct(item.cpmChange)} />
                <SignalPill active={item.ctrFatigue} label="CTR WoW" value={pct(item.ctrChange)} />
                <SignalPill active={item.thumbstopFatigue} label="Thumbstop" value={item.current.thumbstop > 0 ? pct(item.current.thumbstop) : "NA"} />
                <SignalPill active={item.frequencyFatigue} label="Frequency" value={num(item.current.frequency)} />
              </div>
            </div>
          ))}

          {!data.fatigued.length ? (
            <div className="p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <p className="font-black">No creative fatigue candidates found at this signal threshold.</p>
              </div>
              <p className="mt-1 text-sm opacity-60">Try lowering the signal threshold to 1+ to inspect early warning creatives.</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <Gauge className="mt-1 h-4 w-4 text-[#0A84FF]" />
            <div>
              <h2 className="text-lg font-black">Signal Definitions</h2>
              <p className="mt-1 text-sm opacity-60">Current L7D is compared against previous 7D using UTC-safe calendar windows.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-4">
          <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">CPM Fatigue</p>
            <p className="mt-2 text-sm font-black">CPM up ≥20% WoW</p>
          </div>
          <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">CTR Decay</p>
            <p className="mt-2 text-sm font-black">CTR down ≥15% WoW</p>
          </div>
          <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">Thumbstop Weakness</p>
            <p className="mt-2 text-sm font-black">Thumbstop below 25%</p>
          </div>
          <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">Frequency Saturation</p>
            <p className="mt-2 text-sm font-black">Frequency above 3.0</p>
          </div>
        </div>
      </section>
    </div>
  );
}
