export function safeNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const cleaned = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function safeDiv(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value || 0) * factor) / factor;
}

export function formatNumberFull(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatINRFull(value: number, digits = 0): string {
  return `₹${formatNumberFull(value, digits)}`;
}

export function formatNumberCompact(value: number, digits = 2): string {
  const abs = Math.abs(value || 0);

  if (abs >= 10000000) return `${round(value / 10000000, digits)} Cr`;
  if (abs >= 100000) return `${round(value / 100000, digits)} L`;
  if (abs >= 1000) return `${round(value / 1000, digits)} K`;

  return formatNumberFull(value, 0);
}

export function formatINRCompact(value: number, digits = 2): string {
  return `₹${formatNumberCompact(value, digits)}`;
}

export function formatPct(value: number, digits = 1): string {
  return `${round(value, digits)}%`;
}

export function formatRate(value: number, digits = 1): string {
  return `${round(value * 100, digits)}%`;
}

export function formatRoas(value: number, digits = 2): string {
  return round(value, digits).toFixed(digits);
}

export function formatCpa(value: number): string {
  if (!value || !Number.isFinite(value)) return "₹0";
  return formatINRCompact(value, 2);
}

export function formatIsoDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
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
