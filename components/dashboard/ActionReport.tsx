"use client";

import { useMemo } from "react";
import { useMetaStore } from "@/store/metaStore";
import { buildTopOperatorReport } from "@/lib/performanceIntelligence";
import {
  GlassCard,
  MetaButton,
  MetricCard,
  MutedText,
  PageHeader,
  Surface,
  TonePill,
} from "@/components/cards/MetaCards";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function queueTone(queue: string): "green" | "yellow" | "red" | "blue" | "neutral" {
  if (queue === "Scale") return "green";
  if (queue === "Pause" || queue === "Reduce") return "red";
  if (queue === "Refresh" || queue === "Improve" || queue === "Watch") return "yellow";
  return "neutral";
}

function getWhy(ad: any, queue: string, settings: any) {
  if (queue === "Pause") {
    const ctrRead =
      ad.ctr >= settings.targetCtrPct
        ? "CTR is not the issue; traffic/PDP/offer is likely leaking."
        : "CTR is weak, so the creative hook is likely not strong enough.";

    return [
      `Spent ${money(ad.spend)} in the last 7 days with 0 purchases.`,
      ctrRead,
      "This is active waste because the ad is still live/spending.",
    ];
  }

  if (queue === "Reduce") {
    return [
      `CPA is ${money(ad.cpa)}, above acceptable range versus target ${money(settings.targetCpa)}.`,
      `ROAS is ${num(ad.roas)}, below scale quality.`,
      "Budget should be reduced until efficiency recovers.",
    ];
  }

  if (queue === "Scale") {
    return [
      `ROAS ${num(ad.roas)} is above target ${settings.targetRoas}.`,
      `CPA ${money(ad.cpa)} is within target ${money(settings.targetCpa)}.`,
      ad.purchaseTrend?.improving
        ? "CPA is improving as purchases accumulate, which is a stronger scale signal."
        : "CPA is acceptable but not clearly improving purchase-by-purchase yet.",
    ];
  }

  if (queue === "Refresh") {
    return [
      `Fatigue score is ${ad.fatigueScore}/100 and frequency is ${num(ad.frequency)}.`,
      "The ad may still be useful, but it should not receive aggressive budget until a replacement is ready.",
      "Refresh hook, first frame, creator style or proof point.",
    ];
  }

  if (queue === "Improve") {
    return [
      "The ad has some purchase signal but is not strong enough to scale.",
      "Improve the angle, offer, PDP clarity or proof before increasing budget.",
      "Watch one more day after changes.",
    ];
  }

  return [
    "Not enough decisive signal for action today.",
    "Keep budget stable and watch marginal CPA, ROAS and purchases tomorrow.",
  ];
}

function creativeBriefFor(ad: any, queue: string) {
  if (queue === "Scale") {
    return [
      "Make 2 variants using the same winning hook.",
      "Make 1 version with stronger proof/testimonial.",
      "Make 1 offer-led version for warmer audience.",
    ];
  }

  if (queue === "Pause" || queue === "Reduce") {
    return [
      "Rewrite the first 3 seconds / first visual frame.",
      "Test a sharper pain-point hook.",
      "Test stronger product proof before relaunching.",
    ];
  }

  if (queue === "Refresh") {
    return [
      "Keep the core idea but change visual opening.",
      "Change creator / model / setting.",
      "Add new proof, before-after, review or comparison.",
    ];
  }

  return [
    "Create one new hook variation.",
    "Create one proof-led variation.",
    "Create one offer-led variation.",
  ];
}

function adLine(ad: any, queue: string, settings: any) {
  const why = getWhy(ad, queue, settings);
  const brief = creativeBriefFor(ad, queue);

  return `${ad.adName}
Campaign: ${ad.campaignName}
Ad Set: ${ad.adSetName}
Spend: ${money(ad.spend)} | Purchases: ${num(ad.purchases, 0)} | ROAS: ${num(ad.roas)} | CPA: ${money(ad.cpa)} | CTR: ${num(ad.ctr)}% | Frequency: ${num(ad.frequency)}
CPA Trend: ${ad.purchaseTrend?.trendText || "Not available"}

Why:
${why.map((x: string) => `- ${x}`).join("\n")}

Creative Brief:
${brief.map((x: string) => `- ${x}`).join("\n")}`;
}

export function ActionReport() {
  const { performanceRows, settings } = useMetaStore();

  const data = useMemo(
    () => buildTopOperatorReport(performanceRows as any, settings),
    [performanceRows, settings]
  );

  const aov = safeDiv(data.l7.revenue, data.l7.purchases);
  const cutBudget = data.wastedSpend + data.reduce.reduce((s: number, ad: any) => s + ad.spend * 0.35, 0);
  const reallocateBudget = cutBudget * 0.4;
  const holdBudget = cutBudget - reallocateBudget;

  const scalePriority = data.scale.filter((ad: any) => ad.purchaseTrend?.improving);
  const normalScale = data.scale.filter((ad: any) => !ad.purchaseTrend?.improving);

  const report = useMemo(() => {
    return `METAOS — TOP 1% DAILY ACTION REPORT
Latest Data Date: ${data.latestKey}

FILTER RULE:
Only ads with spend or impressions on the latest day are included.
Paused/stopped historical ads are excluded from recommendations.

TODAY'S DECISION:
${data.decision}

TOP PRIORITY:
${data.priority}

LAST 7 DAYS — LIVE ADS ONLY:
Spend: ${money(data.l7.spend)}
Revenue: ${money(data.l7.revenue)}
Purchases: ${num(data.l7.purchases, 0)}
AOV: ${money(aov)}
ROAS: ${num(data.l7.roas)}
CPA: ${money(data.l7.cpa)}
CTR: ${num(data.l7.ctr)}%
Click → LPV: ${num(data.l7.lpvRate)}%
LPV → ATC: ${num(data.l7.atcRate)}%
ATC → Checkout: ${num(data.l7.checkoutRate)}%
Checkout → Purchase: ${num(data.l7.purchaseCvr)}%

CONTEXT:
ROAS vs 30D: ${pct(data.roasVs30)}
CPA vs 30D: ${pct(data.cpaVs30)}
ROAS vs 90D: ${pct(data.roasVs90)}
CPA vs 90D: ${pct(data.cpaVs90)}

FUNNEL DIAGNOSIS:
${data.funnelIssue}

BUDGET MOVEMENT:
Cut from clear waste: ${money(data.wastedSpend)}
Total budget to cut/reduce today: ${money(cutBudget)}
Reallocate to winners today: ${money(reallocateBudget)}
Keep unallocated / hold: ${money(holdBudget)}
Rule: Do not reallocate 100% of recovered waste immediately. Move 30–50% only into proven live winners.

ACTION COUNTS:
Pause / Cut: ${data.pause.length}
Reduce: ${data.reduce.length}
Scale: ${data.scale.length}
Refresh: ${data.refresh.length}
Improve / Hold: ${data.improve.length}
Watch: ${data.watch.length}

1. PAUSE / CUT LIVE WASTE
${data.pause.map((ad: any, i: number) => `${i + 1}. ${adLine(ad, "Pause", settings)}
Action: Pause or cut today. Do not allow more spend without purchase signal.`).join("\n\n") || "None"}

2. REDUCE INEFFICIENT LIVE ADS
${data.reduce.map((ad: any, i: number) => `${i + 1}. ${adLine(ad, "Reduce", settings)}
Action: Reduce budget. Do not scale until CPA/ROAS recover.`).join("\n\n") || "None"}

3. SCALE LIVE WINNERS — PRIORITISE IMPROVING CPA
${scalePriority.map((ad: any, i: number) => `${i + 1}. ${adLine(ad, "Scale", settings)}
Action: Scale 5–10%. Prioritise because CPA is improving with incremental purchases.`).join("\n\n") || "None"}

4. SCALE LIVE WINNERS — NORMAL SCALE
${normalScale.map((ad: any, i: number) => `${i + 1}. ${adLine(ad, "Scale", settings)}
Action: Scale 5% only. Watch marginal CPA tomorrow.`).join("\n\n") || "None"}

5. REFRESH FATIGUED LIVE ADS
${data.refresh.map((ad: any, i: number) => `${i + 1}. ${adLine(ad, "Refresh", settings)}
Action: Prepare replacement creative. Do not aggressively scale until refresh is ready.`).join("\n\n") || "None"}

6. IMPROVE / HOLD
${data.improve.map((ad: any, i: number) => `${i + 1}. ${adLine(ad, "Improve", settings)}
Action: Improve creative/PDP/offer. Hold budget until signal improves.`).join("\n\n") || "None"}

7. WATCH TOMORROW
${data.watch.slice(0, 10).map((ad: any, i: number) => `${i + 1}. ${ad.adName}
Spend: ${money(ad.spend)} | ROAS: ${num(ad.roas)} | CPA: ${money(ad.cpa)} | Purchases: ${num(ad.purchases, 0)}
Campaign: ${ad.campaignName}
Ad Set: ${ad.adSetName}`).join("\n\n") || "None"}

FINAL OPERATOR NOTE:
The objective today is to improve the last 7 days, not admire historical winners.
Do not act on paused ads.
Cut current waste first.
Scale only currently live ads with purchase signal, controlled CPA, and preferably improving purchase-by-purchase CPA.
Refresh fatigue before CPA rises.
`;
  }, [data, settings, aov, cutBudget, reallocateBudget, holdBudget, scalePriority, normalScale]);

  const copyReport = async () => {
    await navigator.clipboard.writeText(report);
    alert("Top operator report copied.");
  };

  const exportReport = () => {
    const html = `
      <html>
        <head>
          <title>MetaOS Top Operator Action Report</title>
          <style>
            body { font-family: Helvetica, Arial, sans-serif; padding: 42px; color: #111; line-height: 1.55; }
            h1 { font-size: 32px; margin-bottom: 8px; }
            pre { white-space: pre-wrap; font-size: 13px; line-height: 1.65; }
          </style>
        </head>
        <body>
          <h1>MetaOS Top Operator Action Report</h1>
          <pre>${report.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre>
        </body>
      </html>
    `;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  if (!performanceRows.length) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Action Report</h2>
        <MutedText className="mt-2">Upload Meta data first.</MutedText>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          eyebrow="Top 1% Action Report"
          title="Improve Today Using Live Ads"
          description="Hard-gated to ads with latest-day spend or impressions. Last 7 days drives action; 30/90 days provide context."
        />

        <div className="flex flex-wrap gap-2">
          <MetaButton variant="secondary" onClick={copyReport}>Copy Report</MetaButton>
          <MetaButton variant="primary" onClick={exportReport}>Export PDF</MetaButton>
        </div>
      </div>

      <GlassCard className="p-6">
        <div className="flex flex-wrap gap-2">
          <TonePill tone={data.pause.length ? "red" : data.scale.length ? "green" : "yellow"}>
            {data.decision}
          </TonePill>
          <TonePill tone="blue">Latest Date: {data.latestKey}</TonePill>
          <TonePill tone="neutral">Live Ads Only</TonePill>
        </div>

        <h2 className="mt-4 text-2xl font-black">{data.priority}</h2>
        <MutedText className="mt-2">Main diagnosis: {data.funnelIssue}</MutedText>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="L7 Spend" value={money(data.l7.spend)} tone="neutral" />
        <MetricCard label="L7 Revenue" value={money(data.l7.revenue)} tone="green" />
        <MetricCard label="L7 ROAS" value={num(data.l7.roas)} tone={data.l7.roas >= settings.targetRoas ? "green" : "red"} />
        <MetricCard label="L7 CPA" value={money(data.l7.cpa)} tone={data.l7.cpa <= settings.targetCpa ? "green" : "red"} />
        <MetricCard label="AOV" value={money(aov)} tone="blue" />
        <MetricCard label="ROAS vs 30D" value={pct(data.roasVs30)} tone={data.roasVs30 >= 0 ? "green" : "red"} />
        <MetricCard label="CPA vs 30D" value={pct(data.cpaVs30)} tone={data.cpaVs30 <= 0 ? "green" : "red"} />
        <MetricCard label="Cut Budget" value={money(cutBudget)} tone={cutBudget > 0 ? "red" : "green"} />
      </div>

      <GlassCard className="p-5">
        <h2 className="text-xl font-black">Budget Movement Recommendation</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Surface className="p-4">
            <TonePill tone="red">Cut / Reduce</TonePill>
            <p className="mt-3 text-3xl font-black">{money(cutBudget)}</p>
            <MutedText className="mt-2 text-sm">Remove from waste and inefficient live ads.</MutedText>
          </Surface>

          <Surface className="p-4">
            <TonePill tone="green">Reallocate</TonePill>
            <p className="mt-3 text-3xl font-black">{money(reallocateBudget)}</p>
            <MutedText className="mt-2 text-sm">Move only 30–50% into live winners.</MutedText>
          </Surface>

          <Surface className="p-4">
            <TonePill tone="yellow">Hold</TonePill>
            <p className="mt-3 text-3xl font-black">{money(holdBudget)}</p>
            <MutedText className="mt-2 text-sm">Keep unallocated until tomorrow’s signal.</MutedText>
          </Surface>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h2 className="text-xl font-black">Today’s Action Queues</h2>
        <div className="mt-4 grid gap-4">
          <ActionBlock title="Pause / Cut" tone="red" queue="Pause" rows={data.pause} settings={settings} />
          <ActionBlock title="Reduce" tone="red" queue="Reduce" rows={data.reduce} settings={settings} />
          <ActionBlock title="Scale — Improving CPA First" tone="green" queue="Scale" rows={scalePriority} settings={settings} />
          <ActionBlock title="Scale — Normal" tone="green" queue="Scale" rows={normalScale} settings={settings} />
          <ActionBlock title="Refresh" tone="yellow" queue="Refresh" rows={data.refresh} settings={settings} />
          <ActionBlock title="Improve / Hold" tone="yellow" queue="Improve" rows={data.improve} settings={settings} />
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h2 className="text-xl font-black">Export Preview</h2>
        <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 opacity-75">{report}</pre>
      </GlassCard>
    </div>
  );
}

function ActionBlock({
  title,
  tone,
  rows,
  queue,
  settings,
}: {
  title: string;
  tone: "green" | "red" | "yellow";
  rows: any[];
  queue: string;
  settings: any;
}) {
  return (
    <Surface className="p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TonePill tone={tone}>{title}</TonePill>
        <MutedText className="text-sm">{rows.length} ads</MutedText>
      </div>

      {rows.length ? (
        <div className="grid gap-4">
          {rows.slice(0, 10).map((ad: any) => (
            <div key={ad.adId || ad.adName} className="rounded-2xl border border-current/10 p-4">
              <div className="flex flex-wrap gap-2">
                <TonePill tone={queueTone(queue)}>{queue}</TonePill>
                {ad.purchaseTrend?.improving && <TonePill tone="green">CPA Improving</TonePill>}
              </div>

              <p className="mt-4 font-black leading-6 whitespace-normal break-words">{ad.adName}</p>

              <MutedText className="mt-1 text-xs leading-5">
                Campaign: {ad.campaignName}
                <br />
                Ad Set: {ad.adSetName}
              </MutedText>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <MiniStat label="Spend" value={money(ad.spend)} />
                <MiniStat label="ROAS" value={num(ad.roas)} />
                <MiniStat label="CPA" value={money(ad.cpa)} />
                <MiniStat label="Purchases" value={num(ad.purchases, 0)} />
                <MiniStat label="CTR" value={`${num(ad.ctr)}%`} />
                <MiniStat label="Freq" value={num(ad.frequency)} />
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <Surface className="p-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] opacity-45">Why</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 opacity-75">
                    {getWhy(ad, queue, settings).map((x: string) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </Surface>

                <Surface className="p-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] opacity-45">Creative Brief</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 opacity-75">
                    {creativeBriefFor(ad, queue).map((x: string) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </Surface>
              </div>

              <p className="mt-3 text-xs opacity-70">
                CPA trend: {ad.purchaseTrend?.trendText || "Not available"}
              </p>

              <PerformanceMiniTrends points={ad.purchaseTrend?.points} />
            </div>
          ))}
        </div>
      ) : (
        <MutedText>No ads in this queue.</MutedText>
      )}
    </Surface>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Surface className="p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">{label}</p>
      <p className="mt-2 text-sm font-black">{value}</p>
    </Surface>
  );
}

function PerformanceMiniTrends({
  points,
}: {
  points?: {
    purchaseNumber: number;
    cpa: number;
    spend?: number;
    revenue?: number;
    aov?: number;
    roas?: number;
  }[];
}) {
  const validPoints = (points || []).filter(
    (point) => Number.isFinite(point.cpa) && point.cpa > 0
  );

  if (validPoints.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-current/10 p-3 text-xs opacity-55">
        No current purchase signal in the last 7 days.
      </div>
    );
  }

  if (validPoints.length === 1) {
    return (
      <div className="mt-3 rounded-xl border border-current/10 p-3 text-xs opacity-55">
        Only 1 current purchase. Trendline needs at least 2 purchases.
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-3 rounded-xl border border-current/10 p-3">
      <MiniTrendLine
        label="CPA"
        points={validPoints.map((p) => ({ purchaseNumber: p.purchaseNumber, value: p.cpa }))}
        lowerIsBetter
        prefix="₹"
      />

      <MiniTrendLine
        label="AOV"
        points={validPoints
          .map((p) => ({ purchaseNumber: p.purchaseNumber, value: Number(p.aov || 0) }))
          .filter((p) => Number.isFinite(p.value) && p.value > 0)}
        lowerIsBetter={false}
        prefix="₹"
      />

      <MiniTrendLine
        label="ROAS"
        points={validPoints
          .map((p) => ({ purchaseNumber: p.purchaseNumber, value: Number(p.roas || 0) }))
          .filter((p) => Number.isFinite(p.value) && p.value > 0)}
        lowerIsBetter={false}
        prefix=""
        decimals={2}
      />
    </div>
  );
}

function MiniTrendLine({
  label,
  points,
  lowerIsBetter,
  prefix,
  decimals = 0,
}: {
  label: string;
  points: { purchaseNumber: number; value: number }[];
  lowerIsBetter: boolean;
  prefix: string;
  decimals?: number;
}) {
  const validPoints = points.filter((point) => Number.isFinite(point.value) && point.value > 0);

  if (validPoints.length < 2) {
    return (
      <div className="rounded-lg border border-current/10 p-2 text-[11px] opacity-55">
        {label}: not enough current signal.
      </div>
    );
  }

  const width = 280;
  const height = 48;
  const padding = 7;

  const values = validPoints.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = validPoints.map((point, index) => {
    const x = padding + (index / Math.max(1, validPoints.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return { x, y, value: point.value, purchaseNumber: point.purchaseNumber };
  });

  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  const first = validPoints[0].value;
  const last = validPoints[validPoints.length - 1].value;
  const improving = lowerIsBetter ? last < first : last > first;
  const color = improving ? "#34d399" : "#f87171";

  const format = (value: number) => {
    if (prefix === "₹") return `₹${Math.round(value).toLocaleString()}`;
    return value.toFixed(decimals);
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
        <span className={improving ? "font-black text-emerald-400" : "font-black text-red-400"}>
          {label} {improving ? "improving" : "worsening"}
        </span>
        <span className="opacity-55">
          {format(first)} → {format(last)}
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-[48px] w-full overflow-visible">
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="currentColor"
          strokeOpacity="0.14"
          strokeWidth="1"
        />

        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coords.map((point) => (
          <circle
            key={`${label}-${point.purchaseNumber}-${point.value}`}
            cx={point.x}
            cy={point.y}
            r="3.2"
            fill={color}
          />
        ))}
      </svg>
    </div>
  );
}
