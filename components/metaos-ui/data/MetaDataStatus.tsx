"use client";

import {
  AlertCircle,
  Check,
  Database,
  RefreshCw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { enrichRows } from "@/lib/metrics";
import { useMetaStore } from "@/store/metaStore";

type RefreshState =
  | "idle"
  | "loading"
  | "success"
  | "error";

function formatDate(value: string) {
  if (!value) return "No date";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function formatSyncTime(value: string) {
  if (!value) return "Not synced";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not synced";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MetaDataStatus() {
  const settings = useMetaStore(
    (state) => state.settings
  );

  const performanceRows = useMetaStore(
    (state) => state.performanceRows
  );

  const latestDate = useMetaStore(
    (state) => state.metaLatestDate
  );

  const fetchedAt = useMetaStore(
    (state) => state.metaFetchedAt
  );

  const storedRowCount = useMetaStore(
    (state) => state.metaRowCount
  );

  const [refreshState, setRefreshState] =
    useState<RefreshState>("idle");

  const [errorMessage, setErrorMessage] =
    useState("");

  const initialLoadStarted = useRef(false);

  const rowCount =
    storedRowCount || performanceRows.length;

  const refresh = useCallback(async () => {
    setRefreshState("loading");
    setErrorMessage("");

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      60000
    );

    try {
      const response = await fetch(
        `/api/meta-sheet?source=raw&t=${Date.now()}`,
        {
          cache: "no-store",
          signal: controller.signal,
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            `Meta Sheet request failed: ${response.status}`
        );
      }

      const rows = enrichRows(
        payload?.rows || [],
        settings
      );

      const now =
        payload?.generatedAt ||
        new Date().toISOString();

      useMetaStore
        .getState()
        .setPerformanceRows(rows as never[]);

      useMetaStore
        .getState()
        .setMetaFreshness({
          latestDate:
            payload?.latestDate || "",
          fetchedAt: now,
          rowCount: rows.length,
        });

      if (payload?.qcSummary) {
        useMetaStore
          .getState()
          .setMetaQcSummary(
            payload.qcSummary
          );
      }

      setRefreshState("success");

      window.setTimeout(() => {
        setRefreshState("idle");
      }, 1400);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.name === "AbortError"
            ? "The sheet request timed out."
            : error.message
          : "Meta Sheet refresh failed.";

      setErrorMessage(message);
      setRefreshState("error");
    } finally {
      window.clearTimeout(timeout);
    }
  }, [settings]);

  useEffect(() => {
    if (
      initialLoadStarted.current ||
      performanceRows.length > 0
    ) {
      return;
    }

    initialLoadStarted.current = true;
    void refresh();
  }, [performanceRows.length, refresh]);

  const isLive =
    performanceRows.length > 0 &&
    refreshState !== "error";

  return (
    <div
      className="mos-data-status"
      aria-label="Meta data status"
    >
      <span
        className={[
          "mos-status-chip",
          isLive ? "is-live" : "",
          refreshState === "error"
            ? "is-error"
            : "",
        ].join(" ")}
        title={
          errorMessage ||
          "Meta Google Sheet connection"
        }
      >
        {refreshState === "error" ? (
          <AlertCircle />
        ) : isLive ? (
          <Check />
        ) : (
          <Database />
        )}

        {refreshState === "error"
          ? "Data error"
          : isLive
            ? "Sheet live"
            : "Connecting"}
      </span>

      <span className="mos-status-chip">
        Latest {formatDate(latestDate)}
      </span>

      <span className="mos-status-chip">
        {rowCount.toLocaleString("en-IN")} rows
      </span>

      <span className="mos-status-chip">
        Sync {formatSyncTime(fetchedAt)}
      </span>

      <button
        type="button"
        className="mos-header-action"
        onClick={() => void refresh()}
        disabled={refreshState === "loading"}
        title={
          errorMessage ||
          "Refresh all Meta data"
        }
      >
        <RefreshCw
          className={
            refreshState === "loading"
              ? "animate-spin"
              : ""
          }
        />

        <span>
          {refreshState === "loading"
            ? "Syncing"
            : refreshState === "success"
              ? "Updated"
              : "Refresh"}
        </span>
      </button>
    </div>
  );
}
