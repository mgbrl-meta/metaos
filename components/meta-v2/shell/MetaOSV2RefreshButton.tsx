"use client";

import { useState } from "react";
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

export function MetaOSV2RefreshButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function refreshMetaData() {
    if (loading) return;

    setLoading(true);
    setStatus("Loading...");

    try {
      const response = await fetch("/api/meta-sheet?days=120&limit=20000", {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as MetaSheetResponse;

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "Meta sheet refresh failed.");
      }

      const rows = Array.isArray(payload.rows) ? payload.rows : [];

      if (!rows.length) {
        throw new Error("Meta sheet returned 0 rows.");
      }

      useMetaStore.setState({
        performanceRows: rows as any,
      });

      setStatus(`${rows.length.toLocaleString()} rows loaded`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message);
      console.error("[MetaOS V2] Sheet refresh failed:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 360,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        gap: 8,
        pointerEvents: "auto",
      }}
    >
      <button
        type="button"
        onClick={refreshMetaData}
        disabled={loading}
        style={{
          height: 32,
          padding: "0 13px",
          borderRadius: 10,
          border: "1px solid rgba(14, 165, 233, 0.65)",
          background: loading ? "#64748b" : "#0ea5e9",
          color: "#ffffff",
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: "0.04em",
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 8px 20px rgba(14, 165, 233, 0.25)",
        }}
      >
        {loading ? "REFRESHING..." : "REFRESH DATA"}
      </button>

      {status ? (
        <span
          title={status}
          style={{
            maxWidth: 170,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 11,
            fontWeight: 800,
            color: "var(--metaos-readable-muted, #94a3b8)",
          }}
        >
          {status}
        </span>
      ) : null}
    </div>
  );
}
