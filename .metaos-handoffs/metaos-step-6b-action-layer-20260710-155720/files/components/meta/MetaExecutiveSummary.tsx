"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Gauge,
  Megaphone,
  TrendingDown,
  Zap,
} from "lucide-react";
import { useMetaStore } from "@/store/metaStore";

type Row = Record<string, any>;

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString()}`;

const compact = (n: number) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
  if (Math.abs(v) >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return Math.round(v).toLocaleString();
};

const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number, d = 0) => `${num(Number(n || 0) * 100, d)}%`;
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
    ctr: safeDiv(clicks, impressions),
    cpm: safeDiv(spend * 1000, impressions),
    cpc: safeDiv(spend, clicks),
    cpa: safeDiv(spend, purchases),
    roas: safeDiv(revenue, spend),
    aov: safeDiv(revenue, purchases),
    frequency: safeDiv(impressions, reach),
  };
}

function latestDate(rows: Row[]) {
  const dates = rows.map((r) => parseDate(getDate(r))).filter(Boolean) as Date[];
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

function windowRows(rows: Row[], latest: Date | null, startOffset: number, endOffset: number) {
  if (!latest) return [];

  const start = new Date(latest);
  start.setDate(start.getDate() - startOffset);

  const end = new Date(latest);
  end.setDate(end.getDate() - endOffset);

  return rows.filter((row) => {
    const d = parseDate(getDate(row));
    return d ? d >= start && d <= end : false;
  });
}

function change(current: number, prior: number) {
  if (!prior) return 0;
  return (current - prior) / prior;
}

function trendText(delta: number, lowerIsBetter = false) {
  const good = lowerIsBetter ? delta < 0 : delta > 0;
  const arrow = delta >= 0 ? "↑" : "↓";
  return {
    text: `${arrow} ${delta >= 0 ? "+" : ""}${num(delta * 100, 0)}%`,
    good,
  };
}

function metricStatus(metric: string, value: number, delta: number) {
  if (metric === "Frequency") {
    if (value >= 4 || delta > 0.25) return "Critical";
    if (value >= 2.5 || delta > 0.1) return "Watch";
    return "Healthy";
  }

  if (["ROAS", "CTR", "Reach", "Purchases"].includes(metric)) {
    if (delta <= -0.25) return "Critical";
    if (delta <= -0.1) return "Declining";
    return "Stable";
  }

  if (["CPA", "CPM", "CPC"].includes(metric)) {
    if (delta >= 0.25) return "Critical";
    if (delta >= 0.1) return "Rising";
    return "Stable";
  }

  if (delta <= -0.2) return "Declining";
  return "Stable";
}

function statusTone(status: string) {
  if (["Critical", "Confirmed Fatigue"].includes(status)) return "red";
  if (["Declining", "Rising", "Watch", "Early Signal", "Low ROAS"].includes(status)) return "amber";
  return "green";
}

function statusClass(status: string) {
  const tone = statusTone(status);

  if (tone === "red") {
    return "border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300";
  }

  if (tone === "amber") {
    return "border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300";
  }

  return "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
}

function issueClass(severity: "red" | "amber" | "green") {
  if (severity === "red") {
    return "border-l-4 border-red-500 bg-red-50 text-red-950 dark:border-red-500 dark:bg-red-950/30 dark:text-red-100";
  }

  if (severity === "amber") {
    return "border-l-4 border-orange-500 bg-orange-50 text-orange-950 dark:border-orange-500 dark:bg-orange-950/30 dark:text-orange-100";
  }

  return "border-l-4 border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-100";
}

function valueForMetric(metric: string, s: ReturnType<typeof summarize>) {
  switch (metric) {
    case "Spend":
      return s.spend;
    case "Impressions":
      return s.impressions;
    case "Reach":
      return s.reach;
    case "Frequency":
      return s.frequency;
    case "CTR":
      return s.ctr;
    case "CPM":
      return s.cpm;
    case "CPA":
      return s.cpa;
    case "ROAS":
      return s.roas;
    case "Purchases":
      return s.purchases;
    default:
      return 0;
  }
}

function formatMetric(metric: string, value: number) {
  if (["Spend", "CPM", "CPA"].includes(metric)) return money(value);
  if (metric === "CTR") return `${num(value * 100, 2)}%`;
  if (["ROAS", "Frequency"].includes(metric)) return `${num(value)}x`;
  return compact(value);
}

function groupByCampaign(rows: Row[]) {
  const map = new Map<string, Row[]>();

  rows.forEach((row) => {
    const key = getCampaign(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  return Array.from(map.entries())
    .map(([campaign, campaignRows]) => ({
      campaign,
      ...summarize(campaignRows),
    }))
    .sort((a, b) => b.spend - a.spend);
}

function groupByAd(rows: Row[]) {
  const map = new Map<string, Row[]>();

  rows.forEach((row) => {
    const key = `${getCampaign(row)}|${getAdSet(row)}|${getAd(row)}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  return Array.from(map.entries())
    .map(([key, adRows]) => {
      const [campaign, adSet, ad] = key.split("|");
      return {
        key,
        campaign,
        adSet,
        ad,
        ...summarize(adRows),
      };
    })
    .sort((a, b) => b.spend - a.spend);
}

function issueCards(snapshot: any, campaigns: any[], ads: any[]) {
  const issues: {
    title: string;
    body: string;
    severity: "red" | "amber" | "green";
  }[] = [];

  const topFreqCampaign = [...campaigns].sort((a, b) => b.frequency - a.frequency)[0];

  const zeroConversionSpend = ads
    .filter((a) => a.spend > 1000 && a.purchases === 0)
    .reduce((s, a) => s + a.spend, 0);

  if (snapshot.current.frequency >= 3) {
    issues.push({
      title: "Audience Saturation",
      body: `Frequency is ${num(snapshot.current.frequency)}x. If reach is declining while frequency rises, the account is recycling the same audience.`,
      severity: "red",
    });
  }

  if (topFreqCampaign && topFreqCampaign.frequency >= 4) {
    issues.push({
      title: "Creative Fatigue",
      body: `${topFreqCampaign.campaign} has frequency ${num(topFreqCampaign.frequency)}x. Check CTR and CPA trend before scaling.`,
      severity: topFreqCampaign.frequency >= 6 ? "red" : "amber",
    });
  }

  if (zeroConversionSpend > 0) {
    issues.push({
      title: "Zero-Conversion Spend",
      body: `${money(zeroConversionSpend)} spent on ads with 0 purchases in the selected period. Cut or rebuild these first.`,
      severity: "red",
    });
  }

  if (change(snapshot.current.roas, snapshot.prior.roas) <= -0.1) {
    issues.push({
      title: "Performance Decline",
      body: `ROAS is down ${Math.abs(change(snapshot.current.roas, snapshot.prior.roas) * 100).toFixed(0)}% vs prior 30d. Audit budget shifts, winners, and offer fatigue.`,
      severity: "amber",
    });
  }

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const top4Spend = campaigns.slice(0, 4).reduce((s, c) => s + c.spend, 0);
  const top4Share = safeDiv(top4Spend, totalSpend);

  if (top4Share >= 0.75) {
    issues.push({
      title: "Budget Concentration",
      body: `Top 4 campaigns control ${pct(top4Share)} of spend. This creates dependency risk if one winner fatigues.`,
      severity: "amber",
    });
  }

  const prospectingSpend = campaigns
    .filter((c) => /tof|prospecting|broad|catalog|cold/i.test(c.campaign))
    .reduce((s, c) => s + c.spend, 0);

  const prospectingShare = safeDiv(prospectingSpend, totalSpend);

  if (prospectingShare > 0 && prospectingShare < 0.25) {
    issues.push({
      title: "Prospecting Deficit",
      body: `Only ${pct(prospectingShare)} of spend appears prospecting-led. Retargeting-heavy mix can deplete reach.`,
      severity: "amber",
    });
  }

  if (!issues.length) {
    issues.push({
      title: "No Critical Issue",
      body: "Account does not show a major structural issue from last 30 days. Continue monitoring daily.",
      severity: "green",
    });
  }

  return issues.slice(0, 6);
}

function fatigueRows(campaignsCurrent: any[], campaignsPrior: any[]) {
  const priorMap = new Map(campaignsPrior.map((c) => [c.campaign, c]));

  return campaignsCurrent
    .map((c) => {
      const prior: any = priorMap.get(c.campaign);
      const ctrChange = prior ? change(c.ctr, prior.ctr) : 0;
      const cpaChange = prior ? change(c.cpa, prior.cpa) : 0;

      let status = "No Fatigue";
      let action = "Monitor daily";

      if (c.frequency >= 6 && ctrChange < -0.08 && cpaChange > 0.08) {
        status = "Confirmed Fatigue";
        action = "Reduce 30–50% today";
      } else if (c.frequency >= 4 || (ctrChange < -0.08 && cpaChange > 0.08)) {
        status = "Early Signal";
        action = "Refresh within 48h";
      } else if (c.frequency <= 2.5 && c.roas >= 1) {
        status = "Healthiest";
        action = "Consider budget increase";
      }

      return {
        ...c,
        ctrTrend: ctrChange,
        cpaTrend: cpaChange,
        status,
        action,
      };
    })
    .sort((a, b) => {
      const score = (x: any) =>
        x.status === "Confirmed Fatigue" ? 3 : x.status === "Early Signal" ? 2 : x.status === "Healthiest" ? -1 : 1;
      return score(b) - score(a) || b.spend - a.spend;
    })
    .slice(0, 8);
}

export function MetaExecutiveSummary() {
  const rows = useMetaStore((state) => state.performanceRows);

  const data = useMemo(() => {
    const latest = latestDate(rows || []);
    const currentRows = windowRows(rows || [], latest, 29, 0);
    const priorRows = windowRows(rows || [], latest, 59, 30);
    const last7Rows = windowRows(rows || [], latest, 6, 0);

    const current = summarize(currentRows);
    const prior = summarize(priorRows);
    const last7 = summarize(last7Rows);

    const campaigns = groupByCampaign(currentRows);
    const priorCampaigns = groupByCampaign(priorRows);
    const ads = groupByAd(currentRows);

    const snapshotMetrics = ["Spend", "Impressions", "Reach", "Frequency", "CTR", "CPM", "CPA", "ROAS", "Purchases"].map(
      (metric) => {
        const currentValue = valueForMetric(metric, current);
        const priorValue = valueForMetric(metric, prior);
        const last7Value = valueForMetric(metric, last7);
        const delta = change(currentValue, priorValue);
        const status = metricStatus(metric, currentValue, delta);

        return {
          metric,
          current: currentValue,
          prior: priorValue,
          last7: last7Value,
          delta,
          status,
        };
      }
    );

    return {
      latest: latest ? dateKey(latest.toISOString()) : "NA",
      current,
      prior,
      last7,
      snapshotMetrics,
      campaigns,
      priorCampaigns,
      ads,
      issues: issueCards({ current, prior, last7 }, campaigns, ads),
      fatigue: fatigueRows(campaigns, priorCampaigns),
    };
  }, [rows]);

  return (
    <div className="mx-auto grid max-w-[1600px] gap-4 text-[#111827] dark:text-white">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0e1117]">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
              Meta OS Summary
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Performance Control Room</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-white/55">
              Last 30 days vs prior 30 days, campaign concentration, critical issues and fatigue actions.
            </p>
          </div>

          <div className="rounded-full border border-slate-200 px-3 py-1 text-xs font-black text-slate-500 dark:border-white/10 dark:text-white/50">
            Latest: {data.latest}
          </div>
        </div>
      </section>

      <ExecutiveBlock icon={<TrendingDown className="h-5 w-5" />} title="Performance Snapshot — Last 30 Days">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#14233b] text-white">
                <th className="rounded-l-xl px-4 py-3">Metric</th>
                <th className="px-4 py-3">Current 30d</th>
                <th className="px-4 py-3">Prior 30d</th>
                <th className="px-4 py-3">Last 7d</th>
                <th className="px-4 py-3">Change</th>
                <th className="rounded-r-xl px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {data.snapshotMetrics.map((row) => {
                const lowerIsBetter = ["Frequency", "CPM", "CPA"].includes(row.metric);
                const trend = trendText(row.delta, lowerIsBetter);
                const important =
                  row.status === "Critical" ||
                  (row.metric === "ROAS" && row.delta < -0.1) ||
                  (row.metric === "Frequency" && row.current >= 3);

                return (
                  <tr key={row.metric} className="border-b border-slate-100 dark:border-white/10">
                    <td className="px-4 py-3 font-black">{row.metric}</td>
                    <td className={important ? "px-4 py-3 font-black text-red-600 dark:text-red-300" : "px-4 py-3 font-semibold"}>
                      {formatMetric(row.metric, row.current)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-white/70">{formatMetric(row.metric, row.prior)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-white/70">{formatMetric(row.metric, row.last7)}</td>
                    <td className={trend.good ? "px-4 py-3 font-black text-emerald-600 dark:text-emerald-300" : "px-4 py-3 font-black text-red-600 dark:text-red-300"}>
                      {trend.text}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-lg border px-3 py-1 text-xs font-black ${statusClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ExecutiveBlock>

      <ExecutiveBlock icon={<AlertTriangle className="h-5 w-5" />} title="Critical Issues Identified">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.issues.map((issue) => (
            <div key={issue.title} className={`rounded-xl p-4 ${issueClass(issue.severity)}`}>
              <p className="text-base font-black">{issue.severity === "red" ? "🔴" : issue.severity === "amber" ? "🟡" : "🟢"} {issue.title}</p>
              <p className="mt-2 text-sm leading-6 opacity-80">{issue.body}</p>
            </div>
          ))}
        </div>
      </ExecutiveBlock>

      <ExecutiveBlock icon={<BarChart3 className="h-5 w-5" />} title="Campaign Performance Breakdown">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#14233b] text-white">
                <th className="rounded-l-xl px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Spend</th>
                <th className="px-4 py-3">Impressions</th>
                <th className="px-4 py-3">Reach</th>
                <th className="px-4 py-3">CTR</th>
                <th className="px-4 py-3">CPA</th>
                <th className="px-4 py-3">ROAS</th>
                <th className="px-4 py-3">Purchases</th>
                <th className="px-4 py-3">Frequency</th>
                <th className="rounded-r-xl px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {data.campaigns.slice(0, 12).map((row, index) => {
                let status = `Pareto #${index + 1}`;

                if (row.frequency >= 6) status = "Fatigue";
                else if (row.roas < 0.7 && row.spend > 1000) status = "Low ROAS";
                else if (row.frequency <= 2.5 && row.roas >= 1) status = "Healthiest";

                return (
                  <tr key={row.campaign} className="border-b border-slate-100 dark:border-white/10">
                    <td className="max-w-[320px] px-4 py-3 font-black">{row.campaign}</td>
                    <td className="px-4 py-3">{money(row.spend)}</td>
                    <td className="px-4 py-3">{compact(row.impressions)}</td>
                    <td className="px-4 py-3">{compact(row.reach)}</td>
                    <td className="px-4 py-3">{pct(row.ctr, 2)}</td>
                    <td className="px-4 py-3">{row.purchases > 0 ? money(row.cpa) : "No sale"}</td>
                    <td className={row.roas < 0.7 ? "px-4 py-3 font-black text-red-600 dark:text-red-300" : "px-4 py-3"}>
                      {num(row.roas)}x
                    </td>
                    <td className="px-4 py-3">{num(row.purchases, 0)}</td>
                    <td className={row.frequency >= 4 ? "px-4 py-3 font-black text-red-600 dark:text-red-300" : "px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-300"}>
                      {num(row.frequency)}x
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-lg border px-3 py-1 text-xs font-black ${statusClass(status)}`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ExecutiveBlock>

      <ExecutiveBlock icon={<Zap className="h-5 w-5" />} title="Creative Fatigue Assessment">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#14233b] text-white">
                <th className="rounded-l-xl px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Frequency</th>
                <th className="px-4 py-3">CTR Trend</th>
                <th className="px-4 py-3">CPA Trend</th>
                <th className="px-4 py-3">Status</th>
                <th className="rounded-r-xl px-4 py-3">Action Required</th>
              </tr>
            </thead>

            <tbody>
              {data.fatigue.map((row) => {
                const severe = row.status === "Confirmed Fatigue";

                return (
                  <tr
                    key={row.campaign}
                    className={
                      severe
                        ? "border-b border-slate-100 bg-red-50 dark:border-white/10 dark:bg-red-950/20"
                        : "border-b border-slate-100 dark:border-white/10"
                    }
                  >
                    <td className="max-w-[330px] px-4 py-3 font-black">{row.campaign}</td>
                    <td className={row.frequency >= 4 ? "px-4 py-3 font-black text-red-600 dark:text-red-300" : "px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-300"}>
                      {num(row.frequency)}x
                    </td>
                    <td className={row.ctrTrend < -0.08 ? "px-4 py-3 font-black text-red-600 dark:text-red-300" : "px-4 py-3 font-black text-emerald-600 dark:text-emerald-300"}>
                      {row.ctrTrend < -0.08 ? "↓ Declining" : "↔ Stable"}
                    </td>
                    <td className={row.cpaTrend > 0.08 ? "px-4 py-3 font-black text-red-600 dark:text-red-300" : "px-4 py-3 font-black text-emerald-600 dark:text-emerald-300"}>
                      {row.cpaTrend > 0.08 ? "↑ Rising" : "✓ Stable"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-lg border px-3 py-1 text-xs font-black ${statusClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-black">{row.action}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ExecutiveBlock>

      <ExecutiveBlock icon={<Megaphone className="h-5 w-5" />} title="Operator Direction">
        <div className="grid gap-3 md:grid-cols-3">
          <DirectionCard
            title="Cut First"
            body="Pause or reduce zero-conversion spend and high-frequency fatigue pockets before moving more budget."
            tone="red"
          />
          <DirectionCard
            title="Protect Winners"
            body="Keep stable ROAS campaigns untouched. Do not edit winning ads unless fatigue is visible."
            tone="green"
          />
          <DirectionCard
            title="Refresh Creatives"
            body="For campaigns with rising frequency and declining CTR, create new first-3-second hooks within 48 hours."
            tone="amber"
          />
        </div>
      </ExecutiveBlock>
    </div>
  );
}

function ExecutiveBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0e1117]">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-white/10">
        <span className="text-blue-700 dark:text-blue-300">{icon}</span>
        <h2 className="text-2xl font-black tracking-tight text-blue-800 dark:text-blue-300">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function DirectionCard({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "red" | "amber" | "green";
}) {
  const cls =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100"
      : tone === "amber"
      ? "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-100"
      : "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100";

  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="font-black">{title}</p>
      <p className="mt-2 text-sm leading-6 opacity-80">{body}</p>
    </div>
  );
}
