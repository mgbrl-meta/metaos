"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, Filter, Layers3 } from "lucide-react";
import type { MetaV2CleanRow } from "@/lib/meta-v2/schema";
import { buildMetaV2Funnel, type MetaV2FunnelRow } from "@/lib/meta-v2/engines/funnelEngine";
import {
  formatINRCompact,
  formatNumberCompact,
  formatRoas,
} from "@/lib/meta-v2/formatters";
import { MetricCard } from "@/components/meta-v2/shared/MetricCard";
import { SectionCard } from "@/components/meta-v2/shared/SectionCard";
import { StatusPill } from "@/components/meta-v2/shared/StatusPill";
import { EmptyState } from "@/components/meta-v2/shared/EmptyState";

function Cell({ value, tone = "normal" }: { value: string; tone?: "normal" | "green" | "red" | "blue" }) {
  const color =
    tone === "green"
      ? "text-emerald-300"
      : tone === "red"
        ? "text-red-300"
        : tone === "blue"
          ? "text-[#6BB6FF]"
          : "text-white/78";

  return (
    <td className={`whitespace-nowrap px-4 py-4 text-right text-sm font-black tabular-nums ${color}`}>
      {value}
    </td>
  );
}

function FunnelRow({
  row,
  isOpen,
  onToggle,
}: {
  row: MetaV2FunnelRow;
  isOpen?: boolean;
  onToggle?: () => void;
}) {
  const isMonth = row.level === "month";

  return (
    <tr className={isMonth ? "bg-white/[0.035]" : "bg-white/[0.02]"}>
      <td className="whitespace-nowrap px-4 py-4 text-left">
        <div className={isMonth ? "" : "pl-8"}>
          <div className={isMonth ? "text-sm font-black text-white" : "text-sm font-bold text-white/70"}>
            {row.label}
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-white/35">
            {row.startDate || "NA"} → {row.endDate || "NA"}
          </div>
        </div>
      </td>

      <Cell value={formatNumberCompact(row.totals.clicks)} />
      <Cell value={formatNumberCompact(row.totals.lpv)} />
      <Cell value={formatNumberCompact(row.totals.atc)} />
      <Cell value={formatNumberCompact(row.totals.checkout)} />
      <Cell value={formatNumberCompact(row.totals.payment)} />
      <Cell value={formatNumberCompact(row.totals.purchases)} tone={row.totals.purchases > 0 ? "green" : "red"} />
      <Cell value={formatINRCompact(row.totals.cpa)} tone="blue" />
      <Cell value={formatRoas(row.totals.roas)} tone={row.totals.roas >= 2 ? "green" : "red"} />
      <Cell value={formatINRCompact(row.totals.gpt)} tone={row.totals.gpt >= 0 ? "green" : "red"} />

      <td className="px-4 py-4 text-center">
        {isMonth ? (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.1]"
          >
            <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
          </button>
        ) : (
          <span className="text-white/25">—</span>
        )}
      </td>
    </tr>
  );
}

export function FunnelDashboard({ rows }: { rows: MetaV2CleanRow[] }) {
  const [openId, setOpenId] = useState("");
  const output = useMemo(() => buildMetaV2Funnel(rows), [rows]);

  if (!rows.length) {
    return <EmptyState title="Funnel data unavailable" description="Load Meta rows first." />;
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(10,132,255,0.26),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex flex-wrap gap-2">
          <StatusPill label="Funnel V2" tone="blue" />
          <StatusPill label={`${output.monthCount} months`} tone="slate" />
          <StatusPill label={`${output.weekCount} weeks`} tone="slate" />
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0A84FF] text-white">
            <Filter className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Funnel Movement Dashboard</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-white/58">{output.verdict}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Clicks" value={formatNumberCompact(output.summary.clicks)} />
        <MetricCard label="LPV" value={formatNumberCompact(output.summary.lpv)} />
        <MetricCard label="Purchases" value={formatNumberCompact(output.summary.purchases)} tone="green" />
        <MetricCard label="CPA" value={formatINRCompact(output.summary.cpa)} tone="blue" />
        <MetricCard label="ROAS" value={formatRoas(output.summary.roas)} tone={output.summary.roas >= 2 ? "green" : "red"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Strongest Month" eyebrow="Efficiency Winner">
          <p className="text-2xl font-black text-emerald-300">{output.strongestMonth}</p>
        </SectionCard>

        <SectionCard title="Weakest Month" eyebrow="Leakage Risk">
          <p className="text-2xl font-black text-red-300">{output.weakestMonth}</p>
        </SectionCard>
      </section>

      <SectionCard
        title="Month / Week Funnel Table"
        eyebrow="Engine Prepared"
        right={<Layers3 className="h-5 w-5 text-[#0A84FF]" />}
      >
        <div className="overflow-x-auto rounded-[24px] border border-white/10">
          <table className="w-full min-w-[1120px] border-collapse">
            <thead className="bg-white/[0.06] text-white/42">
              <tr>
                <th className="w-[190px] px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.15em]">Month</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">Clicks</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">LPV</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">ATC</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">Checkout</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">Payment</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">Purchases</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">CPA</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">ROAS</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">GPT</th>
                <th className="w-[70px] px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.15em]">Arrow</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {output.rows.map((row) => {
                const isOpen = openId === row.id;

                return (
                  <Fragment key={row.id}>
                    <FunnelRow row={row} isOpen={isOpen} onToggle={() => setOpenId(isOpen ? "" : row.id)} />

                    {isOpen
                      ? (row.children || []).map((child) => <FunnelRow key={child.id} row={child} />)
                      : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
