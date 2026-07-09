"use client";

import { AlertTriangle, Banknote, MousePointerClick, ShoppingBag, Target, TrendingUp } from "lucide-react";
import type { MetaV2CommandCenterOutput } from "@/lib/meta-v2/schema";
import {
  formatINRCompact,
  formatNumberCompact,
  formatRoas,
} from "@/lib/meta-v2/formatters";
import { MetricCard } from "@/components/meta-v2/shared/MetricCard";
import { SectionCard } from "@/components/meta-v2/shared/SectionCard";
import { StatusPill } from "@/components/meta-v2/shared/StatusPill";

export function CommandCenter({
  output,
}: {
  output: MetaV2CommandCenterOutput;
}) {
  return (
    <div className="grid gap-5">
      <section className="rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(10,132,255,0.28),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusPill label={`Health ${output.healthScore}/100`} tone={output.healthScore >= 70 ? "green" : output.healthScore >= 50 ? "amber" : "red"} />
              <StatusPill label={`Scale ${output.scaleReadiness}`} tone={output.scaleReadiness === "High" ? "green" : output.scaleReadiness === "Medium" ? "amber" : "red"} />
            </div>

            <h2 className="max-w-4xl text-3xl font-black tracking-tight text-white md:text-4xl">
              Performance Marketing Command Center
            </h2>

            <p className="mt-3 max-w-4xl text-sm leading-6 text-white/58">
              {output.verdict}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Spend" value={formatINRCompact(output.totals.spend)} icon={<Banknote className="h-4 w-4" />} />
        <MetricCard label="Revenue" value={formatINRCompact(output.totals.revenue)} tone="green" icon={<TrendingUp className="h-4 w-4" />} />
        <MetricCard label="ROAS" value={formatRoas(output.totals.roas)} tone={output.totals.roas >= 2 ? "green" : "amber"} icon={<Target className="h-4 w-4" />} />
        <MetricCard label="CPA" value={formatINRCompact(output.totals.cpa)} tone="blue" icon={<ShoppingBag className="h-4 w-4" />} />
        <MetricCard label="Purchases" value={formatNumberCompact(output.totals.purchases)} icon={<ShoppingBag className="h-4 w-4" />} />
        <MetricCard label="AOV" value={formatINRCompact(output.totals.aov)} tone="blue" />
        <MetricCard label="GPT" value={formatINRCompact(output.totals.gpt)} tone={output.totals.gpt >= 0 ? "green" : "red"} />
        <MetricCard label="Clicks" value={formatNumberCompact(output.totals.clicks)} icon={<MousePointerClick className="h-4 w-4" />} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Biggest Risk" eyebrow="Risk Control">
          <div className="flex gap-3 rounded-3xl border border-red-400/20 bg-red-400/10 p-4 text-red-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
            <p className="text-sm leading-6 text-red-100/80">{output.biggestRisk}</p>
          </div>
        </SectionCard>

        <SectionCard title="Biggest Opportunity" eyebrow="Scale Control">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <p className="text-sm leading-6 text-emerald-100/80">{output.biggestOpportunity}</p>
          </div>
        </SectionCard>
      </section>

      <SectionCard title="Action Distribution" eyebrow="Decision Engine">
        <div className="grid gap-3 md:grid-cols-5">
          <MetricCard label="Scale" value={String(output.actionCounts.scale)} tone="green" />
          <MetricCard label="Reduce" value={String(output.actionCounts.reduce)} tone="amber" />
          <MetricCard label="Kill" value={String(output.actionCounts.kill)} tone="red" />
          <MetricCard label="Refresh" value={String(output.actionCounts.refresh)} tone="blue" />
          <MetricCard label="Watch" value={String(output.actionCounts.watch)} tone="slate" />
        </div>
      </SectionCard>
    </div>
  );
}
