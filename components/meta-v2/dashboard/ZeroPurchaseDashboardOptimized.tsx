"use client";

import { Fragment, memo } from "react";
import { ChevronDown, Copy, ShieldAlert, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import type { MetaV2CleanRow } from "@/lib/meta-v2/schema";
import { useZeroPurchaseData } from "@/components/meta-v2/hooks/useZeroPurchaseData";
import { useCopyToClipboard } from "@/components/meta-v2/hooks/useCopyToClipboard";
import { useExpandedRows } from "@/components/meta-v2/hooks/useExpandedRows";
import { usePagination } from "@/components/meta-v2/hooks/usePagination";
import { ZeroPurchaseService } from "@/lib/meta-v2/services/zeroPurchaseService";
import { formatINRCompact, formatNumberCompact, formatRoas } from "@/lib/meta-v2/formatters";
import { MetricCard } from "@/components/meta-v2/shared/MetricCard";
import { SectionCard } from "@/components/meta-v2/shared/SectionCard";
import { StatusPill } from "@/components/meta-v2/shared/StatusPill";
import { EmptyState } from "@/components/meta-v2/shared/EmptyState";
import { ErrorBoundary } from "@/components/meta-v2/shared/ErrorBoundary";

const Cell = memo(function Cell({
  value,
  tone = "normal",
}: {
  value: string;
  tone?: "normal" | "green" | "red" | "blue" | "amber";
}) {
  const color =
    tone === "green"
      ? "text-emerald-300"
      : tone === "red"
        ? "text-red-300"
        : tone === "blue"
          ? "text-[#6BB6FF]"
          : tone === "amber"
            ? "text-amber-200"
            : "text-white/78";

  return (
    <td className={`whitespace-nowrap px-4 py-4 text-right text-sm font-black tabular-nums ${color}`}>
      {value}
    </td>
  );
});

const TableRow = memo(function TableRow({ item, isOpen, onToggle }: any) {
  return (
    <Fragment>
      <tr className="bg-white/[0.025] hover:bg-white/[0.045]">
        <td className="px-4 py-4 text-left">
          <div className="mb-2">
            <StatusPill
              label={item.severity}
              tone={
                item.severity === "critical"
                  ? "red"
                  : item.severity === "high"
                    ? "amber"
                    : "blue"
              }
            />
          </div>
          <div className="max-w-[310px] truncate text-sm font-black text-white" title={item.adName}>
            {item.adName}
          </div>
          <div className="mt-1 max-w-[310px] truncate text-xs font-medium text-white/38" title={`${item.campaignName} · ${item.adSetName}`}>
            {item.campaignName} · {item.adSetName}
          </div>
        </td>
        <Cell value={formatINRCompact(item.lifetime.spend)} tone="red" />
        <Cell value={formatINRCompact(item.latest.spend)} tone={item.latest.spend > 0 ? "red" : "normal"} />
        <Cell value={formatINRCompact(item.last7.spend)} tone={item.last7.spend > 0 ? "red" : "normal"} />
        <Cell value={formatNumberCompact(item.lifetime.clicks)} />
        <Cell value={formatNumberCompact(item.lifetime.lpv)} />
        <Cell value={formatNumberCompact(item.lifetime.atc)} tone={item.lifetime.atc > 0 ? "amber" : "normal"} />
        <Cell value={formatNumberCompact(item.lifetime.purchases)} tone="red" />
        <Cell value={formatRoas(item.lifetime.roas)} tone="red" />
        <td className="px-4 py-4 text-center">
          <button
            type="button"
            onClick={() => onToggle(item.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.1]"
          >
            <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </td>
      </tr>

      {isOpen && (
        <tr>
          <td colSpan={10} className="bg-white/[0.018] px-4 py-4">
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.4fr]">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <h3 className="text-sm font-black text-white">Why This Is Waste</h3>
                <div className="mt-2 grid gap-1 text-sm leading-6 text-white/55">
                  <p>• {item.reason}</p>
                  <p>• Lifetime spend is {formatINRCompact(item.lifetime.spend)} with zero purchases.</p>
                  <p>• Latest spend is {formatINRCompact(item.latest.spend)}.</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <h3 className="text-sm font-black text-white">Operator Action</h3>
                <div className="mt-2 grid gap-1 text-sm leading-6 text-white/55">
                  <p>• {item.action}</p>
                  <p>• Check LPV and ATC before deciding permanent kill vs offer/PDP fix.</p>
                  <p>• Do not scale surrounding ad set until this leakage is controlled.</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-[22px] border border-white/10">
                <table className="w-full min-w-[500px] border-collapse text-xs">
                  <thead className="bg-white/[0.06] text-white/42">
                    <tr>
                      <th className="px-2 py-2 text-left font-black">Date</th>
                      <th className="px-2 py-2 text-right font-black">Spend</th>
                      <th className="px-2 py-2 text-right font-black">Purchases</th>
                      <th className="px-2 py-2 text-right font-black">ROAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {item.trend.map((row: any) => (
                      <tr key={row.date} className="bg-white/[0.02]">
                        <td className="px-2 py-2 text-left text-white/72">{row.date}</td>
                        <td className="px-2 py-2 text-right text-red-300">{formatINRCompact(row.spend)}</td>
                        <td className="px-2 py-2 text-right text-red-300">{formatNumberCompact(row.purchases)}</td>
                        <td className="px-2 py-2 text-right text-red-300">{formatRoas(row.roas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
});

export function ZeroPurchaseDashboardOptimized({ rows }: { rows: MetaV2CleanRow[] }) {
  const { output, threshold, updateThreshold, error } = useZeroPurchaseData(rows);
  const { openId, toggleRow } = useExpandedRows();
  const { copied, copy } = useCopyToClipboard();

  // Pagination for large datasets
  const pagination = usePagination(output?.items || [], { pageSize: 50 });

  if (error) {
    return (
      <ErrorBoundary
        error={error}
        title="Zero Purchase Data Error"
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!rows.length) {
    return <EmptyState title="Zero Purchase data unavailable" description="Load Meta rows first." />;
  }

  if (!output) {
    return <EmptyState title="Processing..." description="Loading Zero Purchase analysis." />;
  }

  const handleCopyHandles = async () => {
    const handles = ZeroPurchaseService.extractHandles(output.items.map(i => i.adName));
    await copy(handles, `${handles.length} handles copied`);
  };

  const handleCopyAdNames = async () => {
    const names = output.items.map(i => i.adName);
    await copy(names, `${names.length} ad names copied`);
  };

  return (
    <div className="grid gap-5">
      {/* Header */}
      <section className="rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.25),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex flex-wrap gap-2">
          <StatusPill label="Zero Purchase V2" tone="red" />
          <StatusPill label={`${output.totalItems} ads`} tone={output.totalItems > 0 ? "red" : "green"} />
          <StatusPill label={`Latest ${output.latestDate || "NA"}`} tone="slate" />
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500 text-white">
            <ShieldAlert className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Zero-Purchase Waste Control</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-white/58">{output.verdict}</p>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Waste Ads" value={String(output.totalItems)} tone={output.totalItems > 0 ? "red" : "green"} />
        <MetricCard label="Lifetime Waste" value={formatINRCompact(output.totalLifetimeWaste)} tone="red" />
        <MetricCard label="Last 7D Waste" value={formatINRCompact(output.totalLast7Waste)} tone={output.totalLast7Waste > 0 ? "red" : "green"} />
        <MetricCard label="Latest Waste" value={formatINRCompact(output.totalLatestWaste)} tone={output.totalLatestWaste > 0 ? "red" : "green"} />
      </section>

      {/* Controls */}
      <SectionCard
        title="Waste Filter"
        eyebrow="Control Threshold"
        right={<SlidersHorizontal className="h-5 w-5 text-[#0A84FF]" />}
      >
        <div className="flex flex-wrap items-center gap-2">
          {[2000, 3000, 5000, 10000].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => updateThreshold(value)}
              className={
                threshold === value
                  ? "rounded-full bg-[#0A84FF] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white"
                  : "rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/58 hover:bg-white/[0.08]"
              }
            >
              {formatINRCompact(value)}
            </button>
          ))}

          <input
            type="number"
            value={threshold}
            onChange={(e) => updateThreshold(Math.max(0, Number(e.target.value || 0)))}
            className="h-9 w-[140px] rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-black text-white outline-none"
          />

          {copied ? <span className="ml-auto text-xs font-black text-emerald-300">{copied}</span> : null}

          <button
            type="button"
            onClick={handleCopyHandles}
            className="inline-flex items-center gap-2 rounded-full bg-[#0A84FF] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white hover:bg-[#0A84FF]/90"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Handles
          </button>

          <button
            type="button"
            onClick={handleCopyAdNames}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/65 hover:bg-white/[0.08]"
          >
            Copy Names
          </button>
        </div>
      </SectionCard>

      {/* Table with Pagination */}
      <SectionCard title="Ads With Spend But Zero Purchases" eyebrow="Budget Recovery">
        <div className="overflow-x-auto rounded-[24px] border border-white/10">
          <table className="w-full min-w-[1220px] border-collapse">
            <thead className="bg-white/[0.06] text-white/42">
              <tr>
                <th className="w-[330px] px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.15em]">Ad</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">Lifetime</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">Latest</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">Last 7D</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">Clicks</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">LPV</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">ATC</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">Purchases</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">ROAS</th>
                <th className="w-[70px] px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.15em]">Open</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {pagination.paginatedItems.map((item) => (
                <TableRow
                  key={item.id}
                  item={item}
                  isOpen={openId === item.id}
                  onToggle={toggleRow}
                />
              ))}

              {!pagination.paginatedItems.length && (
                <tr>
                  <td colSpan={10} className="px-4 py-8">
                    <EmptyState
                      title="No zero-purchase waste at this threshold"
                      description="Lower the threshold or check another time window."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs font-black text-white/60">
              Showing {pagination.startIndex + 1} to {pagination.endIndex} of {pagination.totalItems} ads
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={pagination.prevPage}
                disabled={pagination.page === 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 disabled:opacity-50 hover:bg-white/[0.1]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const startPage = Math.max(1, pagination.page - 2);
                  const pageNum = startPage + i;

                  if (pageNum > pagination.totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => pagination.goToPage(pageNum)}
                      className={`h-8 w-8 rounded text-xs font-black ${
                        pageNum === pagination.page
                          ? "bg-[#0A84FF] text-white"
                          : "border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={pagination.nextPage}
                disabled={pagination.page === pagination.totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 disabled:opacity-50 hover:bg-white/[0.1]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
