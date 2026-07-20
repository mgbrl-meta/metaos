'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { themeColor } from '@/lib/meta-v2/theming/useThemeColor';
import type { MetaV2ZeroPurchaseItem } from '@/lib/meta-v2/engines/zeroPurchaseEngine';
import { FilterService, type FilterCriteria } from '@/lib/meta-v2/services/filterService';

interface AdvancedFiltersProps {
  items: MetaV2ZeroPurchaseItem[];
  onFiltersChange: (filtered: MetaV2ZeroPurchaseItem[]) => void;
}

export function AdvancedFilters({ items, onFiltersChange }: AdvancedFiltersProps) {
  const [threshold, setThreshold] = useState<number>(0);
  const [severity, setSeverity] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  const [campaign, setCampaign] = useState<string>('');
  const [adSet, setAdSet] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Get unique values for dropdowns
  const uniqueCampaigns = useMemo(() => FilterService.getUniqueCampaigns(items), [items]);
  const uniqueAdSets = useMemo(() => FilterService.getUniqueAdSets(items), [items]);

  // Apply filters
  const filtered = useMemo(() => {
    const criteria: FilterCriteria = {
      threshold: threshold > 0 ? threshold : undefined,
      severity: severity !== 'all' ? severity : undefined,
      campaign: campaign || undefined,
      adSet: adSet || undefined,
      searchTerm: searchTerm || undefined,
    };

    const result = FilterService.applyFilters(items, criteria);
    onFiltersChange(result);
    return result;
  }, [items, threshold, severity, campaign, adSet, searchTerm, onFiltersChange]);

  const stats = FilterService.getFilterStats(filtered, items.length);
  const severityDist = FilterService.getSeverityDistribution(filtered);

  const resetFilters = () => {
    setThreshold(0);
    setSeverity('all');
    setCampaign('');
    setAdSet('');
    setSearchTerm('');
  };

  const hasActiveFilters = threshold > 0 || severity !== 'all' || campaign || adSet || searchTerm;

  return (
    <div
      className="rounded-lg border p-6"
      style={{
        borderColor: themeColor('border'),
        backgroundColor: `var(--theme-bg-surface)`,
      }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3
          className="text-sm font-black"
          style={{ color: themeColor('text-primary') }}
        >
          Advanced Filters
        </h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs font-black"
            style={{ color: themeColor('status-info') }}
          >
            <X className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      {/* Filters Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Threshold Filter */}
        <div>
          <label
            className="mb-2 block text-xs font-black uppercase tracking-[0.1em]"
            style={{ color: themeColor('text-secondary') }}
          >
            Min Waste (₹)
          </label>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            placeholder="0"
            className="w-full rounded-lg border px-3 py-2 text-sm font-black outline-none"
            style={{
              borderColor: themeColor('border'),
              backgroundColor: `var(--theme-bg-surface-subtle)`,
              color: themeColor('text-primary'),
            }}
          />
        </div>

        {/* Severity Filter */}
        <div>
          <label
            className="mb-2 block text-xs font-black uppercase tracking-[0.1em]"
            style={{ color: themeColor('text-secondary') }}
          >
            Severity
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as any)}
            className="w-full rounded-lg border px-3 py-2 text-sm font-black outline-none"
            style={{
              borderColor: themeColor('border'),
              backgroundColor: `var(--theme-bg-surface-subtle)`,
              color: themeColor('text-primary'),
            }}
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
          </select>
        </div>

        {/* Campaign Filter */}
        <div>
          <label
            className="mb-2 block text-xs font-black uppercase tracking-[0.1em]"
            style={{ color: themeColor('text-secondary') }}
          >
            Campaign
          </label>
          <select
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm font-black outline-none"
            style={{
              borderColor: themeColor('border'),
              backgroundColor: `var(--theme-bg-surface-subtle)`,
              color: themeColor('text-primary'),
            }}
          >
            <option value="">All Campaigns</option>
            {uniqueCampaigns.map((camp) => (
              <option key={camp} value={camp}>
                {camp.substring(0, 30)}...
              </option>
            ))}
          </select>
        </div>

        {/* Ad Set Filter */}
        <div>
          <label
            className="mb-2 block text-xs font-black uppercase tracking-[0.1em]"
            style={{ color: themeColor('text-secondary') }}
          >
            Ad Set
          </label>
          <select
            value={adSet}
            onChange={(e) => setAdSet(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm font-black outline-none"
            style={{
              borderColor: themeColor('border'),
              backgroundColor: `var(--theme-bg-surface-subtle)`,
              color: themeColor('text-primary'),
            }}
          >
            <option value="">All Ad Sets</option>
            {uniqueAdSets.map((set) => (
              <option key={set} value={set}>
                {set.substring(0, 30)}...
              </option>
            ))}
          </select>
        </div>

        {/* Search Filter */}
        <div>
          <label
            className="mb-2 block text-xs font-black uppercase tracking-[0.1em]"
            style={{ color: themeColor('text-secondary') }}
          >
            Search Ad Name
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border px-3 py-2 text-sm font-black outline-none"
            style={{
              borderColor: themeColor('border'),
              backgroundColor: `var(--theme-bg-surface-subtle)`,
              color: themeColor('text-primary'),
            }}
          />
        </div>
      </div>

      {/* Filter Stats */}
      <div className="mt-6 grid gap-3 md:grid-cols-5">
        <div
          className="rounded-lg border p-3"
          style={{
            borderColor: themeColor('border'),
            backgroundColor: `var(--theme-bg-surface-subtle)`,
          }}
        >
          <p
            className="text-xs font-black"
            style={{ color: themeColor('text-secondary') }}
          >
            Showing
          </p>
          <p
            className="mt-1 text-lg font-black"
            style={{ color: themeColor('text-primary') }}
          >
            {stats.filteredCount}/{stats.originalCount}
          </p>
        </div>

        <div
          className="rounded-lg border p-3"
          style={{
            borderColor: themeColor('border'),
            backgroundColor: `var(--theme-bg-surface-subtle)`,
          }}
        >
          <p
            className="text-xs font-black"
            style={{ color: themeColor('text-secondary') }}
          >
            Filtered Out
          </p>
          <p
            className="mt-1 text-lg font-black"
            style={{ color: themeColor('status-error') }}
          >
            {stats.removedCount} ({stats.percentageRemoved}%)
          </p>
        </div>

        <div
          className="rounded-lg border p-3"
          style={{
            borderColor: themeColor('border'),
            backgroundColor: `var(--theme-bg-surface-subtle)`,
          }}
        >
          <p
            className="text-xs font-black"
            style={{ color: themeColor('text-secondary') }}
          >
            Critical
          </p>
          <p
            className="mt-1 text-lg font-black"
            style={{ color: themeColor('status-error') }}
          >
            {severityDist.critical}
          </p>
        </div>

        <div
          className="rounded-lg border p-3"
          style={{
            borderColor: themeColor('border'),
            backgroundColor: `var(--theme-bg-surface-subtle)`,
          }}
        >
          <p
            className="text-xs font-black"
            style={{ color: themeColor('text-secondary') }}
          >
            High
          </p>
          <p
            className="mt-1 text-lg font-black"
            style={{ color: themeColor('status-warning') }}
          >
            {severityDist.high}
          </p>
        </div>

        <div
          className="rounded-lg border p-3"
          style={{
            borderColor: themeColor('border'),
            backgroundColor: `var(--theme-bg-surface-subtle)`,
          }}
        >
          <p
            className="text-xs font-black"
            style={{ color: themeColor('text-secondary') }}
          >
            Total Waste
          </p>
          <p
            className="mt-1 text-lg font-black"
            style={{ color: themeColor('status-error') }}
          >
            {filtered.length}
          </p>
        </div>
      </div>
    </div>
  );
}
