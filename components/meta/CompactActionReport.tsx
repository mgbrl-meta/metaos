"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  CircleCheck,
  CircleSlash,
  LineChart as LineChartIcon,
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

type ActionType = "CUT" | "REDUCE" | "SCALE" | "PROTECT" | "WATCH";

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
  return String(row.adName || row.ad_name || row["Ad name"] || "Unknown Ad");
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

function windowRows(rows: Row[], latest: string, days: number) {
  const end = parseDate(latest);
  if (!end) return rows;

  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);

  return rows.filter((row) => {
    const d = parseDate(getDate(row));
    return d ? d >= start && d <= end : false;
  });
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
    .slice(-14)
    .map((r) => ({
      ...r,
      roas: safeDiv(r.revenue, r.spend),
      cpa: safeDiv(r.spend, r.purchases),
    }));
}

function classify(y: any, l7: any): ActionType {
  if (y.spend >= 1000 && y.purchases === 0) return "CUT";
  if (l7.spend >= 3000 && l7.purchases === 0) return "CUT";
  if (y.cpa > 1800 && y.roas < 0.8) return "REDUCE";
  if (l7.cpa > 1500 && l7.roas < 0.8) return "REDUCE";
  if (y.roas >= 1.2 && y.purchases >= 2 && y.cpa <= 1000) return "SCALE";
  if (l7.roas >= 1 && l7.purchases >= 5) return "PROTECT";
  return "WATCH";
}

function actionPriority(action: ActionType) {
  if (action === "CUT") return 1;
  if (action === "REDUCE") return 2;
  if (action === "SCALE") return 3;
  if (action === "PROTECT") return 4;
  return 5;
}

function actionTone(action: ActionType) {
  if (action === "CUT") return "red";
  if (action === "REDUCE") return "amber";
  if (action === "SCALE") return "green";
  if (action === "PROTECT") return "blue";
  return "neutral";
}

function statusText(item: any) {
  if (item.action === "CUT") return item.y.purchases === 0 ? "0 purchase spend" : "waste";
  if (item.action === "REDUCE") return item.l7.cpa > item.y.cpa ? "CPA worsening" : "CPA high";
  if (item.action === "SCALE") return "scale signal";
  if (item.action === "PROTECT") return "winner";
  return "watch";
}

function whyBullets(item: any) {
  if (item.action === "CUT") {
    return [
      `Spent ${money(item.l7.spend)} in the last 7 days with ${num(item.l7.purchases, 0)} purchases.`,
      item.y.purchases === 0 ? "Yesterday spend continued without purchase signal." : "Purchase signal is weak versus spend.",
      "Cut first before reallocating budget.",
    ];
  }

  if (item.action === "REDUCE") {
    return [
      `CPA is ${money(item.l7.cpa)}, above acceptable range.`,
      `ROAS is ${num(item.l7.roas)}x, below scale quality.`,
      "Budget should be reduced until efficiency recovers.",
    ];
  }

  if (item.action === "SCALE") {
    return [
      `Yesterday ROAS is ${num(item.y.roas)}x with ${num(item.y.purchases, 0)} purchases.`,
      `CPA is ${money(item.y.cpa)}, within scale range.`,
      "Scale carefully without editing the winning setup.",
    ];
  }

  if (item.action === "PROTECT") {
    return [
      `Last 7 day ROAS is ${num(item.l7.roas)}x with ${num(item.l7.purchases, 0)} purchases.`,
      "Do not edit this ad unless fatigue appears.",
      "Protect budget and monitor daily.",
    ];
  }

  return [
    "Signal is not strong enough for a hard decision.",
    "Monitor tomorrow before changing budget.",
    "Look for CPA, ROAS and purchase direction.",
  ];
}

function briefBullets(item: any) {
  if (item.action === "SCALE" || item.action === "PROTECT") {
    return [
      "Do not change current ad if it is still spending efficiently.",
      "Create 1–2 close variants separately for testing.",
      "Protect the post/ad identity if it has social proof.",
    ];
  }

  return [
    "Rewrite the first 3 seconds / first visual frame.",
    "Test a sharper pain-point hook.",
    "Test stronger product proof before relaunching.",
  ];
}

function buildItems(rows: Row[]) {
  const latest = latestDate(rows);
  const l7Rows = windowRows(rows, latest, 7);
  const yRows = rows.filter((row) => dateKey(getDate(row)) === latest);

  const activeAdIds = new Set(
    yRows
      .filter((row) => getSpend(row) > 0 || getImpressions(row) > 0)
      .map(getAdId)
  );

  const map = new Map<string, Row[]>();

  rows.forEach((row) => {
    const key = getAdId(row);
    if (!activeAdIds.has(key)) return;

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  return Array.from(map.entries())
    .map(([key, allRows]) => {
      const y = summarize(allRows.filter((row) => dateKey(getDate(row)) === latest));
      const l7 = summarize(allRows.filter((row) => l7Rows.includes(row)));
      const sample = allRows[0];

      const action = classify(y, l7);

      return {
        key,
        action,
        ad: getAd(sample),
        campaign: getCampaign(sample),
        adSet: getAdSet(sample),
        y,
        l7,
        trend: dailyTrend(allRows),
      };
    })
    .filter((item) => item.y.spend > 0 || item.y.impressions > 0)
    .sort((a, b) => actionPriority(a.action) - actionPriority(b.action) || b.l7.spend - a.l7.spend);
}

function groupByAction(items: any[]) {
  const groups: Record<ActionType, any[]> = {
    CUT: [],
    REDUCE: [],
    SCALE: [],
    PROTECT: [],
    WATCH: [],
  };

  items.forEach((item) => groups[item.action as ActionType].push(item));
  return groups;
}

export function CompactActionReport() {
  const rows = useMetaStore((state) => state.performanceRows);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    CUT: true,
    REDUCE: true,
    SCALE: true,
    PROTECT: false,
    WATCH: false,
  });

  const data = useMemo(() => {
    const items = buildItems(rows || []);
    const groups = groupByAction(items);
    const latest = latestDate(rows || []);

    return {
      latest,
      items,
      groups,
      summary: summarize(windowRows(rows || [], latest, 7)),
    };
  }, [rows]);

  const order: ActionType[] = ["CUT", "REDUCE", "SCALE", "PROTECT", "WATCH"];

  return (
    <div className="grid gap-3">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0A84FF]">
              Top 1% Action Report
            </p>
            <h1 className="mt-1 text-2xl font-black">Today’s Ad Action Queue</h1>
            <p className="mt-1 text-sm opacity-60">
              Collapsed by default. Open any row to see why, creative brief and 14-day CPA/ROAS trend.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs">
            <Kpi label="L7 Spend" value={money(data.summary.spend)} />
            <Kpi label="L7 ROAS" value={num(data.summary.roas)} />
            <Kpi label="L7 CPA" value={money(data.summary.cpa)} />
            <Kpi label="Latest" value={data.latest || "NA"} />
          </div>
        </div>
      </section>

      {order.map((action) => {
        const items = data.groups[action];
        if (!items.length) return null;

        const isOpen = openGroups[action];
        const tone = actionTone(action);

        return (
          <section key={action} className="rounded-xl border border-current/10 bg-current/[0.025]">
            <button
              onClick={() =>
                setOpenGroups((prev) => ({
                  ...prev,
                  [action]: !prev[action],
                }))
              }
              className="flex w-full items-center justify-between gap-3 border-b border-current/10 px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3">
                <ActionPill action={action} />
                <span className="text-sm font-black">{items.length} ads</span>
              </div>

              <ChevronDown className={isOpen ? "h-4 w-4 rotate-180 transition" : "h-4 w-4 transition"} />
            </button>

            {isOpen && (
              <div className="divide-y divide-current/10">
                {items.map((item) => (
                  <details key={item.key} className="group">
                    <summary className="grid cursor-pointer list-none grid-cols-[1fr_90px_80px_90px_85px_70px_70px_24px] items-center gap-3 px-4 py-3 text-xs hover:bg-current/[0.035]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <ActionPill action={item.action} small />
                          <StatusPill tone={tone}>{statusText(item)}</StatusPill>
                        </div>

                        <p className="mt-1 truncate text-sm font-black">{item.ad}</p>
                        <p className="mt-0.5 truncate opacity-60">
                          {item.campaign} · {item.adSet}
                        </p>
                      </div>

                      <Metric label="Spend" value={money(item.l7.spend)} />
                      <Metric label="ROAS" value={num(item.l7.roas)} tone={item.l7.roas >= 1 ? "green" : "red"} />
                      <Metric label="CPA" value={item.l7.purchases > 0 ? money(item.l7.cpa) : "No sale"} tone={item.l7.purchases > 0 && item.l7.cpa <= 1200 ? "green" : "red"} />
                      <Metric label="Purch." value={num(item.l7.purchases, 0)} />
                      <Metric label="CTR" value={pct(item.l7.ctr)} />
                      <Metric label="Freq" value={num(item.l7.freq)} />
                      <ChevronDown className="h-4 w-4 opacity-45 transition group-open:rotate-180" />
                    </summary>

                    <div className="grid gap-3 px-4 pb-4 lg:grid-cols-[1fr_1fr_420px]">
                      <InfoBox title="Why" items={whyBullets(item)} icon={<AlertTriangle className="h-4 w-4" />} />
                      <InfoBox title="Creative Brief" items={briefBullets(item)} icon={<MegaphoneIcon />} />
                      <TrendBox data={item.trend} />
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>
        );
      })}
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

function ActionPill({ action, small = false }: { action: ActionType; small?: boolean }) {
  const cls =
    action === "CUT"
      ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
      : action === "REDUCE"
      ? "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300"
      : action === "SCALE"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
      : action === "PROTECT"
      ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
      : "border-slate-300 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70";

  return (
    <span
      className={`${small ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"} inline-flex rounded-full border font-black uppercase tracking-[0.12em] ${cls}`}
    >
      {action}
    </span>
  );
}

function StatusPill({ tone, children }: { tone: string; children: React.ReactNode }) {
  const cls =
    tone === "red"
      ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
      : tone === "amber"
      ? "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300"
      : tone === "green"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
      : tone === "blue"
      ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
      : "border-slate-300 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70";

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${cls}`}>
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
          CPA / ROAS Trend
        </p>
        <CircleCheck className="h-4 w-4 text-emerald-500" />
      </div>

      <div className="h-[150px] w-full">
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.16)" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "currentColor" }} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "currentColor" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `₹${Math.round(Number(v || 0) / 1000)}K`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "currentColor" }} axisLine={false} tickLine={false} width={36} />
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
            <Line yAxisId="left" type="monotone" dataKey="cpa" name="CPA" stroke="#b42318" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="#087f5b" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MegaphoneIcon() {
  return <ShieldCheck className="h-4 w-4" />;
}
