export type AnyMetaRow = Record<string, any>;

export function toMetaNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .replace(/%/g, "")
    .trim();

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeMetaDateKey(value: unknown) {
  if (value === null || value === undefined || value === "") return "";

  const raw = String(value).trim();
  if (!raw) return "";

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const first = Number(slash[1]);
    const second = Number(slash[2]);
    const year = Number(slash[3]);

    // Meta India exports are usually DD/MM/YYYY.
    const day = first > 12 ? first : second > 12 ? second : first;
    const month = first > 12 ? second : second > 12 ? first : second;

    return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
  }

  const serial = Number(raw);
  if (Number.isFinite(serial) && serial > 30000 && serial < 60000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(serial));
    return epoch.toISOString().slice(0, 10);
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()))
      .toISOString()
      .slice(0, 10);
  }

  return "";
}

export function getMetaRowDate(row: AnyMetaRow) {
  return normalizeMetaDateKey(
    row.date ??
      row.day ??
      row.Date ??
      row.Day ??
      row["Date"] ??
      row["Day"] ??
      row["Reporting starts"] ??
      row["Reporting Starts"] ??
      ""
  );
}

export function getMetaLatestDate(rows: AnyMetaRow[]) {
  const dates = Array.from(
    new Set(rows.map(getMetaRowDate).filter(Boolean))
  ).sort();

  return dates[dates.length - 1] || "";
}

export function extractMetaRows(payload: any): AnyMetaRow[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.performanceRows)) return payload.performanceRows;
  return [];
}

export function isApiRowsFresher(apiRows: AnyMetaRow[], currentRows: AnyMetaRow[]) {
  const apiLatest = getMetaLatestDate(apiRows);
  const currentLatest = getMetaLatestDate(currentRows);

  if (!apiLatest) return false;
  if (!currentLatest) return true;

  return apiLatest >= currentLatest;
}
