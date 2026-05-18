import { MetaNormalizedRow, MetaPerformanceRow } from "@/types/meta";

const inactiveWords = [
  "off",
  "inactive",
  "deleted",
  "archived",
  "not delivering",
  "not_delivering",
  "completed",
  "closed",
  "disabled",
  "paused",
];

function parseDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayKey(value?: string | null) {
  if (!value) return "";
  const d = parseDate(value);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function adKey(row: MetaNormalizedRow | MetaPerformanceRow) {
  return String(row.adId || row.adName || "").trim();
}

export function isLiveDeliveryStatus(status?: string | null) {
  const value = String(status || "").toLowerCase().trim();

  // Delivery column may be missing in some exports.
  // In that case, latest-day spend/impressions becomes the source of truth.
  if (!value) return true;

  if (inactiveWords.some((word) => value.includes(word))) return false;

  return true;
}

export function getLatestDataDay<T extends MetaNormalizedRow | MetaPerformanceRow>(rows: T[]) {
  const dates = rows
    .map((row) => parseDate(row.date))
    .filter(Boolean) as Date[];

  if (!dates.length) return "";

  const latest = new Date(Math.max(...dates.map((d) => d.getTime())));

  return `${latest.getFullYear()}-${String(latest.getMonth() + 1).padStart(2, "0")}-${String(
    latest.getDate()
  ).padStart(2, "0")}`;
}

export function getLatestDayActiveAdKeys<T extends MetaNormalizedRow | MetaPerformanceRow>(
  rows: T[]
) {
  const statusLiveRows = rows.filter((row) => isLiveDeliveryStatus(row.deliveryStatus));
  const latestDay = getLatestDataDay(statusLiveRows);

  const activeKeys = new Set<string>();

  statusLiveRows.forEach((row) => {
    if (dayKey(row.date) !== latestDay) return;

    const spend = Number(row.spend || 0);
    const impressions = Number(row.impressions || 0);

    // This is the hard rule:
    // If the ad did not spend or get impressions on the latest day, it is treated as paused/stopped.
    if (spend > 0 || impressions > 0) {
      const key = adKey(row);
      if (key) activeKeys.add(key);
    }
  });

  return activeKeys;
}

export function onlyLiveRows<T extends MetaNormalizedRow | MetaPerformanceRow>(rows: T[]) {
  const activeKeys = getLatestDayActiveAdKeys(rows);

  // If no active latest-day ads are found, return empty.
  // This prevents old stopped ads from entering recommendations.
  if (!activeKeys.size) return [];

  return rows.filter((row) => {
    if (!isLiveDeliveryStatus(row.deliveryStatus)) return false;
    return activeKeys.has(adKey(row));
  });
}

export function onlyLatestDayRows<T extends MetaNormalizedRow | MetaPerformanceRow>(rows: T[]) {
  const liveRows = onlyLiveRows(rows);
  const latestDay = getLatestDataDay(liveRows);

  return liveRows.filter((row) => dayKey(row.date) === latestDay);
}
