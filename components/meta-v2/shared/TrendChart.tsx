'use client';

import { useMemo } from 'react';
import { themeColor } from '@/lib/meta-v2/theming/useThemeColor';
import type { MetaV2ZeroPurchaseItem } from '@/lib/meta-v2/engines/zeroPurchaseEngine';

interface TrendDataPoint {
  date: string;
  spend: number;
  waste: number;
  items: number;
}

interface TrendChartProps {
  items: MetaV2ZeroPurchaseItem[];
  title?: string;
  height?: number;
}

export function TrendChart({ items, title = 'Waste Trend Over Time', height = 300 }: TrendChartProps) {
  const trendData = useMemo(() => {
    if (items.length === 0) return [];

    // Group trend data by date across all items
    const grouped: Record<string, { spend: number; waste: number; items: number }> = {};

    items.forEach((item) => {
      // Use trend data from each item
      if (item.trend && item.trend.length > 0) {
        item.trend.forEach((trendRow) => {
          const date = trendRow.date;
          if (!grouped[date]) {
            grouped[date] = { spend: 0, waste: 0, items: 0 };
          }
          grouped[date].spend += trendRow.spend;
          if (trendRow.purchases === 0) {
            grouped[date].waste += trendRow.spend;
          }
          grouped[date].items += 1;
        });
      }
    });

    // Convert to array and sort by date
    return Object.entries(grouped)
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [items]);

  // Find max values for scaling
  const maxSpend = useMemo(() => Math.max(...trendData.map((d) => d.spend), 1), [trendData]);
  const maxItems = useMemo(() => Math.max(...trendData.map((d) => d.items), 1), [trendData]);

  if (trendData.length === 0) {
    return (
      <div
        className="rounded-lg border p-8 text-center"
        style={{
          borderColor: themeColor('border'),
          backgroundColor: `var(--theme-bg-surface)`,
        }}
      >
        <p
          className="text-sm font-black"
          style={{ color: themeColor('text-secondary') }}
        >
          No trend data available for selected date range
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border p-6"
      style={{
        borderColor: themeColor('border'),
        backgroundColor: `var(--theme-bg-surface)`,
      }}
    >
      {/* Title */}
      <h3
        className="mb-4 text-sm font-black"
        style={{ color: themeColor('text-primary') }}
      >
        {title}
      </h3>

      {/* Chart Container */}
      <div style={{ height: `${height}px`, width: '100%', position: 'relative' }}>
        <svg
          width="100%"
          height="100%"
          style={{ backgroundColor: 'transparent' }}
          viewBox={`0 0 ${trendData.length * 80 + 40} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Y-axis */}
          <line
            x1="30"
            y1="10"
            x2="30"
            y2={height - 30}
            stroke={themeColor('border')}
            strokeWidth="2"
          />

          {/* X-axis */}
          <line
            x1="30"
            y1={height - 30}
            x2={trendData.length * 80 + 20}
            y2={height - 30}
            stroke={themeColor('border')}
            strokeWidth="2"
          />

          {/* Grid lines and bars */}
          {trendData.map((point, idx) => {
            const x = 30 + idx * 80 + 40;
            const spendHeight = (point.spend / maxSpend) * (height - 60);
            const wasteHeight = (point.waste / maxSpend) * (height - 60);

            return (
              <g key={point.date}>
                {/* Spend bar (light) */}
                <rect
                  x={x - 12}
                  y={height - 30 - spendHeight}
                  width="10"
                  height={spendHeight}
                  fill={themeColor('status-error')}
                  opacity="0.6"
                />

                {/* Waste bar (dark) */}
                <rect
                  x={x}
                  y={height - 30 - wasteHeight}
                  width="10"
                  height={wasteHeight}
                  fill={themeColor('status-error')}
                  opacity="1"
                />

                {/* Date label */}
                <text
                  x={x - 6}
                  y={height - 10}
                  fontSize="10"
                  fill={themeColor('text-secondary')}
                  textAnchor="middle"
                >
                  {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </text>

                {/* Hover tooltip (via title element) */}
                <title>
                  {`Date: ${point.date}
Spend: ₹${point.spend.toFixed(0)}
Waste: ₹${point.waste.toFixed(0)}
Items: ${point.items}`}
                </title>
              </g>
            );
          })}

          {/* Y-axis label */}
          <text
            x="10"
            y="20"
            fontSize="11"
            fill={themeColor('text-secondary')}
            fontWeight="bold"
          >
            ₹
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-4">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded"
            style={{ backgroundColor: themeColor('status-error'), opacity: 0.6 }}
          />
          <span
            className="text-xs font-black"
            style={{ color: themeColor('text-secondary') }}
          >
            Total Spend
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded"
            style={{ backgroundColor: themeColor('status-error') }}
          />
          <span
            className="text-xs font-black"
            style={{ color: themeColor('text-secondary') }}
          >
            Waste (₹0 purchases)
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid gap-2 md:grid-cols-4">
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
            Total Days
          </p>
          <p
            className="mt-1 text-lg font-black"
            style={{ color: themeColor('text-primary') }}
          >
            {trendData.length}
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
            Avg Daily Spend
          </p>
          <p
            className="mt-1 text-lg font-black"
            style={{ color: themeColor('text-primary') }}
          >
            ₹{(trendData.reduce((sum, d) => sum + d.spend, 0) / trendData.length).toFixed(0)}
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
            Avg Daily Waste
          </p>
          <p
            className="mt-1 text-lg font-black"
            style={{ color: themeColor('status-error') }}
          >
            ₹{(trendData.reduce((sum, d) => sum + d.waste, 0) / trendData.length).toFixed(0)}
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
            Waste %
          </p>
          <p
            className="mt-1 text-lg font-black"
            style={{ color: themeColor('status-error') }}
          >
            {trendData.length > 0
              ? (
                  (trendData.reduce((sum, d) => sum + d.waste, 0) /
                    trendData.reduce((sum, d) => sum + d.spend, 0)) *
                  100
                ).toFixed(1)
              : '0'}
            %
          </p>
        </div>
      </div>
    </div>
  );
}
