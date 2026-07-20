'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { themeColor } from '@/lib/meta-v2/theming/useThemeColor';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

type PeriodType = 'period' | 'compare';

const generateDateRanges = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const last7Days = new Date(today);
  last7Days.setDate(last7Days.getDate() - 7);

  const last30Days = new Date(today);
  last30Days.setDate(last30Days.getDate() - 30);

  const last90Days = new Date(today);
  last90Days.setDate(last90Days.getDate() - 90);

  const monthToDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const quarterToDate = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
  const yearToDate = new Date(today.getFullYear(), 0, 1);

  return [
    { label: 'Today', startDate: today, endDate: today },
    { label: 'Yesterday', startDate: yesterday, endDate: yesterday },
    { label: 'Last 7 days', startDate: last7Days, endDate: today },
    { label: 'Last 30 days', startDate: last30Days, endDate: today },
    { label: 'Last 90 days', startDate: last90Days, endDate: today },
    { label: 'Month to date', startDate: monthToDate, endDate: today },
    { label: 'Quarter to date', startDate: quarterToDate, endDate: today },
    { label: 'Year to date', startDate: yearToDate, endDate: today },
  ];
};

interface CalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

function Calendar({ selectedDate, onDateChange, minDate, maxDate }: CalendarProps) {
  const [displayMonth, setDisplayMonth] = useState(new Date(selectedDate));

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthYear = displayMonth.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  const days = [];
  const firstDay = firstDayOfMonth(displayMonth);
  const totalDays = daysInMonth(displayMonth);

  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Days of month
  for (let day = 1; day <= totalDays; day++) {
    days.push(day);
  }

  const handlePrevMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1));
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
    onDateChange(newDate);
  };

  const isSelected = (day: number | null) => {
    if (!day) return false;
    const date = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isDisabled = (day: number | null) => {
    if (!day) return true;
    const date = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1 hover:opacity-70"
        >
          <ChevronLeft className="h-5 w-5" style={{ color: themeColor('text-primary') }} />
        </button>
        <span
          className="text-sm font-black"
          style={{ color: themeColor('text-primary') }}
        >
          {monthYear}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1 hover:opacity-70"
        >
          <ChevronRight className="h-5 w-5" style={{ color: themeColor('text-primary') }} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-black"
            style={{ color: themeColor('text-secondary') }}
          >
            {day}
          </div>
        ))}

        {days.map((day, idx) => (
          <div key={idx} className="text-center">
            {day ? (
              <button
                type="button"
                onClick={() => handleDayClick(day)}
                disabled={isDisabled(day)}
                className="h-8 w-8 rounded text-xs font-black"
                style={{
                  backgroundColor: isSelected(day) ? themeColor('button-primary') : 'transparent',
                  color: isSelected(day) ? themeColor('text-inverse') : themeColor('text-primary'),
                  opacity: isDisabled(day) ? 0.4 : 1,
                  cursor: isDisabled(day) ? 'not-allowed' : 'pointer',
                }}
              >
                {day}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DateRangeFilter({
  onApply,
  onClose,
  initialStartDate,
  initialEndDate,
}: {
  onApply: (startDate: Date, endDate: Date, label: string) => void;
  onClose: () => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
}) {
  const dateRanges = useMemo(() => generateDateRanges(), []);
  const [activePeriod, setActivePeriod] = useState<PeriodType>('period');
  const [startDate, setStartDate] = useState(initialStartDate || new Date());
  const [endDate, setEndDate] = useState(initialEndDate || new Date());
  const [compareStartDate, setCompareStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [compareEndDate, setCompareEndDate] = useState(new Date());

  const handlePresetClick = (range: (typeof dateRanges)[0]) => {
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const handleApply = () => {
    const label = activePeriod === 'period'
      ? `${startDate.toLocaleDateString()} – ${endDate.toLocaleDateString()}`
      : `Compare: ${compareStartDate.toLocaleDateString()} – ${compareEndDate.toLocaleDateString()}`;

    if (activePeriod === 'period') {
      onApply(startDate, endDate, label);
    } else {
      onApply(compareStartDate, compareEndDate, label);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="rounded-2xl border p-6 shadow-xl"
        style={{
          borderColor: themeColor('border'),
          backgroundColor: `var(--theme-bg-surface)`,
          maxWidth: '800px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2
            className="text-xl font-black"
            style={{ color: themeColor('text-primary') }}
          >
            Select Date Range
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:opacity-70"
          >
            <X className="h-5 w-5" style={{ color: themeColor('text-secondary') }} />
          </button>
        </div>

        {/* Period Tabs */}
        <div className="mb-6 flex gap-2">
          {(['period', 'compare'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActivePeriod(tab)}
              className="rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.12em]"
              style={{
                backgroundColor:
                  activePeriod === tab ? themeColor('button-primary') : `var(--theme-bg-surface-subtle)`,
                color:
                  activePeriod === tab ? themeColor('text-inverse') : themeColor('text-primary'),
                borderColor: themeColor('border'),
                border: activePeriod === tab ? 'none' : `1px solid ${themeColor('border')}`,
              }}
            >
              {tab === 'period' ? 'Period' : 'Compare'}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
          {/* Presets */}
          <div className="flex flex-col gap-2">
            <h3
              className="text-xs font-black uppercase tracking-[0.15em]"
              style={{ color: themeColor('text-secondary') }}
            >
              Quick Select
            </h3>
            {dateRanges.map((range) => (
              <button
                key={range.label}
                type="button"
                onClick={() => handlePresetClick(range)}
                className="rounded-lg px-3 py-2 text-left text-sm font-black"
                style={{
                  backgroundColor:
                    activePeriod === 'period' &&
                    startDate.toDateString() === range.startDate.toDateString() &&
                    endDate.toDateString() === range.endDate.toDateString()
                      ? themeColor('button-primary')
                      : `var(--theme-bg-surface-subtle)`,
                  color:
                    activePeriod === 'period' &&
                    startDate.toDateString() === range.startDate.toDateString() &&
                    endDate.toDateString() === range.endDate.toDateString()
                      ? themeColor('text-inverse')
                      : themeColor('text-primary'),
                }}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Calendar Pickers */}
          <div className="grid gap-4 md:grid-cols-2">
            {activePeriod === 'period' ? (
              <>
                <div
                  className="rounded-lg border"
                  style={{ borderColor: themeColor('border') }}
                >
                  <Calendar selectedDate={startDate} onDateChange={setStartDate} />
                </div>
                <div
                  className="rounded-lg border"
                  style={{ borderColor: themeColor('border') }}
                >
                  <Calendar selectedDate={endDate} onDateChange={setEndDate} minDate={startDate} />
                </div>
              </>
            ) : (
              <>
                <div
                  className="rounded-lg border"
                  style={{ borderColor: themeColor('border') }}
                >
                  <Calendar
                    selectedDate={compareStartDate}
                    onDateChange={setCompareStartDate}
                  />
                </div>
                <div
                  className="rounded-lg border"
                  style={{ borderColor: themeColor('border') }}
                >
                  <Calendar
                    selectedDate={compareEndDate}
                    onDateChange={setCompareEndDate}
                    minDate={compareStartDate}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Date Display */}
        <div
          className="my-6 rounded-lg border p-4"
          style={{
            borderColor: themeColor('border'),
            backgroundColor: `var(--theme-bg-surface-subtle)`,
          }}
        >
          <p
            className="text-sm font-black"
            style={{ color: themeColor('text-secondary') }}
          >
            Selected: {activePeriod === 'period'
              ? `${startDate.toLocaleDateString()} – ${endDate.toLocaleDateString()}`
              : `${compareStartDate.toLocaleDateString()} – ${compareEndDate.toLocaleDateString()}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em]"
            style={{
              borderColor: themeColor('border'),
              color: themeColor('text-primary'),
              backgroundColor: `var(--theme-bg-surface-subtle)`,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.12em]"
            style={{
              backgroundColor: themeColor('button-primary'),
              color: themeColor('text-inverse'),
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export function DateRangeDisplay({
  startDate,
  endDate,
  label,
  onClick,
}: {
  startDate: Date;
  endDate: Date;
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em]"
      style={{
        borderColor: themeColor('border'),
        backgroundColor: `var(--theme-bg-surface-subtle)`,
        color: themeColor('text-primary'),
      }}
    >
      {label ||
        `${startDate.toLocaleDateString()} – ${endDate.toLocaleDateString()}`}
    </button>
  );
}
