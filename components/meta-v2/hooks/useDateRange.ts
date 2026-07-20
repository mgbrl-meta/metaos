import { useState, useCallback } from 'react';

export interface DateRangeState {
  startDate: Date;
  endDate: Date;
  label: string;
}

export function useDateRange(initial?: { startDate?: Date; endDate?: Date; label?: string }) {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const defaultLabel = initial?.label || `${thirtyDaysAgo.toLocaleDateString()} – ${today.toLocaleDateString()}`;

  const [dateRange, setDateRange] = useState<DateRangeState>({
    startDate: initial?.startDate || thirtyDaysAgo,
    endDate: initial?.endDate || today,
    label: defaultLabel,
  });

  const [isOpen, setIsOpen] = useState(false);

  const updateDateRange = useCallback((startDate: Date, endDate: Date, label: string) => {
    setDateRange({
      startDate,
      endDate,
      label,
    });
    setIsOpen(false);
  }, []);

  const openFilter = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeFilter = useCallback(() => {
    setIsOpen(false);
  }, []);

  const formatDateRange = useCallback(() => {
    return `${dateRange.startDate.toLocaleDateString()} – ${dateRange.endDate.toLocaleDateString()}`;
  }, [dateRange]);

  const isWithinRange = useCallback((date: Date): boolean => {
    return date >= dateRange.startDate && date <= dateRange.endDate;
  }, [dateRange]);

  const getDaysInRange = useCallback((): number => {
    const diffTime = Math.abs(dateRange.endDate.getTime() - dateRange.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [dateRange]);

  return {
    dateRange,
    isOpen,
    updateDateRange,
    openFilter,
    closeFilter,
    formatDateRange,
    isWithinRange,
    getDaysInRange,
  };
}
