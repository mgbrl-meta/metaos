"use client";

import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";

function getDateValue(row: unknown) {
  const item = row as Record<string, unknown>;

  const raw =
    item.Day ||
    item.day ||
    item["Reporting starts"] ||
    item["Reporting Starts"] ||
    item["reporting starts"];

  const value = String(raw || "").trim();
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toISOString().slice(0, 10);
}

function getLatestDate(rows: unknown[]) {
  const dates = rows.map(getDateValue).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : "";
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function MetaOSV2TopSheetStatus() {
  const performanceRows = useMetaStore((state) => state.performanceRows);

  const rows = useMemo(
    () => (Array.isArray(performanceRows) ? performanceRows : []),
    [performanceRows]
  );

  const latestDate = useMemo(() => getLatestDate(rows as unknown[]), [rows]);
  const rowCount = rows.length;

  /**
   * Since the app already refreshes/loads sheet data, this top control only mirrors
   * the current store status beside SHEET LIVE.
   */
  const syncTime = useMemo(() => formatTime(new Date()), [rowCount, latestDate]);

  if (!rowCount) return null;

  return (
    <div className="metaos-v2-top-sheet-status">
      <span className="metaos-v2-sheet-chip metaos-v2-sheet-chip-green">
        LATEST {latestDate || "—"}
      </span>

      <span className="metaos-v2-sheet-chip">
        ROWS {rowCount.toLocaleString("en-IN")}
      </span>

      <span className="metaos-v2-sheet-chip">
        <RefreshCw size={12} />
        SYNC {syncTime}
      </span>
    </div>
  );
}
