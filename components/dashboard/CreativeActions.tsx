"use client";

import { useMemo } from "react";
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
import { aggregateRows } from "@/lib/metrics";
import { onlyLiveRows } from "@/lib/liveFilter";
import { MetaChartTooltip, compactMoney } from "@/components/charts/MetaChartTooltip";
import {
  GlassCard,
  MetricCard,
  MutedText,
  PageHeader,
  Surface,
  TonePill,
} from "@/components/cards/MetaCards";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
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
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function adKey(row: any) {
  return String(row.adId || row.adName || "").trim();
}

function revenueValue(row: any) {
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

function buildAdDailyTrend(rows: any[], targetAd: any) {
  const key = adKey(targetAd);
  const map = new Map<string, any>();

  rows
    .filter((row) => adKey(row) === key)
    .forEach((row) => {
      const date = dateKey(row.date);
      if (!date) return;

      if (!map.has(date)) {
        map.set(date, {
          date,
          label: displayDate(date),
          spend: 0,
          revenue: 0,
          purchases: 0,
        });
      }

      const item = map.get(date);
      item.spend += Number(row.spend || 0);
      item.revenue += revenueValue(row);
      item.purchases += Number(row.purchases || 0);
    });

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      cpa: safeDiv(item.spend, item.purchases),
      roas: safeDiv(item.revenue, item.spend),
      aov: safeDiv(item.revenue, item.purchases),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function diagnosis(row: any, settings: any) {
  if (row.spend > 3000 && row.purchases === 0) {
    if (row.ctr >= settings.targetCtrPct && row.lpvRate >= settings.targetClickToLpvRatePct) {
      return {
        label: "Traffic ok, conversion weak",
        tone: "red" as const,
        action:
          "Do not scale. The creative is getting attention but not converting. Check PDP, offer, trust proof, price anchoring and landing page message match.",
      };
    }

    if (row.ctr < settings.targetCtrPct) {
      return {
        label: "Hook weak",
        tone: "red" as const,
        action:
          "Pause or rebuild. First frame and opening hook are weak. Test a sharper pain-point hook, stronger visual contrast and clearer product promise.",
      };
    }

    return {
      label: "Waste risk",
      tone: "red" as const,
      action:
        "Pause/reduce today. Spend has crossed threshold without purchase signal. Relaunch only with a new hook or stronger proof.",
    };
  }

  if (row.roas >= settings.targetRoas && row.cpa <= settings.targetCpa && row.purchases > 0) {
    return {
      label: "Winner angle",
      tone: "green" as const,
      action:
        "Protect and scale slowly. Create 2–3 variants from the same winning idea: one new hook, one proof-led version and one offer-led version.",
    };
  }

  if (row.frequency > settings.maxHealthyFrequency || row.fatigueScore >= 70) {
    return {
      label: "Fatigue risk",
      tone: "yellow" as const,
      action:
        "Do not increase budget aggressively. Keep the angle if it worked, but refresh creator, first frame, background, proof point or format.",
    };
  }

  if (row.purchases > 0 && row.cpa > settings.targetCpa) {
    return {
      label: "CPA high",
      tone: "yellow" as const,
      action:
        "Hold budget. Improve conversion quality with stronger offer framing, more direct product proof and better objection handling.",
    };
  }

  if (row.spend < settings.minSpendForDecision) {
    return {
      label: "Needs more signal",
      tone: "neutral" as const,
      action:
        "Do not judge yet. Let it collect more spend unless CTR is clearly weak. Watch CPA and purchase signal tomorrow.",
    };
  }

  return {
    label: "Needs stronger signal",
    tone: "yellow" as const,
    action:
      "No decisive creative signal yet. Keep budget stable and test a stronger hook/proof variation before scaling.",
  };
}

function creativeBrief(row: any, settings: any) {
  const d = diagnosis(row, settings).label;

  if (d === "Winner angle") {
    return [
      "Make 2 variants using the same core winning hook.",
      "Create one proof-led version using review, result, before-after or science proof.",
      "Create one offer-led version for warm audience.",
      "Do not over-edit the winner. Keep the main promise intact.",
    ];
  }

  if (d === "Hook weak") {
    return [
      "Rewrite the first 3 seconds / first visual frame.",
      "Use a more specific pain point.",
      "Make the product outcome clear in the first line.",
      "Avoid vague lifestyle opening.",
    ];
  }

  if (d === "Traffic ok, conversion weak") {
    return [
      "Keep the hook direction but improve promise-to-PDP match.",
      "Add stronger product proof in the creative.",
      "Clarify who the product is for.",
      "Test offer/price anchoring and trust proof.",
    ];
  }

  if (d === "Fatigue risk") {
    return [
      "Keep the winning angle but change the execution.",
      "Change creator/model/setting.",
      "Change first frame and first sentence.",
      "Make a short proof-led refresh before CPA rises.",
    ];
  }

  return [
    "Create one sharper hook variation.",
    "Create one proof-led variation.",
    "Create one problem-solution variation.",
    "Review again after enough latest live spend.",
  ];
}

export function CreativeActions() {
  const { performanceRows, settings } = useMetaStore();

  const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);

  const creatives = useMemo(() => {
    return aggregateRows(liveRows, "ad")
      .filter((row) => row.spend > 0 || row.impressions > 0)
      .map((row) => ({
        ...row,
        creativeDiagnosis: diagnosis(row, settings),
        creativeBrief: creativeBrief(row, settings),
        trend: buildAdDailyTrend(liveRows, row),
      }))
      .sort((a, b) => {
        const priority = (row: any) => {
          if (row.creativeDiagnosis.tone === "red") return 1;
          if (row.creativeDiagnosis.tone === "green") return 2;
          if (row.creativeDiagnosis.tone === "yellow") return 3;
          return 4;
        };

        return priority(a) - priority(b) || b.spend - a.spend;
      });
  }, [liveRows, settings]);

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Creative Audit</h2>
        <MutedText className="mt-2">
          Upload Meta data first. Only latest-day live/spending ads will be analysed.
        </MutedText>
      </GlassCard>
    );
  }

  const winners = creatives.filter((row) => row.creativeDiagnosis.label === "Winner angle");
  const waste = creatives.filter((row) => row.creativeDiagnosis.tone === "red");
  const fatigue = creatives.filter((row) => row.creativeDiagnosis.label === "Fatigue risk");
  const signal = creatives.filter((row) => row.creativeDiagnosis.label.includes("signal"));

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Creative Audit"
        title="Creative-Level Actions"
        description="Only currently live/spending ads are analysed. Each creative now includes CPA, ROAS and AOV trend cards."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Live Creatives" value={String(creatives.length)} tone="blue" />
        <MetricCard label="Winners" value={String(winners.length)} tone={winners.length ? "green" : "yellow"} />
        <MetricCard label="Waste / Rebuild" value={String(waste.length)} tone={waste.length ? "red" : "green"} />
        <MetricCard label="Fatigue Risk" value={String(fatigue.length)} tone={fatigue.length ? "yellow" : "green"} />
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <TonePill tone={waste.length ? "red" : winners.length ? "green" : "yellow"}>
            {waste.length ? "Fix Waste First" : winners.length ? "Scale Winners Carefully" : "Build More Signal"}
          </TonePill>
          <TonePill tone="blue">Live Ads Only</TonePill>
        </div>

        <h2 className="mt-4 text-2xl font-black">
          {waste.length
            ? `${waste.length} live creatives need pause/rebuild before scaling.`
            : winners.length
            ? `${winners.length} live creative angles can be protected or scaled.`
            : `${signal.length} creatives need more signal before a hard decision.`}
        </h2>

        <MutedText className="mt-2">
          Use CPA trend to judge efficiency, ROAS trend to judge return quality, and AOV trend to check whether the creative is attracting better orders.
        </MutedText>
      </GlassCard>

      <div className="grid gap-4">
        {creatives.slice(0, 60).map((row, index) => (
          <GlassCard key={`${row.adId || row.adName}-${index}`} className="p-5">
            <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <TonePill tone={row.creativeDiagnosis.tone}>
                    {row.creativeDiagnosis.label}
                  </TonePill>
                  <TonePill tone="neutral">Live Creative</TonePill>
                </div>

                <h3 className="mt-4 text-lg font-black leading-7 whitespace-normal break-words">
                  {row.adName}
                </h3>

                <MutedText className="mt-2 text-sm leading-6">
                  Campaign: {row.campaignName}
                  <br />
                  Ad Set: {row.adSetName}
                </MutedText>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <MiniStat label="Spend" value={money(row.spend)} />
                  <MiniStat label="Revenue" value={money(row.revenue)} />
                  <MiniStat label="ROAS" value={num(row.roas)} tone={row.roas >= settings.targetRoas ? "green" : "red"} />
                  <MiniStat label="CPA" value={money(row.cpa)} tone={row.cpa <= settings.targetCpa && row.cpa > 0 ? "green" : "yellow"} />
                  <MiniStat label="Purchases" value={num(row.purchases, 0)} />
                  <MiniStat label="CTR" value={`${num(row.ctr)}%`} tone={row.ctr >= settings.targetCtrPct ? "green" : "yellow"} />
                  <MiniStat label="LPV Rate" value={`${num(row.lpvRate)}%`} />
                  <MiniStat label="ATC Rate" value={`${num(row.atcRate)}%`} />
                  <MiniStat label="Freq" value={num(row.frequency)} />
                  <MiniStat label="Fatigue" value={`${row.fatigueScore}/100`} tone={row.fatigueScore >= 70 ? "red" : row.fatigueScore >= 55 ? "yellow" : "green"} />
                  <MiniStat label="Waste" value={`${row.wasteScore}/100`} tone={row.wasteScore >= 70 ? "red" : "neutral"} />
                  <MiniStat label="Decision" value={row.decision || "Watch"} />
                </div>
              </div>

              <div className="grid gap-3">
                <Surface className="p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] opacity-45">
                    Action
                  </p>
                  <p className="mt-3 text-sm leading-6 opacity-80">
                    {row.creativeDiagnosis.action}
                  </p>
                </Surface>

                <Surface className="p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] opacity-45">
                    Creative Brief
                  </p>
                  <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-6 opacity-80">
                    {row.creativeBrief.map((item: string) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Surface>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <TrendCard
                title="CPA Trend"
                metric="cpa"
                rows={row.trend}
                lowerIsBetter
                formatValue={(v) => money(v)}
              />
              <TrendCard
                title="ROAS Trend"
                metric="roas"
                rows={row.trend}
                lowerIsBetter={false}
                formatValue={(v) => num(v)}
              />
              <TrendCard
                title="AOV Trend"
                metric="aov"
                rows={row.trend}
                lowerIsBetter={false}
                formatValue={(v) => money(v)}
              />
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "red" | "green" | "yellow" | "blue" | "neutral";
}) {
  const color =
    tone === "red"
      ? "text-red-400"
      : tone === "green"
      ? "text-emerald-400"
      : tone === "yellow"
      ? "text-amber-400"
      : tone === "blue"
      ? "text-[#0A84FF]"
      : "";

  return (
    <Surface className="p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">
        {label}
      </p>
      <p className={`mt-2 text-sm font-black ${color}`}>
        {value}
      </p>
    </Surface>
  );
}


function TrendCard({
  title,
  metric,
  rows,
  lowerIsBetter,
  formatValue,
}: {
  title: string;
  metric: "cpa" | "roas" | "aov";
  rows: any[];
  lowerIsBetter: boolean;
  formatValue: (value: number) => string;
}) {
  const validRows = rows
    .filter((row) => Number(row[metric] || 0) > 0)
    .map((row) => ({
      ...row,
      value: Number(row[metric] || 0),
    }));

  if (validRows.length < 2) {
    return (
      <Surface className="p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-45">
          {title}
        </p>
        <p className="mt-3 text-sm opacity-60">Not enough current signal yet.</p>
      </Surface>
    );
  }

  const first = Number(validRows[0].value || 0);
  const latest = Number(validRows[validRows.length - 1].value || 0);
  const improving = lowerIsBetter ? latest < first : latest > first;

  const color = improving ? "#34d399" : "#fb7185";
  const label = improving ? "Improving" : "Weakening";

  // Remove extreme visual distortion from outliers without changing actual tooltip values.
  const values = validRows.map((r) => r.value).sort((a, b) => a - b);
  const p95 = values[Math.min(values.length - 1, Math.floor(values.length * 0.95))] || latest;
  const yMax = Math.max(p95 * 1.18, latest * 1.08, first * 1.08, 1);

  const yFormatter = (v: number) => {
    if (metric === "roas") return Number(v).toFixed(1);
    return compactMoney(Number(v));
  };

  return (
    <Surface className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-45">
            {title}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={
                improving
                  ? "rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-xs font-black text-emerald-400"
                  : "rounded-full border border-rose-400/25 bg-rose-400/10 px-2.5 py-1 text-xs font-black text-rose-400"
              }
            >
              {label}
            </span>

            <span className="text-xs font-semibold opacity-55">
              {formatValue(first)} → {formatValue(latest)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 h-[190px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={validRows} margin={{ top: 10, right: 14, left: 2, bottom: 4 }}>
            <CartesianGrid
              stroke="currentColor"
              strokeOpacity={0.10}
              strokeDasharray="4 4"
              vertical={false}
            />

            <XAxis
              dataKey="label"
              tick={{
                fontSize: 11,
                fill: "currentColor",
                opacity: 0.72,
                fontWeight: 600,
              }}
              axisLine={false}
              tickLine={false}
              minTickGap={26}
              interval="preserveStartEnd"
            />

            <YAxis
              domain={[0, yMax]}
              width={54}
              tick={{
                fontSize: 11,
                fill: "currentColor",
                opacity: 0.72,
                fontWeight: 600,
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={yFormatter}
            />

            <Tooltip
              cursor={{
                stroke: color,
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
              content={(props) => (
                <MetaChartTooltip
                  {...props}
                  title={title}
                  valueFormatter={(value) => formatValue(value)}
                />
              )}
            />

            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              dot={{
                r: 3.4,
                fill: color,
                stroke: "#111318",
                strokeWidth: 1.5,
              }}
              activeDot={{
                r: 6,
                fill: color,
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Surface>
  );
}

