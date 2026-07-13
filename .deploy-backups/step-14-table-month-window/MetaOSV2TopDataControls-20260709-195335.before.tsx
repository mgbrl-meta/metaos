"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";

type MetaSheetResponse = {
  ok?: boolean;
  source?: string;
  rowCount?: number;
  returnedRowCount?: number;
  totalRowCount?: number;
  latestDate?: string;
  rows?: Record<string, unknown>[];
  error?: string;
};

function getRowDate(row: Record<string, unknown>) {
  const value =
    row.Day ||
    row.day ||
    row["Reporting starts"] ||
    row["Reporting Starts"] ||
    row["reporting starts"];

  const raw = String(value || "").trim();
  if (!raw) return "";

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  return parsed.toISOString().slice(0, 10);
}

function getLatestDate(rows: Record<string, unknown>[]) {
  const dates = rows
    .map(getRowDate)
    .filter(Boolean)
    .sort();

  return dates.length ? dates[dates.length - 1] : "";
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function MetaOSV2TopDataControls() {
  const performanceRows = useMetaStore((state) => state.performanceRows);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState("");

  const rows = useMemo(
    () => (Array.isArray(performanceRows) ? performanceRows : []),
    [performanceRows]
  );

  const latestDate = useMemo(() => getLatestDate(rows as Record<string, unknown>[]), [rows]);
  const rowCount = rows.length;

  async function refreshMetaData() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/meta-sheet?days=120&limit=20000", {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as MetaSheetResponse;

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "Meta sheet refresh failed.");
      }

      const nextRows = Array.isArray(payload.rows) ? payload.rows : [];

      if (!nextRows.length) {
        throw new Error("Meta sheet returned 0 rows.");
      }

      useMetaStore.setState({
        performanceRows: nextRows as any,
      });

      setLastSync(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error("[MetaOS V2] Sheet refresh failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="metaos-v2-top-data-controls">
      <button
        type="button"
        onClick={refreshMetaData}
        disabled={loading}
        className="metaos-v2-top-refresh-btn"
        title={error || "Refresh Meta sheet data"}
      >
        <RefreshCw size={13} />
        {loading ? "SYNCING" : "REFRESH"}
      </button>

      <span className="metaos-v2-top-chip metaos-v2-top-chip-green">
        LATEST {latestDate || "—"}
      </span>

      <span className="metaos-v2-top-chip">
        ROWS {rowCount ? rowCount.toLocaleString("en-IN") : "—"}
      </span>

      <span className="metaos-v2-top-chip">
        SYNC {lastSync ? formatTime(lastSync) : "LIVE"}
      </span>

      {error ? (
        <span className="metaos-v2-top-chip metaos-v2-top-chip-error" title={error}>
          ERROR
        </span>
      ) : null}
    </div>
  );
}
