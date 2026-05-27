"use client";

import { useMemo, useState } from "react";
import {
  Award,
  ChevronDown,
  LineChart as LineChartIcon,
  Lightbulb,
  ShieldCheck,
  TrendingUp,
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

const MIN_LIFETIME_ROAS = 1;
const MIN_LIFETIME_PURCHASES = 5;

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number) => `${num(Number(n || 0) * 100, 2)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

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

  return {
    spend,
    impressions,
    reach,
    clicks,
    purchases,
    revenue,
    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, purchases),
    ctr: safeDiv(clicks, impressions),
    freq: safeDiv(impressions, reach),
    aov: safeDiv(revenue, purchases),
  };
}

function dailyTrend(rows: Row[]) {
  const map = new Map<string, any>();

  rows.forEach((row) => {
    const key = dateKey(getDate(row));
    if (!key) return;

    if (!map.has(key)) {
      map.set(key, {
        date: key,
        label: displayDate(key),
        spend: 0,
        revenue: 0,
        purchases: 0,
      });
    }

    const item = map.get(key);
    item.spend += getSpend(row);
    item.revenue += getRevenue(row);
    item.purchases += getPurchases(row);
  });

  return Array.from(map.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map((r) => ({
      ...r,
      roas: safeDiv(r.revenue, r.spend),
      cpa: safeDiv(r.spend, r.purchases),
    }));
}

function buildWinners(rows: Row[]) {
  const latest = latestDate(rows);
  const map = new Map<string, Row[]>();

  rows.forEach((row) => {
    const key = getAdId(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  return Array.from(map.entries())
    .map(([key, adRows]) => {
      const sample = adRows[0];
      const lifetime = summarize(adRows);
      const trend = dailyTrend(adRows);
      const yesterday = summarize(adRows.filter((row) => dateKey(getDate(row)) === latest));

      return {
        key,
        ad: getAd(sample),
        campaign: getCampaign(sample),
        adSet: getAdSet(sample),
        lifetime,
        yesterday,
        trend,
      };
    })
    .filter((item) => item.lifetime.roas > MIN_LIFETIME_ROAS && item.lifetime.purchases > MIN_LIFETIME_PURCHASES)
    .sort((a, b) => {
      if (b.lifetime.roas !== a.lifetime.roas) return b.lifetime.roas - a.lifetime.roas;
      return b.lifetime.purchases - a.lifetime.purchases;
    });
}

function winnerType(item: any) {
  if (item.lifetime.roas >= 2 && item.lifetime.purchases >= 20) return "Core Winner";
  if (item.lifetime.roas >= 1.5 && item.lifetime.purchases >= 10) return "Scale Candidate";
  if (item.yesterday.spend > 0 && item.yesterday.roas >= 1) return "Active Winner";
  return "Historical Winner";
}

function learningBullets(item: any) {
  const bullets = [];

  bullets.push(`This creative has lifetime ROAS of ${num(item.lifetime.roas)}x with ${num(item.lifetime.purchases, 0)} purchases.`);
  bullets.push(`Lifetime CPA is ${money(item.lifetime.cpa)} and AOV is ${money(item.lifetime.aov)}.`);

  if (item.lifetime.ctr >= 0.015) {
    bullets.push(`CTR is strong at ${pct(item.lifetime.ctr)}, so the hook/visual is likely pulling attention.`);
  } else {
    bullets.push(`CTR is only ${pct(item.lifetime.ctr)}, so the win may be coming from offer/product intent rather than creative hook.`);
  }

  if (item.lifetime.freq <= 2.5) {
    bullets.push(`Frequency is healthy at ${num(item.lifetime.freq)}x, so it may still have room to scale.`);
  } else {
    bullets.push(`Frequency is ${num(item.lifetime.freq)}x, so scale carefully and refresh variants to avoid fatigue.`);
  }

  return bullets;
}

function actionBullets(item: any) {
  if (item.lifetime.roas >= 2 && item.lifetime.purchases >= 20) {
    return [
      "Protect this creative. Do not edit the existing ad.",
      "Create 2–3 close variants using the same winning angle.",
      "Move learnings into new hooks, thumbnails, first frames and landing-page copy.",
    ];
  }

  if (item.lifetime.roas >= 1.5) {
    return [
      "Test controlled budget increase or duplicate angle into a new test.",
      "Build variants around the same pain point and product proof.",
      "Watch frequency and CPA trend before aggressive scale.",
    ];
  }

  return [
    "Keep as reference winner, but do not blindly scale.",
    "Use it to understand winning message, audience and product angle.",
    "Create a stronger version before pushing more spend.",
  ];
}

export function WinnerCreativeTab() {
  const rows = useMetaStore((state) => state.performanceRows);
  const [sortBy, setSortBy] = useState<"roas" | "purchases" | "spend" | "cpa">("roas");

  const data = useMemo(() => {
    const winners = buildWinners(rows || []);

    const sorted = [...winners].sort((a, b) => {
      if (sortBy === "purchases") return b.lifetime.purchases - a.lifetime.purchases;
      if (sortBy === "spend") return b.lifetime.spend - a.lifetime.spend;
      if (sortBy === "cpa") return a.lifetime.cpa - b.lifetime.cpa;
      return b.lifetime.roas - a.lifetime.roas;
    });

    const summary = summarize(
      winners.flatMap((winner) => {
        return (rows || []).filter((row) => getAdId(row) === winner.key);
      })
    );

    return {
      winners: sorted,
      summary,
      latest: latestDate(rows || []),
    };
  }, [rows, sortBy]);

  return (
    <div className="grid gap-3">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0A84FF]">
              Winner Creative Intelligence
            </p>
            <h1 className="mt-1 text-2xl font-black">Winner Creatives</h1>
            <p className="mt-1 text-sm opacity-60">
              Creatives with lifetime ROAS above 1 and more than 5 purchases. Use this to learn what to scale, protect and recreate.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs">
            <Kpi label="Winners" value={String(data.winners.length)} />
            <Kpi label="Revenue" value={money(data.summary.revenue)} />
            <Kpi label="ROAS" value={num(data.summary.roas)} />
            <Kpi label="Latest" value={data.latest || "NA"} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="flex flex-col gap-3 border-b border-current/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-black">Winner Creative List</p>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-full border border-current/10 bg-transparent px-3 py-1.5 text-xs font-black outline-none"
          >
            <option value="roas">Sort by ROAS</option>
            <option value="purchases">Sort by Purchases</option>
            <option value="spend">Sort by Spend</option>
            <option value="cpa">Sort by Lowest CPA</option>
          </select>
        </div>

        <div className="divide-y divide-current/10">
          {data.winners.map((item, index) => (
            <details key={item.key} className="group">
              <summary className="grid cursor-pointer list-none grid-cols-[1fr_92px_92px_90px_85px_85px_75px_24px] items-center gap-3 px-4 py-3 text-xs hover:bg-current/[0.035]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <WinnerPill>{winnerType(item)}</WinnerPill>
                    <span className="rounded-full border border-current/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] opacity-70">
                      Rank #{index + 1}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-sm font-black">{item.ad}</p>
                  <p className="mt-0.5 truncate opacity-60">
                    {item.campaign} · {item.adSet}
                  </p>
                </div>

                <Metric label="Spend" value={money(item.lifetime.spend)} />
                <Metric label="Revenue" value={money(item.lifetime.revenue)} />
                <Metric label="ROAS" value={num(item.lifetime.roas)} tone="green" />
                <Metric label="CPA" value={money(item.lifetime.cpa)} tone={item.lifetime.cpa <= 1200 ? "green" : undefined} />
                <Metric label="Purch." value={num(item.lifetime.purchases, 0)} />
                <Metric label="CTR" value={pct(item.lifetime.ctr)} />
                <ChevronDown className="h-4 w-4 opacity-45 transition group-open:rotate-180" />
              </summary>

              <div className="grid gap-3 px-4 pb-4 lg:grid-cols-[1fr_1fr_420px]">
                <InfoBox title="What To Learn" items={learningBullets(item)} icon={<Lightbulb className="h-4 w-4" />} />
                <InfoBox title="Scaling Direction" items={actionBullets(item)} icon={<TrendingUp className="h-4 w-4" />} />
                <TrendBox data={item.trend} />
              </div>
            </details>
          ))}

          {!data.winners.length && (
            <div className="p-5">
              <p className="font-black">No winner creatives found yet.</p>
              <p className="mt-1 text-sm opacity-60">
                Criteria: lifetime ROAS above 1 and lifetime purchases above 5.
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
          ROAS / CPA Trend
        </p>
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
      </div>

      <div className="h-[150px] w-full">
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.16)" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "currentColor" }} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "currentColor" }} axisLine={false} tickLine={false} width={38} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "currentColor" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `₹${Math.round(Number(v || 0) / 1000)}K`} />
            <Tooltip
              contentStyle={{
                background: "#111318",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                color: "white",
                fontSize: 11,
              }}
              formatter={(value: any, name: any) => {
                if (name === "CPA") return [money(Number(value || 0)), "CPA"];
                return [`${num(Number(value || 0))}x`, "ROAS"];
              }}
            />
            <Line yAxisId="left" type="monotone" dataKey="roas" name="ROAS" stroke="#087f5b" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="right" type="monotone" dataKey="cpa" name="CPA" stroke="#b42318" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
