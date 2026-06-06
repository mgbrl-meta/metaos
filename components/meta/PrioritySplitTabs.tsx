"use client";

import { useMemo } from "react";
import { ChevronDown, ShieldAlert, TrendingUp } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";

type Row = Record<string, any>;

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number, d = 1) => `${num(Number(n || 0) * 100, d)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);
const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

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
  return Number(row.revenue ?? row.purchaseValue ?? row.purchase_value ?? row.Purchases_conversion_value ?? row["Purchases conversion value"] ?? 0);
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

function changePct(current: number, base: number) {
  if (!base) return 0;
  return (current - base) / base;
}

function toneClass(tone: "red" | "green" | "amber" | "neutral") {
  if (tone === "red") return "text-red-600 dark:text-red-300";
  if (tone === "green") return "text-emerald-600 dark:text-emerald-300";
  if (tone === "amber") return "text-orange-600 dark:text-orange-300";
  return "";
}

function buildPriorityMatrix(rows: Row[]) {
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

  const items = Array.from(grouped.entries()).map(([adId, adRows]) => {
    const lifetime = summarize(adRows);
    const last7 = summarize(adRows.filter((row) => last7Dates.has(getDate(row))));
    const prev7 = summarize(adRows.filter((row) => prev7Dates.has(getDate(row))));

    const cpaChangeVsLife = changePct(last7.cpa, lifetime.cpa);
    const roasChangeVsLife = changePct(last7.roas, lifetime.roas);
    const ctrChangeVsLife = changePct(last7.ctr, lifetime.ctr);
    const cpmChangeVsLife = changePct(last7.cpm, lifetime.cpm);
    const spendChange7d = changePct(last7.spend, prev7.spend);

    const incrementalSpend = last7.spend - prev7.spend;
    const incrementalRevenue = last7.revenue - prev7.revenue;

    const cpaDecay = last7.spend >= 1000 && last7.purchases >= 1 && lifetime.cpa > 0 && last7.cpa >= lifetime.cpa * 1.25;
    const roasDecay = last7.spend >= 1000 && lifetime.roas > 0 && last7.roas <= lifetime.roas * 0.8;
    const attentionDecay =
      last7.impressions >= 1000 &&
      lifetime.ctr > 0 &&
      lifetime.cpm > 0 &&
      last7.ctr <= lifetime.ctr * 0.85 &&
      last7.cpm >= lifetime.cpm * 1.1;

    const badScale =
      prev7.spend > 0 &&
      last7.spend >= prev7.spend * 1.1 &&
      ((prev7.cpa > 0 && last7.cpa >= prev7.cpa * 1.15) ||
        (prev7.roas > 0 && last7.roas <= prev7.roas * 0.85));

    const scaleFatigue =
      prev7.spend > 0 &&
      last7.spend > prev7.spend &&
      prev7.cpa > 0 &&
      prev7.roas > 0 &&
      last7.cpa > prev7.cpa &&
      last7.roas < prev7.roas;

    const efficientScale =
      prev7.spend > 0 &&
      last7.spend >= prev7.spend * 1.1 &&
      ((prev7.cpa > 0 && last7.cpa <= prev7.cpa * 0.9) ||
        (prev7.roas > 0 && last7.roas >= prev7.roas * 1.1));

    const underfedWinner =
      last7.spend <= 3000 &&
      last7.purchases >= 2 &&
      last7.roas >= 1.2 &&
      lifetime.cpa > 0 &&
      last7.cpa <= lifetime.cpa;

    const spendRiskScore = clamp(last7.spend / 400, 0, 25);
    const cpaDecayScore = cpaDecay ? clamp(cpaChangeVsLife * 60, 10, 25) : 0;
    const roasDecayScore = roasDecay ? clamp(Math.abs(roasChangeVsLife) * 70, 10, 25) : 0;
    const attentionScore = attentionDecay ? clamp(Math.abs(ctrChangeVsLife) * 40 + cpmChangeVsLife * 25, 8, 15) : 0;
    const badScaleScore = badScale ? 30 : 0;
    const scaleFatigueScore = scaleFatigue ? 25 : 0;

    const efficientScaleScore = efficientScale ? 25 : 0;
    const underfedWinnerScore = underfedWinner ? 30 : 0;
    const opportunitySpendScore = underfedWinner ? clamp((3000 - last7.spend) / 150, 0, 20) : 0;

    const descalingScore = Math.round(
      cpaDecayScore + roasDecayScore + attentionScore + badScaleScore + scaleFatigueScore + spendRiskScore
    );

    const scalingScore = Math.round(
      efficientScaleScore + underfedWinnerScore + opportunitySpendScore + clamp(last7.roas * 5, 0, 15)
    );

    const descalingSignals = [
      badScale ? "Bad Scale" : null,
      scaleFatigue ? "Scale Fatigue" : null,
      cpaDecay ? "CPA Decay" : null,
      roasDecay ? "ROAS Decay" : null,
      attentionDecay ? "Attention Decay" : null,
    ].filter(Boolean) as string[];

    const scalingSignals = [
      efficientScale ? "Efficient Scale" : null,
      underfedWinner ? "Underfed Winner" : null,
    ].filter(Boolean) as string[];

    let primaryIssue = "Watch";
    if (badScale) primaryIssue = "Bad Scale";
    else if (scaleFatigue) primaryIssue = "Scale Fatigue";
    else if (cpaDecay && roasDecay) primaryIssue = "CPA + ROAS Decay";
    else if (roasDecay) primaryIssue = "ROAS Decay";
    else if (cpaDecay) primaryIssue = "CPA Decay";
    else if (attentionDecay) primaryIssue = "Attention Decay";

    let scalingReason = "No Scale Signal";
    if (underfedWinner) scalingReason = "Underfed Winner";
    else if (efficientScale) scalingReason = "Efficient Scale";

    let descalingAction = "Watch";
    if (badScale || scaleFatigue) descalingAction = "Do Not Scale / Reduce";
    if (cpaDecay && roasDecay) descalingAction = "Refresh or Pause";
    if (attentionDecay && !cpaDecay && !roasDecay) descalingAction = "Refresh Creative";

    let scalingAction = "Hold";
    if (underfedWinner) scalingAction = "Increase Budget Carefully";
    if (efficientScale) scalingAction = "Eligible to Scale";

    return {
      key: adId,
      adName: getAdName(adRows[0]),
      campaign: getCampaign(adRows[0]),
      adSet: getAdSet(adRows[0]),
      latestDate,
      lifetime,
      last7,
      prev7,
      cpaChangeVsLife,
      roasChangeVsLife,
      ctrChangeVsLife,
      cpmChangeVsLife,
      spendChange7d,
      incrementalSpend,
      incrementalRevenue,
      descalingScore,
      scalingScore,
      descalingSignals,
      scalingSignals,
      primaryIssue,
      scalingReason,
      descalingAction,
      scalingAction,
    };
  });

  const descaling = items
    .filter((item) => item.descalingScore >= 25)
    .sort((a, b) => b.descalingScore - a.descalingScore);

  const scaling = items
    .filter((item) => item.scalingScore >= 30 && item.descalingScore < 45)
    .sort((a, b) => b.scalingScore - a.scalingScore);

  return { latestDate, descaling, scaling };
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

function Tag({ children, tone = "red" }: { children: string; tone?: "red" | "green" | "blue" }) {
  const cls =
    tone === "green"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
      : tone === "blue"
        ? "border-[#0A84FF]/30 bg-[#0A84FF]/10 text-[#0A84FF]"
        : "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300";

  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${cls}`}>{children}</span>;
}

function InfoBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-xl border border-current/10 bg-current/[0.025] p-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] opacity-60">{title}</p>
      <ul className="mt-2 space-y-1 text-sm opacity-80">
        {lines.map((line) => <li key={line}>• {line}</li>)}
      </ul>
    </div>
  );
}

function CreativeRow({ item, rank, mode }: { item: any; rank: number; mode: "descale" | "scale" }) {
  const isDescale = mode === "descale";

  return (
    <details className="group">
      <summary className="creative-summary-row cursor-pointer list-none px-4 py-3 text-xs hover:bg-current/[0.035]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={isDescale ? "red" : "green"}>#{rank}</Tag>
            <Tag tone={isDescale ? "red" : "green"}>{isDescale ? item.primaryIssue : item.scalingReason}</Tag>
            <Tag tone="blue">{isDescale ? item.descalingAction : item.scalingAction}</Tag>
          </div>

          <p className="mt-2 truncate text-sm font-black">{item.adName}</p>
          <p className="mt-0.5 truncate opacity-60">{item.campaign} · {item.adSet}</p>
        </div>

        <Metric label={isDescale ? "Risk Score" : "Scale Score"} value={String(isDescale ? item.descalingScore : item.scalingScore)} tone={isDescale ? "red" : "green"} />
        <Metric label="7D Spend" value={money(item.last7.spend)} />
        <Metric label="7D CPA" value={item.last7.purchases > 0 ? money(item.last7.cpa) : "No sale"} tone={item.cpaChangeVsLife > 0 ? "red" : "green"} />
        <Metric label="7D ROAS" value={`${num(item.last7.roas)}x`} tone={item.roasChangeVsLife >= 0 ? "green" : "red"} />
        <Metric label="CPA Δ" value={pct(item.cpaChangeVsLife)} tone={item.cpaChangeVsLife > 0 ? "red" : "green"} />
        <Metric label="ROAS Δ" value={pct(item.roasChangeVsLife)} tone={item.roasChangeVsLife >= 0 ? "green" : "red"} />
        <Metric label="Spend Δ" value={pct(item.spendChange7d)} tone={item.spendChange7d > 0 ? "amber" : "neutral"} />

        <ChevronDown className="h-4 w-4 opacity-45 transition group-open:rotate-180" />
      </summary>

      <div className="grid gap-3 px-4 pb-4 lg:grid-cols-3">
        <InfoBox
          title={isDescale ? "Why Not Scale" : "Why Scale"}
          lines={
            isDescale
              ? [
                  `Primary issue: ${item.primaryIssue}.`,
                  `Signals: ${item.descalingSignals.join(", ") || "No severe signal"}.`,
                  `Last 7D spend at risk: ${money(item.last7.spend)}.`,
                ]
              : [
                  `Scale reason: ${item.scalingReason}.`,
                  `Signals: ${item.scalingSignals.join(", ") || "No scale signal"}.`,
                  `Last 7D ROAS: ${num(item.last7.roas)}x with ${num(item.last7.purchases, 0)} purchases.`,
                ]
          }
        />

        <InfoBox
          title="Recent vs Historical"
          lines={[
            `Lifetime CPA: ${money(item.lifetime.cpa)} | Last 7D CPA: ${item.last7.purchases > 0 ? money(item.last7.cpa) : "No sale"}`,
            `Lifetime ROAS: ${num(item.lifetime.roas)}x | Last 7D ROAS: ${num(item.last7.roas)}x`,
            `Previous 7D spend: ${money(item.prev7.spend)} | Last 7D spend: ${money(item.last7.spend)}`,
            `Incremental revenue: ${money(item.incrementalRevenue)}`,
          ]}
        />

        <InfoBox
          title="Action"
          lines={
            isDescale
              ? [
                  item.descalingAction,
                  "Do not increase budget until the recent trend improves.",
                  "If attention decay is present, refresh hook/visual before re-scaling.",
                ]
              : [
                  item.scalingAction,
                  "Scale gradually, not aggressively.",
                  "Monitor CPA and ROAS for 2–3 days after budget movement.",
                ]
          }
        />
      </div>
    </details>
  );
}

export function TopDescalingPrioritiesTab() {
  const rows = useMetaStore((state) => state.performanceRows);
  const data = useMemo(() => buildPriorityMatrix(rows), [rows]);

  const spendAtRisk = data.descaling.reduce((sum: number, item: any) => sum + Number(item.last7?.spend || 0), 0);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-red-300/30 bg-red-50/40 p-4 dark:bg-red-950/10">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-500" />
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-500">Risk Priority Queue</p>
        </div>
        <h1 className="mt-1 text-2xl font-black">Top De-scaling Priorities</h1>
        <p className="mt-1 max-w-4xl text-sm opacity-60">
          Ranked creatives that should not receive more budget right now. Score uses CPA decay, ROAS decay, attention decay, bad scale, scale fatigue and recent spend risk.
        </p>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <Kpi label="Priority Ads" value={String(data.descaling.length)} tone={data.descaling.length ? "red" : "green"} />
          <Kpi label="Highest Risk Score" value={String(data.descaling[0]?.descalingScore || 0)} tone={data.descaling.length ? "red" : "green"} />
          <Kpi label="7D Spend At Risk" value={money(spendAtRisk)} tone={spendAtRisk ? "red" : "green"} />
          <Kpi label="Latest Date" value={data.latestDate || "NA"} />
        </div>
      </section>

      <section className="rounded-xl border border-red-300/30 bg-red-50/40 dark:bg-red-950/10">
        <div className="border-b border-current/10 px-4 py-3">
          <h2 className="text-lg font-black">Ranked De-scaling Queue</h2>
          <p className="mt-1 text-sm opacity-60">Start from rank #1. These are most likely to waste incremental budget if scaled further.</p>
        </div>

        <div className="divide-y divide-current/10">
          {data.descaling.map((item: any, index: number) => (
            <CreativeRow key={`descale-${item.key}`} item={item} rank={index + 1} mode="descale" />
          ))}

          {!data.descaling.length ? (
            <div className="p-5">
              <p className="font-black">No de-scaling priorities found.</p>
              <p className="mt-1 text-sm opacity-60">No active creatives currently show enough risk to reduce, pause, or refresh.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function TopScalingPrioritiesTab() {
  const rows = useMetaStore((state) => state.performanceRows);
  const data = useMemo(() => buildPriorityMatrix(rows), [rows]);

  const candidateSpend = data.scaling.reduce((sum: number, item: any) => sum + Number(item.last7?.spend || 0), 0);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-emerald-300/30 bg-emerald-50/40 p-4 dark:bg-emerald-950/10">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-500">Scale Opportunity Queue</p>
        </div>
        <h1 className="mt-1 text-2xl font-black">Top Scaling Priorities</h1>
        <p className="mt-1 max-w-4xl text-sm opacity-60">
          Ranked creatives eligible for controlled scaling. Score uses efficient scale, underfed winner signal, ROAS strength, CPA stability and purchase confidence.
        </p>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <Kpi label="Scale Candidates" value={String(data.scaling.length)} tone={data.scaling.length ? "green" : "neutral"} />
          <Kpi label="Highest Scale Score" value={String(data.scaling[0]?.scalingScore || 0)} tone={data.scaling.length ? "green" : "neutral"} />
          <Kpi label="7D Candidate Spend" value={money(candidateSpend)} tone="green" />
          <Kpi label="Latest Date" value={data.latestDate || "NA"} />
        </div>
      </section>

      <section className="rounded-xl border border-emerald-300/30 bg-emerald-50/40 dark:bg-emerald-950/10">
        <div className="border-b border-current/10 px-4 py-3">
          <h2 className="text-lg font-black">Ranked Scaling Queue</h2>
          <p className="mt-1 text-sm opacity-60">Start from rank #1. These creatives have earned more budget or controlled extraction into the scaling setup.</p>
        </div>

        <div className="divide-y divide-current/10">
          {data.scaling.map((item: any, index: number) => (
            <CreativeRow key={`scale-${item.key}`} item={item} rank={index + 1} mode="scale" />
          ))}

          {!data.scaling.length ? (
            <div className="p-5">
              <p className="font-black">No scaling priorities found.</p>
              <p className="mt-1 text-sm opacity-60">No active creatives currently meet the scale-quality criteria.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
