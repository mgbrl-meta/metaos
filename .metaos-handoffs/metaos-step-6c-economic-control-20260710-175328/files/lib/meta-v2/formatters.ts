import { safeDiv, safeNumber } from "@/lib/meta-v2/calculationCore";

export { safeDiv, safeNumber };

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((Number.isFinite(value) ? value : 0) * factor) / factor;
}

export function formatNumberFull(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatINRFull(value: number, digits = 0): string {
  return `₹${formatNumberFull(value, digits)}`;
}

export function formatNumberCompact(value: number, digits = 2): string {
  const n = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(n);

  if (abs >= 10000000) return `${round(n / 10000000, digits)} Cr`;
  if (abs >= 100000) return `${round(n / 100000, digits)} L`;
  if (abs >= 1000) return `${round(n / 1000, digits)} K`;

  return formatNumberFull(n, 0);
}

export function formatINRCompact(value: number, digits = 2): string {
  return `₹${formatNumberCompact(value, digits)}`;
}

export function formatPct(value: number, digits = 1): string {
  return `${round(value, digits)}%`;
}

export function formatRoas(value: number): string {
  return round(value, 2).toFixed(2);
}

export function formatDate(value: string): string {
  if (!value) return "NA";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatSyncTime(value: string): string {
  if (!value) return "Not synced";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not synced";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
