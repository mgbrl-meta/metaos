"use client";

import { useMemo } from "react";
import { useMetaStore } from "@/store/metaStore";
import { onlyLiveRows } from "@/lib/liveFilter";
import { getCurrentlyDeliveringAdKeys } from "@/lib/currentCreativeFilter";
import {
  GlassCard,
  MetricCard,
  MutedText,
  PageHeader,
  Surface,
  TonePill,
} from "@/components/cards/MetaCards";
import { useThemeStore } from "@/components/theme/ThemeProvider";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getLatestDate(rows: any[]) {
  const dates = rows.map((r) => parseDate(r.date)).filter(Boolean) as Date[];
  if (!dates.length) return new Date();
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

function withinLastDays(row: any, latestDate: Date, days: number) {
  const d = parseDate(row.date);
  if (!d) return false;

  const start = new Date(latestDate);
  start.setDate(start.getDate() - days + 1);

  return d >= start && d <= latestDate;
}

function rowKey(row: any) {
  return row.adId || row.adName;
}

function buildStructureRows(rows: any[]) {
  const grouped = new Map<string, any[]>();

  rows.forEach((row) => {
    const key = String(rowKey(row));
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  });

  return Array.from(grouped.values()).map((items) => {
    const sorted = [...items].sort((a, b) => {
      const da = parseDate(a.date)?.getTime() || 0;
      const db = parseDate(b.date)?.getTime() || 0;
      return da - db;
    });

    const first = sorted[0];

    const spend = sorted.reduce((s, r) => s + Number(r.spend || 0), 0);
    const revenue = sorted.reduce((s, r) => s + Number(r.revenue || 0), 0);
    const purchases = sorted.reduce((s, r) => s + Number(r.purchases || 0), 0);
    const impressions = sorted.reduce((s, r) => s + Number(r.impressions || 0), 0);
    const clicks = sorted.reduce((s, r) => s + Number(r.clicks || 0), 0);
    const lpv = sorted.reduce((s, r) => s + Number(r.landingPageViews || 0), 0);
    const atc = sorted.reduce((s, r) => s + Number(r.addToCart || 0), 0);

    let cumulativeSpend = 0;
    let cumulativePurchases = 0;
    const purchasePoints: { date: string; cumulativeSpend: number; cumulativePurchases: number; cpa: number }[] = [];

    sorted.forEach((row) => {
      cumulativeSpend += Number(row.spend || 0);
      const dayPurchases = Number(row.purchases || 0);

      if (dayPurchases > 0) {
        for (let i = 0; i < dayPurchases; i++) {
          cumulativePurchases += 1;
          purchasePoints.push({
            date: row.date,
            cumulativeSpend,
            cumulativePurchases,
            cpa: safeDiv(cumulativeSpend, cumulativePurchases),
          });
        }
      }
    });

    const firstPurchaseCpa = purchasePoints[0]?.cpa || 0;
    const latestPurchaseCpa = purchasePoints[purchasePoints.length - 1]?.cpa || 0;

    const improving =
      purchasePoints.length >= 2 &&
      latestPurchaseCpa > 0 &&
      firstPurchaseCpa > 0 &&
      latestPurchaseCpa < firstPurchaseCpa;

    const trendText =
      purchasePoints.length === 0
        ? "No purchase yet"
        : purchasePoints.length === 1
        ? `1st purchase CPA ${money(latestPurchaseCpa)}`
        : improving
        ? `Optimising: CPA improved from ${money(firstPurchaseCpa)} to ${money(latestPurchaseCpa)}`
        : `Not optimising yet: CPA moved from ${money(firstPurchaseCpa)} to ${money(latestPurchaseCpa)}`;

    return {
      campaignName: first.campaignName,
      adSetName: first.adSetName,
      adName: first.adName,
      adId: first.adId,
      spend,
      revenue,
      purchases,
      impressions,
      clicks,
      lpv,
      atc,
      roas: safeDiv(revenue, spend),
      cpa: safeDiv(spend, purchases),
      ctr: safeDiv(clicks, impressions) * 100,
      lpvRate: safeDiv(lpv, clicks) * 100,
      atcRate: safeDiv(atc, lpv) * 100,
      firstPurchaseCpa,
      latestPurchaseCpa,
      improving,
      trendText,
    };
  });
}

export function StructureReport() {
  const { performanceRows, settings } = useMetaStore();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);

  const data = useMemo(() => {
    const latestDate = getLatestDate(liveRows);
    const last90Rows = liveRows.filter((row) => withinLastDays(row, latestDate, 90));

    const activeAdKeys = getCurrentlyDeliveringAdKeys(liveRows);

    const currentRows =
      activeAdKeys.size > 0
        ? last90Rows.filter((row) => activeAdKeys.has(String(rowKey(row))))
        : last90Rows;

    const structureRows = buildStructureRows(currentRows).sort((a, b) => b.spend - a.spend);

    const improvingCreatives = structureRows
      .filter((row) => row.improving && row.purchases >= 2)
      .sort((a, b) => b.spend - a.spend);

    const topRoasCreatives = structureRows
      .filter((row) => row.spend >= settings.minSpendForDecision && row.purchases > 0)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 10);

    const wastedCreatives = structureRows
      .filter((row) => row.spend > 3000 && row.purchases === 0)
      .sort((a, b) => b.spend - a.spend);

    const spend = structureRows.reduce((s, r) => s + r.spend, 0);
    const revenue = structureRows.reduce((s, r) => s + r.revenue, 0);
    const purchases = structureRows.reduce((s, r) => s + r.purchases, 0);

    const verdict =
      wastedCreatives.length > 0
        ? `${wastedCreatives.length} live creatives are wasting spend. Pause/reduce these before scaling.`
        : improvingCreatives.length > 0
        ? `${improvingCreatives.length} live creatives show improving CPA with incremental purchases. Protect and scale cautiously.`
        : "No strong incremental CPA improvement pattern yet. Keep monitoring live creatives.";

    return {
      structureRows,
      improvingCreatives,
      topRoasCreatives,
      wastedCreatives,
      spend,
      revenue,
      purchases,
      roas: safeDiv(revenue, spend),
      cpa: safeDiv(spend, purchases),
      verdict,
    };
  }, [liveRows, settings]);

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Structure Report</h2>
        <MutedText className="mt-2">Upload Meta data first.</MutedText>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Structure Report"
        title="Live Campaign → Ad Set → Creative Report"
        description="Analyses live creatives only, with full campaign, ad set and ad name. CPA trend is calculated purchase-by-purchase."
      />

      <GlassCard className="p-6">
        <TonePill tone={data.wastedCreatives.length ? "red" : data.improvingCreatives.length ? "green" : "yellow"}>
          Live Creative Verdict
        </TonePill>
        <h2 className="mt-4 text-2xl font-black leading-tight">{data.verdict}</h2>
        <MutedText className="mt-2">
          Recommendation logic uses creatives that had impressions on the latest day in the uploaded data.
        </MutedText>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Live Spend" value={money(data.spend)} tone="neutral" />
        <MetricCard label="Live Revenue" value={money(data.revenue)} tone="green" />
        <MetricCard label="Live ROAS" value={num(data.roas)} tone={data.roas >= settings.targetRoas ? "green" : "red"} />
        <MetricCard label="Live CPA" value={money(data.cpa)} tone={data.cpa <= settings.targetCpa ? "green" : "red"} />
        <MetricCard label="Improving CPA Creatives" value={String(data.improvingCreatives.length)} tone={data.improvingCreatives.length ? "green" : "yellow"} />
        <MetricCard label="Top ROAS Creatives" value={String(data.topRoasCreatives.length)} tone="green" />
        <MetricCard label="Waste Creatives" value={String(data.wastedCreatives.length)} tone={data.wastedCreatives.length ? "red" : "green"} />
        <MetricCard label="Active Creatives" value={String(data.structureRows.length)} tone="blue" />
      </div>

      <GlassCard className="p-5">
        <h2 className="text-xl font-black">Creatives with Improving Incremental CPA</h2>
        <MutedText className="mt-1 text-sm">
          These creatives are becoming more efficient as purchases accumulate.
        </MutedText>

        <div className="mt-4 grid gap-3">
          {data.improvingCreatives.length ? (
            data.improvingCreatives.slice(0, 8).map((row) => (
              <Surface key={row.adId || row.adName} className="p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="font-black">{row.adName}</p>
                    <MutedText className="mt-1 text-sm">
                      Campaign: {row.campaignName} · Ad Set: {row.adSetName}
                    </MutedText>
                    <p className="mt-3 text-sm opacity-75">
                      {row.trendText}. ROAS {num(row.roas)}, CPA {money(row.cpa)}, Purchases {num(row.purchases, 0)}.
                    </p>
                  </div>
                  <TonePill tone="green">Improving CPA</TonePill>
                </div>
              </Surface>
            ))
          ) : (
            <Surface className="p-4">
              <MutedText>No live creative has shown a clear improving CPA trend yet.</MutedText>
            </Surface>
          )}
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="border-b border-current/10 p-5">
          <h2 className="text-xl font-black">Full Live Structure Report</h2>
          <MutedText className="mt-1 text-sm">
            Full campaign, ad set and ad names are shown for execution clarity.
          </MutedText>
        </div>

        <div className="overflow-auto">
          <table className="w-full min-w-[1800px] text-left text-sm">
            <thead
              className={
                isDark
                  ? "border-b border-white/10 bg-white/[0.04] text-[11px] uppercase tracking-[0.16em] text-white/45"
                  : "border-b border-black/10 bg-black/[0.035] text-[11px] uppercase tracking-[0.16em] text-black/55"
              }
            >
              <tr>
                <th className="px-5 py-4">Campaign</th>
                <th className="px-5 py-4">Ad Set</th>
                <th className="px-5 py-4">Ad Name</th>
                <th className="px-5 py-4">Spend</th>
                <th className="px-5 py-4">Revenue</th>
                <th className="px-5 py-4">ROAS</th>
                <th className="px-5 py-4">CPA</th>
                <th className="px-5 py-4">Purchases</th>
                <th className="px-5 py-4">CTR</th>
                <th className="px-5 py-4">LPV Rate</th>
                <th className="px-5 py-4">ATC Rate</th>
                <th className="px-5 py-4">Incremental CPA Trend</th>
                <th className="px-5 py-4">Recommendation</th>
              </tr>
            </thead>

            <tbody>
              {data.structureRows.map((row, index) => {
                const recommendation =
                  row.spend > 3000 && row.purchases === 0
                    ? "Pause/reduce. Spend crossed ₹3,000 with zero purchases."
                    : row.improving
                    ? "Protect and scale cautiously. CPA is improving with incremental purchases."
                    : row.roas >= settings.targetRoas && row.cpa <= settings.targetCpa
                    ? "Winner. Scale gradually and create backup variants."
                    : row.purchases > 0
                    ? "Hold. Let it collect more signal or improve creative/PDP."
                    : "Watch carefully. No purchase signal yet.";

                return (
                  <tr
                    key={`${row.adName}-${index}`}
                    className={
                      isDark
                        ? "border-b border-white/5 text-white hover:bg-white/[0.04]"
                        : "border-b border-black/5 text-black hover:bg-black/[0.035]"
                    }
                  >
                    <td className="min-w-[280px] whitespace-normal break-words px-5 py-4 opacity-75">{row.campaignName}</td>
                    <td className="min-w-[280px] whitespace-normal break-words px-5 py-4 opacity-75">{row.adSetName}</td>
                    <td className="min-w-[420px] whitespace-normal break-words px-5 py-4 font-black">{row.adName}</td>
                    <td className="px-5 py-4 opacity-75">{money(row.spend)}</td>
                    <td className="px-5 py-4 opacity-75">{money(row.revenue)}</td>
                    <td className="px-5 py-4 font-black text-emerald-400">{num(row.roas)}</td>
                    <td className="px-5 py-4 opacity-75">{money(row.cpa)}</td>
                    <td className="px-5 py-4 opacity-75">{num(row.purchases, 0)}</td>
                    <td className="px-5 py-4 opacity-75">{num(row.ctr)}%</td>
                    <td className="px-5 py-4 opacity-75">{num(row.lpvRate)}%</td>
                    <td className="px-5 py-4 opacity-75">{num(row.atcRate)}%</td>
                    <td className="min-w-[360px] px-5 py-4">
                      <div className="grid gap-2">
                        <TonePill tone={row.improving ? "green" : row.purchases > 0 ? "yellow" : "neutral"}>
                          {row.improving ? "Optimising" : row.purchases > 0 ? "Not Yet Improving" : "No Purchase"}
                        </TonePill>
                        <span className="text-xs leading-5 opacity-70">{row.trendText}</span>
                      </div>
                    </td>
                    <td className="min-w-[380px] px-5 py-4 text-xs leading-5 opacity-75">{recommendation}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
