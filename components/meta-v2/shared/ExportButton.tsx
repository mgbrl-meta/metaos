'use client';

import { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { themeColor } from '@/lib/meta-v2/theming/useThemeColor';
import type { MetaV2ZeroPurchaseItem } from '@/lib/meta-v2/engines/zeroPurchaseEngine';
import { ExportService } from '@/lib/meta-v2/services/exportService';

interface ExportButtonProps {
  items: MetaV2ZeroPurchaseItem[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export function ExportButton({ items, dateRange }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format: 'csv' | 'json' | 'tsv') => {
    try {
      const options = { dateRange };

      switch (format) {
        case 'csv':
          ExportService.exportToCSV(items, options);
          break;
        case 'json':
          ExportService.exportToJSON(items, options);
          break;
        case 'tsv':
          ExportService.exportToTSV(items, options);
          break;
      }

      setIsOpen(false);
    } catch (error) {
      console.error(`Export failed: ${error}`);
    }
  };

  const summary = ExportService.generateSummary(items);

  return (
    <div className="relative">
      {/* Main Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em]"
        style={{
          borderColor: themeColor('border'),
          backgroundColor: `var(--theme-bg-surface-subtle)`,
          color: themeColor('text-primary'),
        }}
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDown className={`h-3 w-3 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-lg border shadow-lg"
          style={{
            borderColor: themeColor('border'),
            backgroundColor: `var(--theme-bg-surface)`,
            zIndex: 50,
          }}
        >
          {/* Summary */}
          <div className="border-b p-4" style={{ borderColor: themeColor('border') }}>
            <h4
              className="mb-3 text-xs font-black uppercase tracking-[0.1em]"
              style={{ color: themeColor('text-secondary') }}
            >
              Export Summary
            </h4>
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between">
                <span style={{ color: themeColor('text-secondary') }}>Total Items</span>
                <span
                  className="font-black"
                  style={{ color: themeColor('text-primary') }}
                >
                  {summary.totalItems}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: themeColor('text-secondary') }}>Total Spend</span>
                <span
                  className="font-black"
                  style={{ color: themeColor('text-primary') }}
                >
                  ₹{summary.totalSpend}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: themeColor('text-secondary') }}>Avg Spend</span>
                <span
                  className="font-black"
                  style={{ color: themeColor('text-primary') }}
                >
                  ₹{summary.avgSpend}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: themeColor('text-secondary') }}>Critical Issues</span>
                <span
                  className="font-black"
                  style={{ color: themeColor('status-error') }}
                >
                  {summary.severity.critical}
                </span>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="p-4">
            <p
              className="mb-3 text-xs font-black uppercase tracking-[0.1em]"
              style={{ color: themeColor('text-secondary') }}
            >
              Format
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleExport('csv')}
                className="w-full rounded-lg border px-3 py-2 text-left text-xs font-black uppercase tracking-[0.08em]"
                style={{
                  borderColor: themeColor('border'),
                  backgroundColor: `var(--theme-bg-surface-subtle)`,
                  color: themeColor('text-primary'),
                }}
              >
                📊 CSV (Excel)
              </button>
              <button
                type="button"
                onClick={() => handleExport('tsv')}
                className="w-full rounded-lg border px-3 py-2 text-left text-xs font-black uppercase tracking-[0.08em]"
                style={{
                  borderColor: themeColor('border'),
                  backgroundColor: `var(--theme-bg-surface-subtle)`,
                  color: themeColor('text-primary'),
                }}
              >
                📄 TSV (Excel)
              </button>
              <button
                type="button"
                onClick={() => handleExport('json')}
                className="w-full rounded-lg border px-3 py-2 text-left text-xs font-black uppercase tracking-[0.08em]"
                style={{
                  borderColor: themeColor('border'),
                  backgroundColor: `var(--theme-bg-surface-subtle)`,
                  color: themeColor('text-primary'),
                }}
              >
                {} JSON (Data)
              </button>
            </div>
          </div>

          {/* Info */}
          <div
            className="border-t px-4 py-3 text-xs"
            style={{
              borderColor: themeColor('border'),
              color: themeColor('text-secondary'),
            }}
          >
            💡 Exports include {dateRange ? 'filtered date range' : 'all'} data with metadata
          </div>
        </div>
      )}

      {/* Overlay to close menu */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          style={{ backgroundColor: 'transparent' }}
        />
      )}
    </div>
  );
}
