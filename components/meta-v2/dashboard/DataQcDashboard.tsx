"use client";

import { useMemo } from "react";
import { CheckCircle2, Database, ShieldAlert, TriangleAlert } from "lucide-react";
import type { MetaV2CleanRow } from "@/lib/meta-v2/schema";
import {
  buildMetaV2DataQc,
  type MetaV2QcSeverity,
} from "@/lib/meta-v2/engines/dataQcEngine";
import {
  formatINRCompact,
  formatNumberFull,
  formatPct,
  formatRoas,
} from "@/lib/meta-v2/formatters";
import { MetricCard } from "@/components/meta-v2/shared/MetricCard";
import { SectionCard } from "@/components/meta-v2/shared/SectionCard";
import { StatusPill } from "@/components/meta-v2/shared/StatusPill";
import { EmptyState } from "@/components/meta-v2/shared/EmptyState";

function severityTone(severity: MetaV2QcSeverity) {
  if (severity === "critical") return "red" as const;
  if (severity === "warning") return "amber" as const;
  if (severity === "info") return "blue" as const;
  return "green" as const;
}

function severityIcon(severity: MetaV2QcSeverity) {
  if (severity === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  if (severity === "critical") return <ShieldAlert className="h-4 w-4 text-red-300" />;
  return <TriangleAlert className="h-4 w-4 text-amber-200" />;
}

export function DataQcDashboard({ rows }: { rows: MetaV2CleanRow[] }) {
  const output = useMemo(() => buildMetaV2DataQc(rows), [rows]);

  if (!rows.length) {
    return (
      <EmptyState
        title="Data QC is ready"
        description="Load Meta rows to see source health, column confidence, and reliability warnings."
      />
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(10,132,255,0.24),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex flex-wrap gap-2">
          <StatusPill label="Data QC V2" tone="blue" />
          <StatusPill label={`Score ${output.score}/100`} tone={output.score >= 80 ? "green" : output.score >= 60 ? "amber" : "red"} />
          <StatusPill label={output.grade} tone={output.score >= 80 ? "green" : output.score >= 60 ? "amber" : "red"} />
          <StatusPill label={`Confidence ${output.confidence}`} tone={output.confidence === "High" ? "green" : output.confidence === "Medium" ? "amber" : "red"} />
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0A84FF] text-white">
            <Database className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Meta Data Quality Control</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-white/58">{output.verdict}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Rows" value={formatNumberFull(output.rowCount)} />
        <MetricCard label="Active Rows" value={formatNumberFull(output.activeRowCount)} tone="blue" />
        <MetricCard label="Column Confidence" value={`${output.totalColumnsConfidence}/100`} tone={output.totalColumnsConfidence >= 75 ? "green" : "amber"} />
        <MetricCard label="Latest Date" value={output.latestDate || "NA"} tone="slate" />
        <MetricCard label="Spend" value={formatINRCompact(output.totals.spend)} />
        <MetricCard label="Revenue" value={formatINRCompact(output.totals.revenue)} tone="green" />
        <MetricCard label="ROAS" value={formatRoas(output.totals.roas)} tone={output.totals.roas >= 2 ? "green" : "amber"} />
        <MetricCard label="Zero Purchase Share" value={formatPct(output.zeroPurchaseSpendShare)} tone={output.zeroPurchaseSpendShare >= 25 ? "red" : output.zeroPurchaseSpendShare > 0 ? "amber" : "green"} />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Critical" value={String(output.issueCounts.critical)} tone={output.issueCounts.critical > 0 ? "red" : "green"} />
        <MetricCard label="Warnings" value={String(output.issueCounts.warning)} tone={output.issueCounts.warning > 0 ? "amber" : "green"} />
        <MetricCard label="Info" value={String(output.issueCounts.info)} tone="blue" />
        <MetricCard label="Passed" value={String(output.issueCounts.pass)} tone="green" />
      </section>

      <SectionCard title="QC Issues & Checks" eyebrow="Trust Layer">
        <div className="overflow-hidden rounded-[24px] border border-white/10">
          <table className="w-full min-w-[980px] border-collapse">
            <thead className="bg-white/[0.06] text-white/42">
              <tr>
                <th className="w-[150px] px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.15em]">Severity</th>
                <th className="w-[230px] px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.15em]">Check</th>
                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.15em]">Detail</th>
                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.15em]">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {output.issues.map((issue) => (
                <tr key={issue.code} className="bg-white/[0.025] hover:bg-white/[0.045]">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {severityIcon(issue.severity)}
                      <StatusPill label={issue.severity} tone={severityTone(issue.severity)} />
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-sm font-black text-white">{issue.title}</div>
                    <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/30">
                      {issue.code}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm leading-6 text-white/60">{issue.detail}</td>
                  <td className="px-4 py-4 text-sm leading-6 text-white/70">{issue.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
