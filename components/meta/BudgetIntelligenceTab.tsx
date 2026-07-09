"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Banknote,
  ChevronDown,
  CircleDollarSign,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMetaStore } from "@/store/metaStore";

type Row = Record<string, any>;
type Bucket = "WINNER" | "WASTE" | "TESTING" | "WATCH" | "UNKNOWN";

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number, d = 1) => `${num(Number(n || 0) * 100, d)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

const WINNER_MIN_ROAS = 1;
const WINNER_MIN_PURCHASES = 5;
const WASTE_MIN_SPEND = 3000;
const TESTING_MAX_SPEND = 3000;
const HIGH_CPA = 3000;

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

function getImpressions(row: Row) {
  return Number(row.impressions ?? row.Impressions ?? 0);
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

function latestDate(rows: Row[]) {
  const dates = rows.map((r) => parseDate(getDate(r))).filter(Boolean) as Date[];
  if (!dates.length) return "";
  return dateKey(new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString());
}

function windowRows(rows: Row[], latest: string, days: number) {
  const end = parseDate(latest);
  if (!end) return [];

  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);

  return rows.filter((row) => {
    const d = parseDate(getDate(row));
    return d ? d >= start && d <= end : false;
  });
}

function priorWindowRows(rows: Row[], latest: string, days: number) {
  const end = parseDate(latest);
  if (!end) return [];

  const priorEnd = new Date(end);
  priorEnd.setDate(priorEnd.getDate() - days);

  const priorStart = new Date(priorEnd);
  priorStart.setDate(priorStart.getDate() - days + 1);

  return rows.filter((row) => {
    const d = parseDate(getDate(row));
    return d ? d >= priorStart && d <= priorEnd : false;
  });
}

function summarize(rows: Row[]) {
  const spend = rows.reduce((s, r) => s + getSpend(r), 0);
  const purchases = rows.reduce((s, r) => s + getPurchases(r), 0);
  const revenue = rows.reduce((s, r) => s + getRevenue(r), 0);
  const impressions = rows.reduce((s, r) => s + getImpressions(r), 0);
  const clicks = rows.reduce((s, r) => s + getClicks(r), 0);

  return {
    spend,
    purchases,
    revenue,
    impressions,
    clicks,
    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, purchases),
    ctr: safeDiv(clicks, impressions),
    cpc: safeDiv(spend, clicks),
  };
}

function change(current: number, prior: number) {
  if (!prior) return 0;
  return (current - prior) / prior;
}

function groupCreativeLifetime(rows: Row[]) {
  const map = new Map<string, Row[]>();

  rows.forEach((row) => {
    const key = getAdId(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  return map;
}

function classifyCreative(lifetime: ReturnType<typeof summarize>): Bucket {
  if (lifetime.spend <= 0) return "UNKNOWN";

  if (lifetime.roas > WINNER_MIN_ROAS && lifetime.purchases > WINNER_MIN_PURCHASES) {
    return "WINNER";
  }

  if (lifetime.spend >= WASTE_MIN_SPEND && lifetime.purchases === 0) {
    return "WASTE";
  }

  if (lifetime.purchases > 0 && lifetime.cpa > HIGH_CPA) {
    return "WASTE";
  }

  if (lifetime.spend < TESTING_MAX_SPEND) {
    return "TESTING";
  }

  return "WATCH";
}

function buildCreativeItems(allRows: Row[], periodRows: Row[], latest: string) {
  const lifetimeMap = groupCreativeLifetime(allRows);
  const periodMap = new Map<string, Row[]>();

  periodRows.forEach((row) => {
    const key = getAdId(row);
    if (!periodMap.has(key)) periodMap.set(key, []);
    periodMap.get(key)!.push(row);
  });

  return Array.from(periodMap.entries())
    .map(([key, rows]) => {
      const lifetimeRows = lifetimeMap.get(key) || [];
      const sample = rows[0];
      const period = summarize(rows);
      const lifetime = summarize(lifetimeRows);
      const yesterday = summarize(rows.filter((row) => dateKey(getDate(row)) === latest));
      const bucket = classifyCreative(lifetime);

      return {
        key,
        ad: getAd(sample),
        campaign: getCampaign(sample),
        adSet: getAdSet(sample),
        bucket,
        period,
        lifetime,
        yesterday,
      };
    })
    .filter((item) => item.period.spend > 0)
    .sort((a, b) => b.period.spend - a.period.spend);
}

function bucketSummary(items: any[], bucket: Bucket) {
  const filtered = items.filter((item) => item.bucket === bucket);
  const spend = filtered.reduce((s, x) => s + x.period.spend, 0);
  const purchases = filtered.reduce((s, x) => s + x.period.purchases, 0);
  const revenue = filtered.reduce((s, x) => s + x.period.revenue, 0);

  return {
    count: filtered.length,
    spend,
    purchases,
    revenue,
    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, purchases),
    items: filtered,
  };
}

function marginal(current: ReturnType<typeof summarize>, prior: ReturnType<typeof summarize>) {
  const spendDelta = current.spend - prior.spend;
  const revenueDelta = current.revenue - prior.revenue;
  const purchaseDelta = current.purchases - prior.purchases;

  return {
    spendDelta,
    revenueDelta,
    purchaseDelta,
    marginalRoas: safeDiv(revenueDelta, spendDelta),
    marginalCpa: safeDiv(spendDelta, purchaseDelta),
  };
}

function recommendation(data: any) {
  const lines: string[] = [];

  if (data.wasteShare > 0.15) {
    lines.push(`Waste spend share is ${pct(data.wasteShare)}. First action: cut or cap waste creatives.`);
  }

  if (data.winnerShare < 0.45 && data.winner.spend > 0) {
    lines.push(`Winner spend share is only ${pct(data.winnerShare)}. Meta is not allocating enough to proven winners.`);
  }

  if (data.testingShare > 0.25) {
    lines.push(`Testing spend share is ${pct(data.testingShare)}. Testing budget may be too high versus current winner base.`);
  }

  if (data.marginal.marginalCpa > HIGH_CPA && data.marginal.spendDelta > 0) {
    lines.push(`Incremental spend is inefficient. Marginal CPA is ${money(data.marginal.marginalCpa)}.`);
  }

  if (data.marginal.marginalRoas > 0 && data.marginal.marginalRoas < 0.8 && data.marginal.spendDelta > 0) {
    lines.push(`Marginal ROAS is only ${num(data.marginal.marginalRoas)}x. Scale is not paying back.`);
  }

  if (!lines.length) {
    lines.push("Budget allocation is acceptable. Keep monitoring winner share and waste share daily.");
  }

  return lines;
}

function allocationLabel(bucket: Bucket) {
  if (bucket === "WINNER") return "Winner";
  if (bucket === "WASTE") return "Waste";
  if (bucket === "TESTING") return "Testing";
  if (bucket === "WATCH") return "Watch";
  return "Unknown";
}

function bucketTone(bucket: Bucket) {
  if (bucket === "WINNER") return "green";
  if (bucket === "WASTE") return "red";
  if (bucket === "TESTING") return "amber";
  return "neutral";
}

export function BudgetIntelligenceTab() {
  const rows = useMetaStore((state) => state.performanceRows);

  const data = useMemo(() => {
    const latest = latestDate(rows || []);
    const currentRows = windowRows(rows || [], latest, 7);
    const priorRows = priorWindowRows(rows || [], latest, 7);

    const current = summarize(currentRows);
    const prior = summarize(priorRows);
    const creativeItems = buildCreativeItems(rows || [], currentRows, latest);

    const winner = bucketSummary(creativeItems, "WINNER");
    const waste = bucketSummary(creativeItems, "WASTE");
    const testing = bucketSummary(creativeItems, "TESTING");
    const watch = bucketSummary(creativeItems, "WATCH");

    const winnerShare = safeDiv(winner.spend, current.spend);
    const wasteShare = safeDiv(waste.spend, current.spend);
    const testingShare = safeDiv(testing.spend, current.spend);
    const watchShare = safeDiv(watch.spend, current.spend);

    const marginalData = marginal(current, prior);

    const recoverableSpend = waste.spend;
    const winnerCpa = winner.cpa || current.cpa || 0;
    const potentialPurchases = safeDiv(recoverableSpend, winnerCpa);
    const accountAov = safeDiv(current.revenue, current.purchases);
    const potentialRevenue = potentialPurchases * accountAov;

    const output = {
      latest,
      current,
      prior,
      creativeItems,
      winner,
      waste,
      testing,
      watch,
      winnerShare,
      wasteShare,
      testingShare,
      watchShare,
      marginal: marginalData,
      recoverableSpend,
      potentialPurchases,
      potentialRevenue,
      spendChange: change(current.spend, prior.spend),
      roasChange: change(current.roas, prior.roas),
      cpaChange: change(current.cpa, prior.cpa),
    };

    return {
      ...output,
      recommendations: recommendation(output),
    };
  }, [rows]);

  const allocation = [
    { bucket: "WINNER" as Bucket, data: data.winner, share: data.winnerShare },
    { bucket: "WASTE" as Bucket, data: data.waste, share: data.wasteShare },
    { bucket: "TESTING" as Bucket, data: data.testing, share: data.testingShare },
    { bucket: "WATCH" as Bucket, data: data.watch, share: data.watchShare },
  ];

  return (
    <div className="grid gap-3">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0A84FF]">
              Budget Intelligence
            </p>
            <h1 className="mt-1 text-2xl font-black">Budget Allocation Control Room</h1>
            <p className="mt-1 text-sm opacity-60">
              Checks whether Meta is spending on winners, wasting money, over-testing, or scaling inefficiently.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs">
            <Kpi label="L7 Spend" value={money(data.current.spend)} />
            <Kpi label="L7 ROAS" value={`${num(data.current.roas)}x`} tone={data.current.roas >= 1 ? "green" : "red"} />
            <Kpi label="L7 CPA" value={money(data.current.cpa)} tone={data.current.cpa <= 1800 ? "green" : "red"} />
            <Kpi label="Latest" value={data.latest || "NA"} />
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Winner Spend Share"
          value={pct(data.winnerShare)}
          sub={`${money(data.winner.spend)} on proven winners`}
          tone={data.winnerShare >= 0.45 ? "green" : "red"}
        />
        <MetricCard
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Waste Spend Share"
          value={pct(data.wasteShare)}
          sub={`${money(data.waste.spend)} on waste creatives`}
          tone={data.wasteShare <= 0.1 ? "green" : "red"}
        />
        <MetricCard
          icon={<Wallet className="h-4 w-4" />}
          title="Testing Spend Share"
          value={pct(data.testingShare)}
          sub={`${money(data.testing.spend)} on immature tests`}
          tone={data.testingShare <= 0.2 ? "green" : "amber"}
        />
        <MetricCard
          icon={<CircleDollarSign className="h-4 w-4" />}
          title="Recoverable Spend"
          value={money(data.recoverableSpend)}
          sub={`Possible revenue recovery ${money(data.potentialRevenue)}`}
          tone={data.recoverableSpend > 0 ? "red" : "green"}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
          <div className="mb-3 flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-[#0A84FF]" />
            <h2 className="text-lg font-black">Spend Shift vs Performance Shift</h2>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <Kpi label="Spend Change" value={pct(data.spendChange)} tone={data.spendChange > 0 ? "green" : undefined} />
            <Kpi label="ROAS Change" value={pct(data.roasChange)} tone={data.roasChange >= 0 ? "green" : "red"} />
            <Kpi label="CPA Change" value={pct(data.cpaChange)} tone={data.cpaChange <= 0 ? "green" : "red"} />
          </div>

          <div className="mt-3 rounded-lg border border-current/10 bg-current/[0.025] p-3 text-sm leading-6 opacity-80">
            {data.spendChange > 0 && data.roasChange < 0 ? (
              <p>Spend increased while ROAS declined. This usually means Meta pushed budget into weaker pockets or marginal scale is breaking.</p>
            ) : data.spendChange < 0 && data.roasChange > 0 ? (
              <p>Spend reduced while ROAS improved. Account may be more efficient at lower scale, but scale ceiling needs testing carefully.</p>
            ) : data.spendChange > 0 && data.roasChange > 0 ? (
              <p>Spend and ROAS both improved. This is a healthy scale signal if marginal CPA is also acceptable.</p>
            ) : (
              <p>No major spend-performance shift detected. Use allocation share and creative buckets for next actions.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <h2 className="text-lg font-black">Marginal Efficiency</h2>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <Kpi label="Spend Delta" value={money(data.marginal.spendDelta)} />
            <Kpi
              label="Marginal ROAS"
              value={`${num(data.marginal.marginalRoas)}x`}
              tone={data.marginal.marginalRoas >= 1 ? "green" : "red"}
            />
            <Kpi
              label="Marginal CPA"
              value={money(data.marginal.marginalCpa)}
              tone={data.marginal.marginalCpa <= 1800 ? "green" : "red"}
            />
          </div>

          <div className="mt-3 rounded-lg border border-current/10 bg-current/[0.025] p-3 text-sm leading-6 opacity-80">
            <p>
              Marginal metrics estimate the efficiency of incremental spend vs prior 7 days. If average CPA looks fine but marginal CPA is high, scaling is already breaking.
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Banknote className="h-4 w-4 text-[#0A84FF]" />
          <h2 className="text-lg font-black">Budget Allocation Mix</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {allocation.map((item) => (
            <AllocationCard
              key={item.bucket}
              bucket={item.bucket}
              spend={item.data.spend}
              share={item.share}
              count={item.data.count}
              roas={item.data.roas}
              cpa={item.data.cpa}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <h2 className="text-lg font-black">Reallocation Recommendation</h2>
        </div>

        <div className="grid gap-2">
          {data.recommendations.map((line: string) => (
            <div key={line} className="rounded-lg border border-current/10 bg-current/[0.025] p-3 text-sm leading-6">
              {line}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <h2 className="text-lg font-black">Creative Budget Buckets</h2>
          <p className="mt-1 text-sm opacity-60">
            Expand each creative to see why it is classified as winner, waste, testing or watch.
          </p>
        </div>

        <div className="divide-y divide-current/10">
          {data.creativeItems.slice(0, 80).map((item: any) => (
            <details key={item.key} className="group">
              <summary className="grid cursor-pointer list-none grid-cols-[1fr_88px_82px_86px_82px_82px_24px] items-center gap-3 px-4 py-3 text-xs hover:bg-current/[0.035]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <BucketPill bucket={item.bucket} />
                    <span className="rounded-full border border-current/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] opacity-70">
                      Lifetime {num(item.lifetime.roas)}x
                    </span>
                  </div>

                  <p className="mt-1 truncate text-sm font-black">{item.ad}</p>
                  <p className="mt-0.5 truncate opacity-60">
                    {item.campaign} · {item.adSet}
                  </p>
                </div>

                <Metric label="L7 Spend" value={money(item.period.spend)} />
                <Metric label="L7 ROAS" value={`${num(item.period.roas)}x`} tone={item.period.roas >= 1 ? "green" : "red"} />
                <Metric label="L7 CPA" value={item.period.purchases > 0 ? money(item.period.cpa) : "No sale"} tone={item.period.purchases > 0 && item.period.cpa <= 1800 ? "green" : "red"} />
                <Metric label="Purch." value={num(item.period.purchases, 0)} />
                <Metric label="Life Spend" value={money(item.lifetime.spend)} />
                <ChevronDown className="h-4 w-4 opacity-45 transition group-open:rotate-180" />
              </summary>

              <div className="grid gap-3 px-4 pb-4 md:grid-cols-3">
                <InfoBox
                  title="Classification"
                  lines={[
                    `Bucket: ${allocationLabel(item.bucket)}`,
                    `Lifetime ROAS: ${num(item.lifetime.roas)}x`,
                    `Lifetime purchases: ${num(item.lifetime.purchases, 0)}`,
                    `Lifetime CPA: ${item.lifetime.purchases > 0 ? money(item.lifetime.cpa) : "No sale"}`,
                  ]}
                />
                <InfoBox
                  title="Period Performance"
                  lines={[
                    `Last 7 day spend: ${money(item.period.spend)}`,
                    `Last 7 day ROAS: ${num(item.period.roas)}x`,
                    `Last 7 day CPA: ${item.period.purchases > 0 ? money(item.period.cpa) : "No sale"}`,
                    `CTR: ${pct(item.period.ctr, 2)}`,
                  ]}
                />
                <InfoBox
                  title="Action"
                  lines={
                    item.bucket === "WINNER"
                      ? ["Protect budget.", "Create variants separately.", "Avoid editing working ad."]
                      : item.bucket === "WASTE"
                      ? ["Cut or cap immediately.", "Recover spend for winners.", "Rebuild creative before retest."]
                      : item.bucket === "TESTING"
                      ? ["Keep capped.", "Wait for signal.", "Do not let test consume winner budget."]
                      : ["Monitor.", "Move only after 2–3 day signal.", "Check against winners."]
                  }
                />
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "red" | "green";
}) {
  return (
    <div className="rounded-lg border border-current/10 bg-current/[0.035] px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-45">{label}</p>
      <p
        className={
          tone === "red"
            ? "mt-0.5 font-black text-red-600 dark:text-red-300"
            : tone === "green"
            ? "mt-0.5 font-black text-emerald-600 dark:text-emerald-300"
            : "mt-0.5 font-black"
        }
      >
        {value}
      </p>
    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
  tone: "red" | "green" | "amber";
}) {
  const cls =
    tone === "red"
      ? "text-red-600 dark:text-red-300"
      : tone === "green"
      ? "text-emerald-600 dark:text-emerald-300"
      : "text-orange-600 dark:text-orange-300";

  return (
    <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">{title}</p>
        <span className={cls}>{icon}</span>
      </div>
      <p className={`mt-2 text-2xl font-black ${cls}`}>{value}</p>
      <p className="mt-1 text-xs leading-5 opacity-60">{sub}</p>
    </section>
  );
}

function AllocationCard({
  bucket,
  spend,
  share,
  count,
  roas,
  cpa,
}: {
  bucket: Bucket;
  spend: number;
  share: number;
  count: number;
  roas: number;
  cpa: number;
}) {
  const tone = bucketTone(bucket);

  return (
    <div className="rounded-xl border border-current/10 bg-current/[0.025] p-3">
      <div className="flex items-center justify-between gap-2">
        <BucketPill bucket={bucket} />
        <span className="text-xs font-black opacity-60">{count} creatives</span>
      </div>

      <p className="mt-3 text-xl font-black">{money(spend)}</p>
      <p
        className={
          tone === "red"
            ? "mt-1 text-sm font-black text-red-600 dark:text-red-300"
            : tone === "green"
            ? "mt-1 text-sm font-black text-emerald-600 dark:text-emerald-300"
            : tone === "amber"
            ? "mt-1 text-sm font-black text-orange-600 dark:text-orange-300"
            : "mt-1 text-sm font-black"
        }
      >
        {pct(share)} of spend
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Kpi label="ROAS" value={`${num(roas)}x`} tone={roas >= 1 ? "green" : "red"} />
        <Kpi label="CPA" value={cpa > 0 ? money(cpa) : "NA"} tone={cpa > 0 && cpa <= 1800 ? "green" : "red"} />
      </div>
    </div>
  );
}

function BucketPill({ bucket }: { bucket: Bucket }) {
  const tone = bucketTone(bucket);

  const cls =
    tone === "red"
      ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
      : tone === "green"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
      : tone === "amber"
      ? "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300"
      : "border-slate-300 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70";

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${cls}`}>
      {allocationLabel(bucket)}
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
      <p
        className={
          tone === "red"
            ? "mt-0.5 font-black text-red-600 dark:text-red-300"
            : tone === "green"
            ? "mt-0.5 font-black text-emerald-600 dark:text-emerald-300"
            : "mt-0.5 font-black"
        }
      >
        {value}
      </p>
    </div>
  );
}

function InfoBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-current/10 bg-current/[0.025] p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] opacity-55">{title}</p>
      <ul className="mt-2 grid gap-1.5 text-xs leading-5 opacity-75">
        {lines.map((line) => (
          <li key={line}>• {line}</li>
        ))}
      </ul>
    </div>
  );
}
