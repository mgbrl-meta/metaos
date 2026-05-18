"use client";

import { useMemo } from "react";
import { useMetaStore } from "@/store/metaStore";
import { GlassCard, MetricCard, MutedText, Surface, TonePill } from "@/components/cards/MetaCards";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function monthKey(date?: string) {
  if (!date) return "Unknown";
  const d = new Date(date);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return String(date).slice(0, 7) || "Unknown";
}

export function MoMAnalysis() {
  const { performanceRows } = useMetaStore();

  const months = useMemo(() => {
    const map = new Map<string, typeof performanceRows>();

    performanceRows.forEach((row) => {
      const key = monthKey(row.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    });

    return Array.from(map.entries())
      .map(([month, rows]) => {
        const spend = rows.reduce((s, r) => s + r.spend, 0);
        const revenue = rows.reduce((s, r) => s + r.revenue, 0);
        const purchases = rows.reduce((s, r) => s + r.purchases, 0);
        return {
          month,
          spend,
          revenue,
          purchases,
          roas: safeDiv(revenue, spend),
          cpa: safeDiv(spend, purchases),
          contribution: rows.reduce((s, r) => s + r.contributionAfterAds, 0),
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [performanceRows]);

  if (!performanceRows.length) return <Empty title="Month-on-Month Analysis" />;

  const latest = months[months.length - 1];
  const previous = months[months.length - 2];

  const spendChange = previous ? safeDiv(latest.spend - previous.spend, previous.spend) * 100 : 0;
  const revenueChange = previous ? safeDiv(latest.revenue - previous.revenue, previous.revenue) * 100 : 0;
  const roasChange = previous ? safeDiv(latest.roas - previous.roas, previous.roas) * 100 : 0;
  const cpaChange = previous ? safeDiv(latest.cpa - previous.cpa, previous.cpa) * 100 : 0;

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0A84FF]">MoM Analysis</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Month-on-Month Consolidated View</h1>
        <MutedText className="mt-2">Understand whether scale improved or diluted efficiency across months.</MutedText>
      </div>

      {previous ? (
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Spend Change" value={pct(spendChange)} tone={spendChange > 0 ? "yellow" : "neutral"} />
          <MetricCard label="Revenue Change" value={pct(revenueChange)} tone={revenueChange >= spendChange ? "green" : "yellow"} />
          <MetricCard label="ROAS Change" value={pct(roasChange)} tone={roasChange >= 0 ? "green" : "red"} />
          <MetricCard label="CPA Change" value={pct(cpaChange)} tone={cpaChange <= 0 ? "green" : "red"} />
        </div>
      ) : (
        <GlassCard className="p-5">
          <TonePill tone="yellow">Need 2+ months</TonePill>
          <MutedText className="mt-3">Upload multi-month data to unlock true MoM interpretation.</MutedText>
        </GlassCard>
      )}

      <GlassCard className="overflow-hidden">
        <div className="border-b border-current/10 p-5">
          <h2 className="text-xl font-black">Monthly Performance Table</h2>
          <MutedText className="mt-1 text-sm">Green = improved efficiency, yellow = watch, red = efficiency pressure.</MutedText>
        </div>

        <div className="overflow-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-current/10 bg-current/[0.035] text-[11px] uppercase tracking-[0.16em] opacity-55">
              <tr>
                <th className="px-5 py-4">Month</th>
                <th className="px-5 py-4">Spend</th>
                <th className="px-5 py-4">Revenue</th>
                <th className="px-5 py-4">ROAS</th>
                <th className="px-5 py-4">CPA</th>
                <th className="px-5 py-4">Purchases</th>
                <th className="px-5 py-4">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month} className="border-b border-current/5">
                  <td className="px-5 py-4 font-black">{m.month}</td>
                  <td className="px-5 py-4 opacity-70">{money(m.spend)}</td>
                  <td className="px-5 py-4 opacity-70">{money(m.revenue)}</td>
                  <td className="px-5 py-4 opacity-70">{num(m.roas)}</td>
                  <td className="px-5 py-4 opacity-70">{money(m.cpa)}</td>
                  <td className="px-5 py-4 opacity-70">{num(m.purchases, 0)}</td>
                  <td className="px-5 py-4 opacity-70">{money(m.contribution)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="text-xl font-black">MoM Interpretation</h2>
        <div className="mt-4 grid gap-3">
          <Surface className="p-4">
            {previous
              ? revenueChange >= spendChange
                ? "Revenue grew faster than or equal to spend. Scale quality is healthy."
                : "Spend grew faster than revenue. This indicates marginal efficiency pressure."
              : "Need at least two months of data for true MoM interpretation."}
          </Surface>
          <Surface className="p-4">
            {previous
              ? roasChange >= 0
                ? "ROAS improved MoM. Budget can be scaled carefully into proven winners."
                : "ROAS declined MoM. Pause aggressive scaling until waste and fatigue are fixed."
              : "Upload multi-month data to unlock ROAS movement."}
          </Surface>
        </div>
      </GlassCard>
    </div>
  );
}

function Empty({ title }: { title: string }) {
  return (
    <GlassCard className="p-8">
      <h2 className="text-2xl font-black">{title}</h2>
      <MutedText className="mt-2">Upload Meta data first to activate this screen.</MutedText>
    </GlassCard>
  );
}
