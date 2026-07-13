"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  IndianRupee,
  LineChart as LineChartIcon,
  ShieldAlert,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMetaStore } from "@/store/metaStore";
import {
  GlassCard,
  MutedText,
  Surface,
  TonePill,
} from "@/components/cards/MetaCards";

const CRITICAL_CPA = 3000;

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function getRevenue(row: any) {
  return Number(
    row.revenue ??
      row.purchaseValue ??
      row.purchase_value ??
      row.purchaseConversionValue ??
      row.purchase_conversion_value ??
      row.conversionValue ??
      row.conversion_value ??
      row["Purchases conversion value"] ??
      row["Purchase conversion value"] ??
      row["Purchase Value"] ??
      0
  );
}

function getSpend(row: any) {
  return Number(
    row.spend ??
      row.amountSpent ??
      row.amount_spent ??
      row["Amount spent (INR)"] ??
      0
  );
}

function getPurchases(row: any) {
  return Number(row.purchases ?? row.Purchases ?? 0);
}

function getDate(row: any) {
  return String(row.date ?? row.day ?? row.Day ?? "");
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

function adKey(row: any) {
  return String(
    row.adId ||
      row.ad_id ||
      row["Ad ID"] ||
      row.adName ||
      row.ad_name ||
      row["Ad name"] ||
      "unknown"
  );
}

function adName(row: any) {
  return String(row.adName || row.ad_name || row["Ad name"] || "Unknown Creative");
}

function campaignName(row: any) {
  return String(row.campaignName || row.campaign_name || row["Campaign name"] || "Unknown Campaign");
}

function adSetName(row: any) {
  return String(row.adSetName || row.adset_name || row.ad_set_name || row["Ad set name"] || "Unknown Ad Set");
}

function getLatestDate(rows: any[]) {
  const dates = rows.map((r) => parseDate(getDate(r))).filter(Boolean) as Date[];
  if (!dates.length) return "";
  return dateKey(new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString());
}

function getYesterdaySpendingAdKeys(rows: any[]) {
  const latest = getLatestDate(rows);

  const keys = new Set<string>();

  rows.forEach((row) => {
    if (dateKey(getDate(row)) !== latest) return;
    if (getSpend(row) <= 0) return;

    keys.add(adKey(row));
  });

  return {
    latest,
    keys,
  };
}

function buildDailyTrend(rows: any[]) {
  const map = new Map<string, any>();

  rows.forEach((row) => {
    const key = dateKey(getDate(row));
    if (!key) return;

    if (!map.has(key)) {
      map.set(key, {
        date: key,
        label: displayDate(key),
        spend: 0,
        purchases: 0,
        revenue: 0,
      });
    }

    const item = map.get(key);
    item.spend += getSpend(row);
    item.purchases += getPurchases(row);
    item.revenue += getRevenue(row);
  });

  return Array.from(map.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map((row) => ({
      ...row,
      cpa: safeDiv(row.spend, row.purchases),
      roas: safeDiv(row.revenue, row.spend),
      aov: safeDiv(row.revenue, row.purchases),
    }));
}

function groupCriticalCreatives(rows: any[]) {
  const { latest, keys: yesterdaySpendingKeys } = getYesterdaySpendingAdKeys(rows);

  const eligibleRows = rows.filter((row) => yesterdaySpendingKeys.has(adKey(row)));

  const map = new Map<string, any>();

  eligibleRows.forEach((row) => {
    const key = adKey(row);

    if (!map.has(key)) {
      map.set(key, {
        key,
        adName: adName(row),
        campaignName: campaignName(row),
        adSetName: adSetName(row),
        rows: [],
        spend: 0,
        purchases: 0,
        revenue: 0,
        yesterdaySpend: 0,
      });
    }

    const item = map.get(key);
    item.rows.push(row);
    item.spend += getSpend(row);
    item.purchases += getPurchases(row);
    item.revenue += getRevenue(row);

    if (dateKey(getDate(row)) === latest) {
      item.yesterdaySpend += getSpend(row);
    }
  });

  return {
    latest,
    eligibleCount: yesterdaySpendingKeys.size,
    critical: Array.from(map.values())
      .map((item) => ({
        ...item,
        cpa: safeDiv(item.spend, item.purchases),
        roas: safeDiv(item.revenue, item.spend),
        aov: safeDiv(item.revenue, item.purchases),
        trend: buildDailyTrend(item.rows),
      }))
      .filter((item) => item.yesterdaySpend > 0 && item.purchases > 0 && item.cpa > CRITICAL_CPA)
      .sort((a, b) => b.cpa - a.cpa),
  };
}

export function CriticalCpaCreatives() {
  const performanceRows = useMetaStore((state) => state.performanceRows);

  const data = useMemo(() => {
    const grouped = groupCriticalCreatives(performanceRows || []);
    const criticalSpend = grouped.critical.reduce((s, r) => s + r.spend, 0);
    const criticalPurchases = grouped.critical.reduce((s, r) => s + r.purchases, 0);
    const criticalRevenue = grouped.critical.reduce((s, r) => s + r.revenue, 0);
    const yesterdaySpend = grouped.critical.reduce((s, r) => s + r.yesterdaySpend, 0);

    return {
      latest: grouped.latest,
      eligibleCount: grouped.eligibleCount,
      critical: grouped.critical,
      criticalSpend,
      criticalPurchases,
      criticalRevenue,
      yesterdaySpend,
      criticalCpa: safeDiv(criticalSpend, criticalPurchases),
      criticalRoas: safeDiv(criticalRevenue, criticalSpend),
    };
  }, [performanceRows]);

  if (!data.critical.length) {
    return (
      <GlassCard className="p-5 min-w-0 border-emerald-400/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <TonePill tone="green">No Critical CPA Creatives</TonePill>
              <TonePill tone="neutral">Only Ads With Spend Yesterday</TonePill>
              <TonePill tone="neutral">Latest: {data.latest || "NA"}</TonePill>
            </div>
            <h2 className="mt-4 text-2xl font-black">Critical Lifetime CPA Check</h2>
            <MutedText className="mt-2 text-sm leading-6">
              Checked {data.eligibleCount} creatives that spent yesterday. None have lifetime CPA above ₹3,000 with purchase signal.
            </MutedText>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden min-w-0 border-red-400/30">
      <div className="border-b border-red-400/20 bg-red-400/10 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <TonePill tone="red">Critical</TonePill>
              <TonePill tone="neutral">Only Creatives With Spend Yesterday</TonePill>
              <TonePill tone="neutral">Lifetime CPA &gt; ₹3,000</TonePill>
              <TonePill tone="neutral">Latest: {data.latest}</TonePill>
            </div>

            <h2 className="mt-4 flex items-center gap-2 text-2xl font-black text-red-300">
              <ShieldAlert className="h-6 w-6" />
              Critical CPA Creatives Active Yesterday
            </h2>

            <MutedText className="mt-2 max-w-5xl text-sm leading-6">
              This section ignores paused/no-spend creatives. It only audits creatives that spent yesterday, then checks lifetime CPA across history and shows their last 30-day CPA trend.
            </MutedText>
          </div>

          <div className="grid min-w-[260px] grid-cols-2 gap-2">
            <MiniStat label="Critical Creatives" value={String(data.critical.length)} tone="red" />
            <MiniStat label="Yesterday Spend" value={money(data.yesterdaySpend)} tone="red" />
            <MiniStat label="Lifetime CPA" value={money(data.criticalCpa)} tone="red" />
            <MiniStat label="Lifetime ROAS" value={num(data.criticalRoas)} tone="yellow" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        {data.critical.slice(0, 25).map((row) => (
          <Surface key={row.key} className="p-5 border border-red-400/20">
            <div className="grid gap-5 xl:grid-cols-[1fr_420px] xl:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-black leading-7 whitespace-normal break-words">
                      {row.adName}
                    </p>
                    <MutedText className="mt-2 text-sm leading-6">
                      Campaign: {row.campaignName}
                      <br />
                      Ad Set: {row.adSetName}
                    </MutedText>
                  </div>

                  <TonePill tone="red">CPA {money(row.cpa)}</TonePill>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <MiniStat label="Yesterday Spend" value={money(row.yesterdaySpend)} tone="red" />
                  <MiniStat label="Lifetime Spend" value={money(row.spend)} tone="red" />
                  <MiniStat label="Purchases" value={num(row.purchases, 0)} tone="neutral" />
                  <MiniStat label="Lifetime CPA" value={money(row.cpa)} tone="red" />
                  <MiniStat label="ROAS" value={num(row.roas)} tone={row.roas >= 1 ? "green" : "yellow"} />
                  <MiniStat label="AOV" value={money(row.aov)} tone="blue" />
                </div>

                <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-red-300">
                    <AlertTriangle className="h-4 w-4" />
                    Recommended Action
                  </p>
                  <p className="mt-3 text-sm leading-6 opacity-85">
                    This creative was active yesterday and has lifetime CPA above ₹3,000. Do not scale. If last 30-day CPA is still above threshold, reduce budget or rebuild the creative. If yesterday was a controlled retest, keep on watch but cap spend.
                  </p>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-current/10 bg-current/[0.025] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] opacity-50">
                      <LineChartIcon className="h-4 w-4" />
                      Daily CPA Trend
                    </p>
                    <p className="mt-1 text-xs opacity-45">Last 30 active days</p>
                  </div>

                  <IndianRupee className="h-5 w-5 text-red-300" />
                </div>

                <div className="h-[190px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height={190}>
                    <LineChart data={row.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "currentColor" }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={18}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "currentColor" }}
                        axisLine={false}
                        tickLine={false}
                        width={54}
                        tickFormatter={(v) => `₹${Math.round(Number(v || 0) / 1000)}K`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#111318",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 14,
                          color: "white",
                        }}
                        formatter={(value: any, name: any) => {
                          if (String(name).toLowerCase() === "cpa") {
                            return [money(Number(value || 0)), "CPA"];
                          }
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="cpa"
                        name="CPA"
                        stroke="#f87171"
                        strokeWidth={3}
                        dot={{ r: 2 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Surface>
        ))}
      </div>
    </GlassCard>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "red" | "yellow" | "green" | "blue" | "neutral";
}) {
  const cls =
    tone === "red"
      ? "text-red-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : tone === "green"
      ? "text-emerald-300"
      : tone === "blue"
      ? "text-[#7dbdff]"
      : "opacity-85";

  return (
    <div className="rounded-2xl border border-current/10 bg-current/[0.035] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-40">{label}</p>
      <p className={`mt-1 text-sm font-black ${cls}`}>{value}</p>
    </div>
  );
}
