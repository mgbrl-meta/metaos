import type { MetaV2CleanRow } from "@/lib/meta-v2/schema";

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

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
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

export function getLatestDate(rows: Pick<MetaV2CleanRow, "date" | "spend">[]): string {
  return rows
    .filter((row) => row.spend > 0)
    .map((row) => row.date)
    .filter(Boolean)
    .sort()
    .at(-1) || "";
}
