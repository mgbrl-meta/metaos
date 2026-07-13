import type { MetaCleanRow, MetaTotals, MetaWindow } from "@/lib/meta/schema";
import { safeDiv } from "@/lib/meta/formatters";

export function toIsoDateKey(value: unknown): string {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  if (!raw) return "";

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString().slice(0, 10);
  }

  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    const year = Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]);
    const date = new Date(year, month, day);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  return "";
}

export function getMonthKey(dateKey: string): string {
  return dateKey ? dateKey.slice(0, 7) : "";
}

export function getWeekKey(dateKey: string): string {
  if (!dateKey) return "";

  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  const day = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day + 1);

  return monday.toISOString().slice(0, 10);
}

export function sortRowsByDate<T extends { date?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
}

export function getLatestDate(rows: { date?: string; spend?: number }[]): string {
  return rows
    .filter((row) => Number(row.spend || 0) > 0)
    .map((row) => String(row.date || ""))
    .filter(Boolean)
    .sort()
    .at(-1) || "";
}

export function getEarliestDate(rows: { date?: string }[]): string {
  return rows
    .map((row) => String(row.date || ""))
    .filter(Boolean)
    .sort()
    .at(0) || "";
}

export function aggregateTotals(rows: MetaCleanRow[]): MetaTotals {
  const spend = rows.reduce((sum, row) => sum + row.spend, 0);
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const purchases = rows.reduce((sum, row) => sum + row.purchases, 0);
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const reach = rows.reduce((sum, row) => sum + row.reach, 0);
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const linkClicks = rows.reduce((sum, row) => sum + row.linkClicks, 0);
  const lpv = rows.reduce((sum, row) => sum + row.lpv, 0);
  const contentView = rows.reduce((sum, row) => sum + row.contentView, 0);
  const atc = rows.reduce((sum, row) => sum + row.atc, 0);
  const checkout = rows.reduce((sum, row) => sum + row.checkout, 0);
  const payment = rows.reduce((sum, row) => sum + row.payment, 0);

  return {
    spend,
    revenue,
    purchases,
    impressions,
    reach,
    clicks,
    linkClicks,
    lpv,
    contentView,
    atc,
    checkout,
    payment,

    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, purchases),
    cpm: safeDiv(spend * 1000, impressions),
    cpc: safeDiv(spend, clicks),
    ctr: safeDiv(clicks, impressions) * 100,
    frequency: safeDiv(impressions, reach),
    lpvRate: safeDiv(lpv, linkClicks || clicks) * 100,
    atcRate: safeDiv(atc, lpv) * 100,
    checkoutRate: safeDiv(checkout, atc) * 100,
    paymentRate: safeDiv(payment, checkout) * 100,
    purchaseRate: safeDiv(purchases, lpv) * 100,
  };
}

export function groupRowsByKey<T>(
  rows: T[],
  getKey: (row: T) => string
): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const row of rows) {
    const key = getKey(row) || "Unknown";
    const group = map.get(key) || [];
    group.push(row);
    map.set(key, group);
  }

  return map;
}

export function buildMonthlyWindows(rows: MetaCleanRow[]): MetaWindow[] {
  const groups = groupRowsByKey(rows, (row) => row.monthKey);

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, monthRows]) => ({
      id: monthKey,
      label: monthKey,
      startDate: monthRows.map((row) => row.date).sort().at(0) || "",
      endDate: monthRows.map((row) => row.date).sort().at(-1) || "",
      rows: monthRows,
      totals: aggregateTotals(monthRows),
    }));
}

export function buildWeeklyWindows(rows: MetaCleanRow[]): MetaWindow[] {
  const groups = groupRowsByKey(rows, (row) => row.weekKey);

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekKey, weekRows]) => ({
      id: weekKey,
      label: `Week of ${weekKey}`,
      startDate: weekRows.map((row) => row.date).sort().at(0) || "",
      endDate: weekRows.map((row) => row.date).sort().at(-1) || "",
      rows: weekRows,
      totals: aggregateTotals(weekRows),
    }));
}
