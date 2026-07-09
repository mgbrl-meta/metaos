"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, Filter, Table2 } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";
import { normalizeUnknownRows } from "@/lib/meta/normalize";
import {
  buildFunnelSummary,
  buildFunnelTableRows,
  type FunnelTableRow,
} from "@/lib/meta/tabEngines/funnelEngine";
import {
  formatCpa,
  formatINRCompact,
  formatNumberCompact,
  formatRoas,
  formatShortDate,
} from "@/lib/meta/formatters";
import { MetaEmptyState } from "@/components/meta/shared/MetaEmptyState";

function FunnelMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111827]">
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function PeriodLabel({ row }: { row: FunnelTableRow }) {
  return (
    <div>
      <div className={row.level === "month" ? "font-black" : "font-semibold"}>
        {row.label}
      </div>
      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
        {formatShortDate(row.startDate)}–{formatShortDate(row.endDate)}
      </div>
    </div>
  );
}

function NumberCell({ children }: { children: string }) {
  return (
    <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">
      {children}
    </td>
  );
}

function FunnelRow({
  row,
  isOpen,
  onToggle,
}: {
  row: FunnelTableRow;
  isOpen?: boolean;
  onToggle?: () => void;
}) {
  const isMonth = row.level === "month";

  return (
    <tr
      className={[
        "border-b border-slate-100 dark:border-white/10",
        isMonth ? "bg-white dark:bg-[#111827]" : "bg-slate-50/70 dark:bg-white/[0.03]",
      ].join(" ")}
    >
      <td className="whitespace-nowrap px-3 py-3 text-left text-sm text-slate-900 dark:text-white">
        <div className={isMonth ? "" : "pl-8"}>
          <PeriodLabel row={row} />
        </div>
      </td>

      <NumberCell>{formatNumberCompact(row.totals.clicks)}</NumberCell>
      <NumberCell>{formatNumberCompact(row.totals.lpv)}</NumberCell>
      <NumberCell>{formatNumberCompact(row.totals.atc)}</NumberCell>
      <NumberCell>{formatNumberCompact(row.totals.checkout)}</NumberCell>
      <NumberCell>{formatNumberCompact(row.totals.payment)}</NumberCell>
      <NumberCell>{formatNumberCompact(row.totals.purchases)}</NumberCell>
      <NumberCell>{formatCpa(row.totals.cpa)}</NumberCell>
      <NumberCell>{formatRoas(row.totals.roas)}</NumberCell>
      <NumberCell>{formatINRCompact(row.gpt)}</NumberCell>

      <td className="whitespace-nowrap px-3 py-3 text-center">
        {isMonth ? (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            aria-label={`Open ${row.label} weekly rows`}
          >
            <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
          </button>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
    </tr>
  );
}

export function FunnelTabV2() {
  const performanceRows = useMetaStore((state) => state.performanceRows);
  const [openMonth, setOpenMonth] = useState<string>("");

  const cleanRows = useMemo(
    () => normalizeUnknownRows((performanceRows || []) as unknown as Record<string, unknown>[]),
    [performanceRows]
  );

  const tableRows = useMemo(() => buildFunnelTableRows(cleanRows), [cleanRows]);
  const summary = useMemo(() => buildFunnelSummary(cleanRows), [cleanRows]);

  if (!cleanRows.length) {
    return (
      <MetaEmptyState
        title="Funnel data not loaded"
        description="Refresh Meta data to activate the funnel table."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111827]">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0A84FF]/30 bg-[#0A84FF]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A84FF]">
            <Filter className="h-3.5 w-3.5" />
            Funnel V2
          </span>

          <span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:text-slate-400">
            {summary.monthCount} months
          </span>

          <span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:text-slate-400">
            {summary.weekCount} weeks
          </span>
        </div>

        <h1 className="text-xl font-black text-slate-950 dark:text-white">
          Funnel Movement Master Table
        </h1>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Clean month table with weekly expansion. Data is prepared by the funnel engine, not the UI.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        <FunnelMetric label="Clicks" value={formatNumberCompact(summary.totals.clicks)} />
        <FunnelMetric label="LPV" value={formatNumberCompact(summary.totals.lpv)} />
        <FunnelMetric label="Purchases" value={formatNumberCompact(summary.totals.purchases)} />
        <FunnelMetric label="CPA" value={formatCpa(summary.totals.cpa)} />
        <FunnelMetric label="ROAS" value={formatRoas(summary.totals.roas)} />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111827]">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Table2 className="h-4 w-4 text-[#0A84FF]" />
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">
                Month / Week Funnel Table
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Month | Clicks | LPV | ATC | Checkout | Payment | Purchases | CPA | ROAS | GPT | Arrow
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] border-collapse text-left">
            <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="w-[180px] px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em]">
                  Month
                </th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">Clicks</th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">LPV</th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">ATC</th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">Checkout</th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">Payment</th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">Purchases</th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">CPA</th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">ROAS</th>
                <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">GPT</th>
                <th className="w-[70px] px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.14em]">Arrow</th>
              </tr>
            </thead>

            <tbody>
              {tableRows.map((row) => {
                const isOpen = openMonth === row.id;

                return (
                  <Fragment key={row.id}>
                    <FunnelRow
                      row={row}
                      isOpen={isOpen}
                      onToggle={() => setOpenMonth(isOpen ? "" : row.id)}
                    />

                    {isOpen &&
                      (row.children || []).map((child) => (
                        <FunnelRow key={child.id} row={child} />
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
