"use client";

import { useMemo } from "react";
import { useMetaStore } from "@/store/metaStore";
import { onlyLiveRows } from "@/lib/liveFilter";
import { buildTopOperatorReport } from "@/lib/performanceIntelligence";
import {
  GlassCard,
  MetaButton,
  MutedText,
  PageHeader,
  Surface,
  TonePill,
} from "@/components/cards/MetaCards";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`;

function shortAdLine(ad: any) {
  return `${ad.adName}
Campaign: ${ad.campaignName}
Ad Set: ${ad.adSetName}
Spend: ${money(ad.spend)} | Purchases: ${num(ad.purchases, 0)} | ROAS: ${num(ad.roas)} | CPA: ${money(ad.cpa)}
CPA Trend: ${ad.purchaseTrend?.trendText || "Not available"}`;
}

export function DailySummaryExport() {
  const { performanceRows, settings } = useMetaStore();

  const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);

  const data = useMemo(
    () => buildTopOperatorReport(performanceRows as any, settings),
    [performanceRows, settings]
  );

  const summary = useMemo(() => {
    return `META DAILY TEAM SUMMARY
Latest Data Date: ${data.latestKey}

Important Filter:
This summary includes ONLY ads that had spend or impressions on the latest day.
Old stopped ads are ignored.

Decision:
${data.decision}

Top Priority:
${data.priority}

Last 7 Days — Currently Live/Spending Ads Only:
- Spend: ${money(data.l7.spend)}
- Revenue: ${money(data.l7.revenue)}
- Purchases: ${num(data.l7.purchases, 0)}
- ROAS: ${num(data.l7.roas)}
- CPA: ${money(data.l7.cpa)}

Context:
- ROAS vs 30D: ${pct(data.roasVs30)}
- CPA vs 30D: ${pct(data.cpaVs30)}
- ROAS vs 90D: ${pct(data.roasVs90)}
- CPA vs 90D: ${pct(data.cpaVs90)}

Main Funnel Diagnosis:
${data.funnelIssue}

Action Count:
- Pause/Cut: ${data.pause.length}
- Reduce: ${data.reduce.length}
- Scale: ${data.scale.length}
- Refresh: ${data.refresh.length}
- Improve/Hold: ${data.improve.length}
- Watch: ${data.watch.length}

Pause / Cut Today:
${data.pause.map((ad: any, i: number) => `${i + 1}. ${shortAdLine(ad)}
Action: Pause or cut today. Do not allow more spend without purchase signal.`).join("\n\n") || "None"}

Reduce Today:
${data.reduce.map((ad: any, i: number) => `${i + 1}. ${shortAdLine(ad)}
Action: Reduce budget. CPA is above acceptable range.`).join("\n\n") || "None"}

Scale Today:
${data.scale.map((ad: any, i: number) => `${i + 1}. ${shortAdLine(ad)}
Action: ${ad.purchaseTrend?.improving ? "Scale 5–10%. Prioritise because CPA is improving with incremental purchases." : "Scale only 5%. Watch marginal CPA tomorrow."}`).join("\n\n") || "None"}

Refresh Creatives:
${data.refresh.map((ad: any, i: number) => `${i + 1}. ${shortAdLine(ad)}
Action: Prepare replacement creative. Refresh hook, first frame, proof point or creator format.`).join("\n\n") || "None"}

Improve / Hold:
${data.improve.map((ad: any, i: number) => `${i + 1}. ${shortAdLine(ad)}
Action: Do not scale yet. Improve creative/PDP/offer and monitor one more day.`).join("\n\n") || "None"}

Watch Tomorrow:
${data.watch.slice(0, 10).map((ad: any, i: number) => `${i + 1}. ${ad.adName} — Spend ${money(ad.spend)}, ROAS ${num(ad.roas)}, CPA ${money(ad.cpa)}, Purchases ${num(ad.purchases, 0)}`).join("\n") || "None"}

Budget Direction:
- Cut from waste: ${money(data.wastedSpend)}
- Reallocation rule: Move only 30–50% of recovered waste into proven live winners.
- Scale limit: 5–10% only. Recheck marginal CPA tomorrow.

Operator Note:
Do not act on old stopped ads. Do not scale historical winners unless they are spending now. Today's improvement should come from last 7 day live-ad performance only.
`;
  }, [data]);

  const copySummary = async () => {
    await navigator.clipboard.writeText(summary);
    alert("Team summary copied.");
  };

  const exportSummary = () => {
    const html = `
      <html>
        <head>
          <title>Meta Daily Team Summary</title>
          <style>
            body { font-family: Helvetica, Arial, sans-serif; padding: 42px; color: #111; line-height: 1.55; }
            h1 { font-size: 32px; margin-bottom: 8px; }
            pre { white-space: pre-wrap; font-size: 13px; line-height: 1.65; }
          </style>
        </head>
        <body>
          <h1>Meta Daily Team Summary</h1>
          <pre>${summary.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre>
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
        <h2 className="text-2xl font-black">Team Summary</h2>
        <MutedText className="mt-2">Upload Meta data first.</MutedText>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PageHeader
          eyebrow="Team Update"
          title="Daily Team Summary"
          description="This summary is hard-gated to currently live/spending ads only. Historical stopped ads are ignored."
        />

        <div className="flex flex-wrap gap-2">
          <MetaButton variant="secondary" onClick={copySummary}>
            Copy Summary
          </MetaButton>
          <MetaButton variant="primary" onClick={exportSummary}>
            Export PDF
          </MetaButton>
        </div>
      </div>

      <GlassCard className="p-5">
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

      <GlassCard className="p-5">
        <h2 className="text-xl font-black">Action Counts</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <Surface className="p-4">
            <TonePill tone="red">Pause</TonePill>
            <p className="mt-3 text-3xl font-black">{data.pause.length}</p>
          </Surface>

          <Surface className="p-4">
            <TonePill tone="red">Reduce</TonePill>
            <p className="mt-3 text-3xl font-black">{data.reduce.length}</p>
          </Surface>

          <Surface className="p-4">
            <TonePill tone="green">Scale</TonePill>
            <p className="mt-3 text-3xl font-black">{data.scale.length}</p>
          </Surface>

          <Surface className="p-4">
            <TonePill tone="yellow">Refresh</TonePill>
            <p className="mt-3 text-3xl font-black">{data.refresh.length}</p>
          </Surface>

          <Surface className="p-4">
            <TonePill tone="yellow">Watch</TonePill>
            <p className="mt-3 text-3xl font-black">{data.watch.length}</p>
          </Surface>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h2 className="text-xl font-black">Export Preview</h2>
        <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 opacity-75">{summary}</pre>
      </GlassCard>
    </div>
  );
}