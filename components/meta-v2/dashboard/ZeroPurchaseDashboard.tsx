"use client";

import { Fragment, useState, useMemo } from "react";
import { ChevronDown, Copy, ShieldAlert, SlidersHorizontal } from "lucide-react";
import type { MetaV2CleanRow } from "@/lib/meta-v2/schema";
import { useZeroPurchaseData } from "@/components/meta-v2/hooks/useZeroPurchaseData";
import { useCopyToClipboard } from "@/components/meta-v2/hooks/useCopyToClipboard";
import { useExpandedRows } from "@/components/meta-v2/hooks/useExpandedRows";
import { useDateRange } from "@/components/meta-v2/hooks/useDateRange";
import { ZeroPurchaseService } from "@/lib/meta-v2/services/zeroPurchaseService";
import { formatINRCompact, formatNumberCompact, formatRoas } from "@/lib/meta-v2/formatters";
import { themeColor } from "@/lib/meta-v2/theming/useThemeColor";
import { MetricCard } from "@/components/meta-v2/shared/MetricCard";
import { SectionCard } from "@/components/meta-v2/shared/SectionCard";
import { StatusPill } from "@/components/meta-v2/shared/StatusPill";
import { EmptyState } from "@/components/meta-v2/shared/EmptyState";
import { ErrorBoundary } from "@/components/meta-v2/shared/ErrorBoundary";
import { DateRangeFilter, DateRangeDisplay } from "@/components/meta-v2/shared/DateRangeFilter";
import { AdvancedFilters } from "@/components/meta-v2/shared/AdvancedFilters";
import { ExportButton } from "@/components/meta-v2/shared/ExportButton";
import { TrendChart } from "@/components/meta-v2/shared/TrendChart";
import { FilterService } from "@/lib/meta-v2/services/filterService";

function Cell({
  value,
  tone = "normal",
}: {
  value: string;
  tone?: "normal" | "green" | "red" | "blue" | "amber";
}) {
  const colorVar =
    tone === "green"
      ? themeColor('status-success')
      : tone === "red"
        ? themeColor('status-error')
        : tone === "blue"
          ? themeColor('status-info')
          : tone === "amber"
            ? themeColor('status-warning')
            : themeColor('text-primary');

  return (
    <td
      className="whitespace-nowrap px-4 py-4 text-right text-sm font-black tabular-nums"
      style={{ color: colorVar, opacity: tone === 'normal' ? 0.78 : 1 }}
    >
      {value}
    </td>
  );
}

export function ZeroPurchaseDashboard({ rows }: { rows: MetaV2CleanRow[] }) {
  const { output, threshold, updateThreshold, error } = useZeroPurchaseData(rows);
  const { openId, toggleRow } = useExpandedRows();
  const { copied, copy } = useCopyToClipboard();
  const { dateRange, isOpen, updateDateRange, openFilter, closeFilter } = useDateRange();
  const [filteredItems, setFilteredItems] = useState(output?.items || []);

  // Apply filters whenever date range or output changes
  const displayItems = useMemo(() => {
    if (!output?.items) return [];

    return FilterService.applyFilters(output.items, {
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
    });
  }, [output?.items, dateRange]);

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
      <section
        className="rounded-[36px] border p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)]"
        style={{
          borderColor: themeColor('border'),
          backgroundColor: `var(--theme-bg-surface)`,
        }}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <StatusPill label="Zero Purchase V2" tone="red" />
            <StatusPill label={`${output.totalItems} ads`} tone={output.totalItems > 0 ? "red" : "green"} />
            <StatusPill label={`Latest ${output.latestDate || "NA"}`} tone="slate" />
          </div>
          <DateRangeDisplay
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onClick={openFilter}
          />
        </div>

        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white"
            style={{
              backgroundColor: themeColor('status-error'),
            }}
          >
            <ShieldAlert className="h-5 w-5" />
          </div>

          <div>
            <h1
              className="text-3xl font-black tracking-tight"
              style={{ color: themeColor('text-primary') }}
            >
              Zero-Purchase Waste Control
            </h1>
            <p
              className="mt-2 max-w-4xl text-sm leading-6"
              style={{ color: themeColor('text-secondary'), opacity: 0.78 }}
            >
              {output.verdict}
            </p>
          </div>
        </div>
      </section>

      {/* Date Filter Modal */}
      {isOpen && (
        <DateRangeFilter
          onApply={updateDateRange}
          onClose={closeFilter}
          initialStartDate={dateRange.startDate}
          initialEndDate={dateRange.endDate}
        />
      )}

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
        right={
          <SlidersHorizontal
            className="h-5 w-5"
            style={{ color: themeColor('button-primary') }}
          />
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {[2000, 3000, 5000, 10000].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => updateThreshold(value)}
              className="rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.12em]"
              style={
                threshold === value
                  ? {
                      backgroundColor: themeColor('button-primary'),
                      color: themeColor('text-inverse'),
                    }
                  : {
                      borderColor: themeColor('border'),
                      backgroundColor: `var(--theme-bg-surface-subtle)`,
                      color: themeColor('text-secondary'),
                    }
              }
            >
              {formatINRCompact(value)}
            </button>
          ))}

          <input
            type="number"
            value={threshold}
            onChange={(e) => updateThreshold(Math.max(0, Number(e.target.value || 0)))}
            className="h-9 w-[140px] rounded-full border px-4 text-xs font-black outline-none"
            style={{
              borderColor: themeColor('border'),
              backgroundColor: `var(--theme-bg-surface-subtle)`,
              color: themeColor('text-primary'),
            }}
          />

          {copied ? (
            <span
              className="ml-auto text-xs font-black"
              style={{ color: themeColor('status-success') }}
            >
              {copied}
            </span>
          ) : null}

          <button
            type="button"
            onClick={handleCopyHandles}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.12em]"
            style={{
              backgroundColor: themeColor('button-primary'),
              color: themeColor('text-inverse'),
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Handles
          </button>

          <button
            type="button"
            onClick={handleCopyAdNames}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em]"
            style={{
              borderColor: themeColor('border'),
              backgroundColor: `var(--theme-bg-surface-subtle)`,
              color: themeColor('text-secondary'),
            }}
          >
            Copy Names
          </button>
        </div>
      </SectionCard>

      {/* Advanced Filters */}
      <AdvancedFilters items={displayItems} onFiltersChange={setFilteredItems} />

      {/* Trend Chart */}
      {filteredItems.length > 0 && (
        <TrendChart items={filteredItems} title="Waste Trend Over Date Range" />
      )}

      {/* Table Header with Export */}
      <div className="flex items-center justify-between gap-3">
        <h2
          className="text-lg font-black"
          style={{ color: themeColor('text-primary') }}
        >
          Filtered Results ({filteredItems.length} ads)
        </h2>
        <ExportButton items={filteredItems} dateRange={dateRange} />
      </div>

      {/* Table */}
      <SectionCard title="Ads With Spend But Zero Purchases" eyebrow="Budget Recovery">
        <div
          className="overflow-x-auto rounded-[24px] border"
          style={{ borderColor: themeColor('border') }}
        >
          <table className="w-full min-w-[1220px] border-collapse">
            <thead
              style={{
                backgroundColor: `var(--theme-bg-surface-subtle)`,
                color: themeColor('text-secondary'),
              }}
            >
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

            <tbody
              style={{
                borderColor: themeColor('border'),
              }}
              className="divide-y"
            >
              {filteredItems.map((item) => {
                const isOpen = openId === item.id;

                return (
                  <Fragment key={item.id}>
                    <tr
                      style={{
                        backgroundColor: `var(--theme-bg-surface)`,
                      }}
                      className="hover:opacity-80"
                    >
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
                        <div
                          className="max-w-[310px] truncate text-sm font-black"
                          style={{ color: themeColor('text-primary') }}
                          title={item.adName}
                        >
                          {item.adName}
                        </div>
                        <div
                          className="mt-1 max-w-[310px] truncate text-xs font-medium"
                          style={{ color: themeColor('text-secondary') }}
                          title={`${item.campaignName} · ${item.adSetName}`}
                        >
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
                          onClick={() => toggleRow(item.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition"
                          style={{
                            borderColor: themeColor('border'),
                            backgroundColor: `var(--theme-bg-surface-subtle)`,
                            color: themeColor('text-secondary'),
                          }}
                        >
                          <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr
                        style={{
                          backgroundColor: `var(--theme-bg-surface-subtle)`,
                        }}
                      >
                        <td colSpan={10} className="px-4 py-4">
                          <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.4fr]">
                            <div
                              className="rounded-[24px] border p-4"
                              style={{
                                borderColor: themeColor('border'),
                                backgroundColor: `var(--theme-bg-surface)`,
                              }}
                            >
                              <h3
                                className="text-sm font-black"
                                style={{ color: themeColor('text-primary') }}
                              >
                                Why This Is Waste
                              </h3>
                              <div
                                className="mt-2 grid gap-1 text-sm leading-6"
                                style={{ color: themeColor('text-secondary') }}
                              >
                                <p>• {item.reason}</p>
                                <p>• Lifetime spend is {formatINRCompact(item.lifetime.spend)} with zero purchases.</p>
                                <p>• Latest spend is {formatINRCompact(item.latest.spend)}.</p>
                              </div>
                            </div>

                            <div
                              className="rounded-[24px] border p-4"
                              style={{
                                borderColor: themeColor('border'),
                                backgroundColor: `var(--theme-bg-surface)`,
                              }}
                            >
                              <h3
                                className="text-sm font-black"
                                style={{ color: themeColor('text-primary') }}
                              >
                                Operator Action
                              </h3>
                              <div
                                className="mt-2 grid gap-1 text-sm leading-6"
                                style={{ color: themeColor('text-secondary') }}
                              >
                                <p>• {item.action}</p>
                                <p>• Check LPV and ATC before deciding permanent kill vs offer/PDP fix.</p>
                                <p>• Do not scale surrounding ad set until this leakage is controlled.</p>
                              </div>
                            </div>

                            {/* Trend table - simplified */}
                            <div
                              className="overflow-x-auto rounded-[22px] border"
                              style={{ borderColor: themeColor('border') }}
                            >
                              <table className="w-full min-w-[500px] border-collapse text-xs">
                                <thead
                                  style={{
                                    backgroundColor: `var(--theme-bg-surface-subtle)`,
                                    color: themeColor('text-secondary'),
                                  }}
                                >
                                  <tr>
                                    <th className="px-2 py-2 text-left font-black">Date</th>
                                    <th className="px-2 py-2 text-right font-black">Spend</th>
                                    <th className="px-2 py-2 text-right font-black">Purchases</th>
                                    <th className="px-2 py-2 text-right font-black">ROAS</th>
                                  </tr>
                                </thead>
                                <tbody
                                  className="divide-y"
                                  style={{ borderColor: themeColor('border') }}
                                >
                                  {item.trend.map((row) => (
                                    <tr
                                      key={row.date}
                                      style={{
                                        backgroundColor: `var(--theme-bg-surface)`,
                                      }}
                                    >
                                      <td
                                        className="px-2 py-2 text-left"
                                        style={{ color: themeColor('text-secondary') }}
                                      >
                                        {row.date}
                                      </td>
                                      <td
                                        className="px-2 py-2 text-right"
                                        style={{ color: themeColor('status-error') }}
                                      >
                                        {formatINRCompact(row.spend)}
                                      </td>
                                      <td
                                        className="px-2 py-2 text-right"
                                        style={{ color: themeColor('status-error') }}
                                      >
                                        {formatNumberCompact(row.purchases)}
                                      </td>
                                      <td
                                        className="px-2 py-2 text-right"
                                        style={{ color: themeColor('status-error') }}
                                      >
                                        {formatRoas(row.roas)}
                                      </td>
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
              })}

              {!output.items.length && (
                <tr
                  style={{
                    backgroundColor: `var(--theme-bg-surface)`,
                  }}
                >
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
      </SectionCard>
    </div>
  );
}
