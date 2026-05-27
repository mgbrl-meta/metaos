"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Eye,
  Flame,
  Lightbulb,
  LineChart as LineChartIcon,
  MousePointerClick,
  ShieldCheck,
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
import { useMetaStore } from "@/store/metaStore";

type Row = Record<string, any>;
type ViewMode = "hook" | "hold" | "combined";

const MIN_LIFETIME_SPEND = 10000;
const MIN_LIFETIME_PURCHASES = 5;

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number) => `${num(Number(n || 0) * 100, 2)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function value(row: Row, keys: string[]) {
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== null && v !== "") return Number(v || 0);
  }
  return 0;
}

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKey(value?: string) {
  const d = parseDate(value);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function displayDate(value?: string) {
  const d = parseDate(value);
  if (!d) return value || "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getDate(row: Row) {
  return String(row.date || row.day || row.Day || "");
}

function getCampaign(row: Row) {
  return String(row.campaignName || row.campaign_name || row["Campaign name"] || "Unknown Campaign");
}

function getAdSet(row: Row) {
  return String(row.adSetName || row.adset_name || row.ad_set_name || row["Ad set name"] || "Unknown Ad Set");
}

function getAd(row: Row) {
  return String(row.adName || row.ad_name || row["Ad name"] || "Unknown Creative");
}

function getAdId(row: Row) {
  return String(row.adId || row.ad_id || row["Ad ID"] || getAd(row));
}

function getSpend(row: Row) {
  return Number(row.spend ?? row.amountSpent ?? row.amount_spent ?? row["Amount spent (INR)"] ?? 0);
}

function getImpressions(row: Row) {
  return Number(row.impressions ?? row.Impressions ?? 0);
}

function getReach(row: Row) {
  return Number(row.reach ?? row.Reach ?? 0);
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

function getPurchases(row: Row) {
  return Number(row.purchases ?? row.Purchases ?? 0);
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

/**
 * Flexible video metric mapping.
 * Use whichever fields exist in your Meta sheet/export.
 *
 * Hook rate:
 *   3-second video plays / impressions
 *
 * Hold rate:
 *   thruplays OR 15-sec views OR video plays at 25% / 3-sec video plays
 *
 * If your sheet uses different names, just add them inside these key arrays.
 */
function getRawNumber(row: Row, possibleNames: string[]) {
  const normalize = (x: string) =>
    String(x || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const wanted = possibleNames.map(normalize);

  for (const [key, raw] of Object.entries(row)) {
    const nk = normalize(key);
    const matched = wanted.some((w) => nk === w || nk.includes(w) || w.includes(nk));
    if (!matched) continue;

    if (raw === undefined || raw === null || raw === "") return 0;

    if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;

    const cleaned = String(raw)
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .replace(/%/g, "")
      .trim();

    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  return 0;
}

function getHookViews(row: Row) {
  // Google Sheet exact column:
  // "3-second video plays"
  return getRawNumber(row, [
    "3-second video plays",
    "3 second video plays",
    "3-second video play",
    "3 second video play",
    "3_second_video_plays",
    "three second video plays",
    "three_second_video_plays",
  ]);
}

function getVideoPlays(row: Row) {
  // Google Sheet exact column:
  // "Video plays"
  return getRawNumber(row, [
    "Video plays",
    "video plays",
    "video_plays",
    "Video play",
    "video play",
  ]);
}

function getHoldViews(row: Row) {
  // Google Sheet exact column:
  // "Thruplays"
  return getRawNumber(row, [
    "Thruplays",
    "thruplays",
    "Thruplay",
    "thruplay",
    "Thru plays",
    "thru plays",
    "thru_plays",
  ]);
}

function getAvgPlayTime(row: Row) {
  // Google Sheet exact column:
  // "video average play time (in seconds)"
  return getRawNumber(row, [
    "video average play time (in seconds)",
    "Video average play time (in seconds)",
    "video_average_play_time_in_seconds",
    "video average play time",
    "average play time",
    "avg play time",
  ]);
}

function getAvailableVideoColumns(rows: Row[]) {
  const keys = new Set<string>();

  rows.slice(0, 200).forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      const k = String(key || "").toLowerCase();

      if (
        k.includes("video") ||
        k.includes("thru") ||
        k.includes("play") ||
        k.includes("3-second") ||
        k.includes("3 second") ||
        k.includes("average play")
      ) {
        keys.add(key);
      }
    });
  });

  return Array.from(keys).sort();
}

function latestDate(rows: Row[]) {
  const dates = rows.map((r) => parseDate(getDate(r))).filter(Boolean) as Date[];
  if (!dates.length) return "";
  return dateKey(new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString());
}

function summarize(rows: Row[]) {
  const spend = rows.reduce((s, r) => s + getSpend(r), 0);
  const impressions = rows.reduce((s, r) => s + getImpressions(r), 0);
  const reach = rows.reduce((s, r) => s + getReach(r), 0);
  const clicks = rows.reduce((s, r) => s + getClicks(r), 0);
  const purchases = rows.reduce((s, r) => s + getPurchases(r), 0);
  const revenue = rows.reduce((s, r) => s + getRevenue(r), 0);
  const videoPlays = rows.reduce((s, r) => s + getVideoPlays(r), 0);
  const hookViews = rows.reduce((s, r) => s + getHookViews(r), 0);
  const holdViews = rows.reduce((s, r) => s + getHoldViews(r), 0);
  const avgPlayTimeNumerator = rows.reduce((s, r) => s + getAvgPlayTime(r) * Math.max(getVideoPlays(r), getHookViews(r), 1), 0);
  const avgPlayTimeDenominator = rows.reduce((s, r) => s + Math.max(getVideoPlays(r), getHookViews(r), 0), 0);

  const hookRate = safeDiv(hookViews, impressions);
  const holdRate = safeDiv(holdViews, hookViews);
  const avgPlayTime = safeDiv(avgPlayTimeNumerator, avgPlayTimeDenominator);

  return {
    spend,
    impressions,
    reach,
    clicks,
    purchases,
    revenue,
    videoPlays,
    hookViews,
    holdViews,
    hookRate,
    holdRate,
    avgPlayTime,
    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, purchases),
    ctr: safeDiv(clicks, impressions),
    freq: safeDiv(impressions, reach),
    aov: safeDiv(revenue, purchases),
  };
}

function dailyTrend(rows: Row[]) {
  const map = new Map<string, Row[]>();

  rows.forEach((row) => {
    const key = dateKey(getDate(row));
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, dayRows]) => {
      const s = summarize(dayRows);
      return {
        date,
        label: displayDate(date),
        hookRate: s.hookRate,
        holdRate: s.holdRate,
        avgPlayTime: s.avgPlayTime,
        roas: s.roas,
        cpa: s.cpa,
        spend: s.spend,
        purchases: s.purchases,
      };
    });
}

function buildCreatives(rows: Row[]) {
  const map = new Map<string, Row[]>();
  const latest = latestDate(rows);

  const yesterdayActiveAdIds = new Set(
    rows
      .filter((row) => dateKey(getDate(row)) === latest)
      .filter((row) => getSpend(row) > 0)
      .map((row) => getAdId(row))
  );

  rows.forEach((row) => {
    const key = getAdId(row);

    // IMPORTANT:
    // Only include ads that spent yesterday.
    // Lifetime data is used only after the creative qualifies as active.
    if (!yesterdayActiveAdIds.has(key)) return;

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  return Array.from(map.entries())
    .map(([key, adRows]) => {
      const sample = adRows[0];
      const lifetime = summarize(adRows);
      const yesterday = summarize(adRows.filter((row) => dateKey(getDate(row)) === latest));
      const trend = dailyTrend(adRows);

      const hookScore = lifetime.hookRate * Math.log10(Math.max(lifetime.impressions, 10));
      const holdScore = lifetime.holdRate * Math.log10(Math.max(lifetime.hookViews, 10));
      const combinedScore = hookScore * 0.45 + holdScore * 0.55;

      return {
        key,
        ad: getAd(sample),
        campaign: getCampaign(sample),
        adSet: getAdSet(sample),
        lifetime,
        yesterday,
        trend,
        hookScore,
        holdScore,
        combinedScore,
      };
    })
    .filter((item) => item.yesterday.spend > 0)
    .filter((item) => item.lifetime.spend > MIN_LIFETIME_SPEND)
    .filter((item) => item.lifetime.impressions > 0)
    .sort((a, b) => b.combinedScore - a.combinedScore);
}

function learningBullets(item: any) {
  const bullets = [];

  bullets.push(`Hook rate is ${pct(item.lifetime.hookRate)} from ${num(item.lifetime.hookViews, 0)} 3-second video plays.`);
  bullets.push(`Hold rate is ${pct(item.lifetime.holdRate)} from ${num(item.lifetime.holdViews, 0)} Thruplays.`);
  bullets.push(`Average video play time is ${num(item.lifetime.avgPlayTime, 1)} seconds.`);
  bullets.push(`Lifetime ROAS is ${num(item.lifetime.roas)}x with ${num(item.lifetime.purchases, 0)} purchases.`);

  if (item.lifetime.hookRate >= 0.25) {
    bullets.push("Strong hook signal: first frame / first 3 seconds is likely stopping attention.");
  } else {
    bullets.push("Hook is not exceptional; performance may be coming from product intent, offer, or audience quality.");
  }

  if (item.lifetime.holdRate >= 0.3) {
    bullets.push("Strong hold signal: the message is keeping viewers engaged after the hook.");
  } else {
    bullets.push("Hold rate is weaker than hook; improve the middle proof, demo, or problem-solution sequence.");
  }

  return bullets;
}

function actionBullets(item: any) {
  if (item.lifetime.hookRate >= 0.25 && item.lifetime.holdRate >= 0.3 && item.lifetime.roas > 1) {
    return [
      "Use this as a creative reference angle.",
      "Create 2–3 variants with the same opening frame and different proof sections.",
      "Do not edit the existing winning ad. Test variants separately.",
    ];
  }

  if (item.lifetime.hookRate >= 0.25 && item.lifetime.holdRate < 0.3) {
    return [
      "Keep the hook/first frame structure.",
      "Rebuild the middle section with stronger proof, demo or transformation.",
      "Test shorter and faster product proof after the hook.",
    ];
  }

  if (item.lifetime.hookRate < 0.25 && item.lifetime.holdRate >= 0.3) {
    return [
      "Content quality after the hook is good, but the opening needs work.",
      "Test new first 3 seconds while keeping the main body similar.",
      "Use a stronger pain-point or result-led opening.",
    ];
  }

  return [
    "Use this as a secondary reference, not the main creative template.",
    "Look for the product/offer/audience insight behind the purchases.",
    "Rebuild both hook and hold sequence before scaling variants.",
  ];
}

function topLabel(item: any) {
  if (item.lifetime.hookRate >= 0.25 && item.lifetime.holdRate >= 0.3) return "Hook + Hold Winner";
  if (item.lifetime.hookRate >= 0.25) return "Top Hook";
  if (item.lifetime.holdRate >= 0.3) return "Top Hold";
  return "Qualified";
}

export function HookHoldCreativeTab() {
  const rows = useMetaStore((state) => state.performanceRows);
  const [view, setView] = useState<ViewMode>("combined");

  const data = useMemo(() => {
    const creatives = buildCreatives(rows || []);

    const sorted = [...creatives].sort((a, b) => {
      if (view === "hook") return b.hookScore - a.hookScore;
      if (view === "hold") return b.holdScore - a.holdScore;
      return b.combinedScore - a.combinedScore;
    });

    const summary = summarize(
      sorted.flatMap((creative) => {
        return (rows || []).filter((row) => getAdId(row) === creative.key);
      })
    );

    return {
      creatives: sorted,
      summary,
      latest: latestDate(rows || []),
    };
  }, [rows, view]);

  return (
    <div className="grid gap-3">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0A84FF]">
              Hook / Hold Creative Intelligence
            </p>
            <h1 className="mt-1 text-2xl font-black">Top Hook Rate & Hold Rate Creatives</h1>
            <p className="mt-1 text-sm opacity-60">
              Only creatives that spent yesterday are shown. Lifetime spend must be above ₹10,000. Expand any row for learnings and timeline.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs">
            <Kpi label="Active Qualified" value={String(data.creatives.length)} />
            <Kpi label="Hook Rate" value={pct(data.summary.hookRate)} />
            <Kpi label="Hold Rate" value={pct(data.summary.holdRate)} />
            <Kpi label="Latest" value={data.latest || "NA"} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="flex flex-col gap-3 border-b border-current/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-black">Creative Hook / Hold Ranking</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setView("combined")}
              className={
                view === "combined"
                  ? "rounded-full bg-[#0A84FF] px-3 py-1.5 text-xs font-black text-white"
                  : "rounded-full border border-current/10 px-3 py-1.5 text-xs font-black"
              }
            >
              Combined
            </button>
            <button
              onClick={() => setView("hook")}
              className={
                view === "hook"
                  ? "rounded-full bg-[#0A84FF] px-3 py-1.5 text-xs font-black text-white"
                  : "rounded-full border border-current/10 px-3 py-1.5 text-xs font-black"
              }
            >
              Top Hook
            </button>
            <button
              onClick={() => setView("hold")}
              className={
                view === "hold"
                  ? "rounded-full bg-[#0A84FF] px-3 py-1.5 text-xs font-black text-white"
                  : "rounded-full border border-current/10 px-3 py-1.5 text-xs font-black"
              }
            >
              Top Hold
            </button>
          </div>
        </div>

        <div className="divide-y divide-current/10">
          {data.creatives.map((item, index) => (
            <details key={item.key} className="group">
              <summary className="grid cursor-pointer list-none grid-cols-[1fr_90px_90px_90px_85px_75px_75px_75px_24px] items-center gap-3 px-4 py-3 text-xs hover:bg-current/[0.035]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <WinnerPill>{topLabel(item)}</WinnerPill>
                    <span className="rounded-full border border-current/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] opacity-70">
                      Rank #{index + 1}
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

                <Metric label="Spend" value={money(item.lifetime.spend)} />
                <Metric label="Purch." value={num(item.lifetime.purchases, 0)} />
                <Metric label="ROAS" value={num(item.lifetime.roas)} tone={item.lifetime.roas >= 1 ? "green" : "red"} />
                <Metric label="Hook" value={pct(item.lifetime.hookRate)} tone={item.lifetime.hookRate >= 0.25 ? "green" : undefined} />
                <Metric label="Hold" value={pct(item.lifetime.holdRate)} tone={item.lifetime.holdRate >= 0.3 ? "green" : undefined} />
                <Metric label="Avg Time" value={`${num(item.lifetime.avgPlayTime, 1)}s`} />
                <Metric label="CPA" value={money(item.lifetime.cpa)} />
                <ChevronDown className="h-4 w-4 opacity-45 transition group-open:rotate-180" />
              </summary>

              <div className="grid gap-3 px-4 pb-4 lg:grid-cols-[1fr_1fr_420px]">
                <InfoBox title="What To Learn" items={learningBullets(item)} icon={<Lightbulb className="h-4 w-4" />} />
                <InfoBox title="Next Creative Direction" items={actionBullets(item)} icon={<MousePointerClick className="h-4 w-4" />} />
                <TrendBox data={item.trend} />
              </div>
            </details>
          ))}

          {!data.creatives.length && (
            <div className="p-5">
              <p className="font-black">No hook/hold qualified creatives found.</p>
              <p className="mt-1 text-sm opacity-60">
                Criteria: lifetime spend above ₹10,000 and lifetime purchases above 5. Also make sure your Meta sheet includes 3-second video views and thruplay / hold-view columns.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-current/10 bg-current/[0.035] px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-45">{label}</p>
      <p className="mt-0.5 font-black">{value}</p>
    </div>
  );
}

function WinnerPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "red" | "green";
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-45">{label}</p>
      <p className={tone === "red" ? "mt-0.5 font-black text-red-600 dark:text-red-300" : tone === "green" ? "mt-0.5 font-black text-emerald-600 dark:text-emerald-300" : "mt-0.5 font-black"}>
        {value}
      </p>
    </div>
  );
}

function InfoBox({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-current/10 bg-current/[0.025] p-3">
      <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] opacity-55">
        {icon}
        {title}
      </p>
      <ul className="mt-2 grid gap-1.5 text-xs leading-5 opacity-75">
        {items.map((item) => (
          <li key={item}>• {item}</li>
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
          Hook / Hold Timeline
        </p>
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
      </div>

      <div className="h-[150px] w-full">
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.16)" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "currentColor" }} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "currentColor" }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => `${Math.round(Number(v || 0) * 100)}%`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "currentColor" }} axisLine={false} tickLine={false} width={34} />
            <Tooltip
              contentStyle={{
                background: "#111318",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                color: "white",
                fontSize: 11,
              }}
              formatter={(value: any, name: any) => {
                if (name === "ROAS") return [`${num(Number(value || 0))}x`, "ROAS"];
                return [pct(Number(value || 0)), String(name)];
              }}
            />
            <Line yAxisId="left" type="monotone" dataKey="hookRate" name="Hook Rate" stroke="#0A84FF" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="left" type="monotone" dataKey="holdRate" name="Hold Rate" stroke="#087f5b" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="#b42318" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
