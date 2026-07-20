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

import { MetaFileUploadButton } from "@/components/metaos-ui/data/MetaFileUploadButton";
import { loadMetaSheetData } from "@/lib/meta-sheet/client";
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

  const metaSource = useMetaStore(
    (state) => state.metaSource
  );

  const metaSourceLabel = useMetaStore(
    (state) => state.metaSourceLabel
  );

  const hydrateMetaDataset = useMetaStore(
    (state) => state.hydrateMetaDataset
  );

  const [refreshState, setRefreshState] =
    useState<RefreshState>("idle");

  const [errorMessage, setErrorMessage] =
    useState("");

  const initialLoadStarted = useRef(false);

  const rowCount =
    storedRowCount || performanceRows.length;

  const loadData = useCallback(
    async (forceRefresh: boolean) => {
      setRefreshState("loading");
      setErrorMessage("");

      const controller = new AbortController();
      const timeout = window.setTimeout(
        () => controller.abort(),
        120000
      );

      try {
        const response = await loadMetaSheetData({
          forceRefresh,
          signal: controller.signal,
        });

        hydrateMetaDataset({
          rows: response.dataset.rows,
          latestDate: response.dataset.latestDate,
          fetchedAt: response.dataset.fetchedAt,
          rowCount: response.dataset.rowCount,
        });

        setRefreshState("success");

        window.setTimeout(() => {
          setRefreshState("idle");
        }, 1400);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.name === "AbortError"
              ? "The Google Sheet request timed out."
              : error.message
            : "Meta Sheet refresh failed.";

        setErrorMessage(message);
        setRefreshState("error");
      } finally {
        window.clearTimeout(timeout);
      }
    },
    [hydrateMetaDataset]
  );

  useEffect(() => {
    if (
      initialLoadStarted.current ||
      performanceRows.length > 0
    ) {
      return;
    }

    initialLoadStarted.current = true;
    void loadData(false);
  }, [loadData, performanceRows.length]);

  const isLive =
    performanceRows.length > 0 &&
    refreshState !== "error";

  const sourceTitle =
    metaSource === "file"
      ? `Uploaded file: ${metaSourceLabel}`
      : "Meta Google Sheet connection";

  const sourceLabel =
    refreshState === "error"
      ? "Data error"
      : isLive
        ? metaSource === "file"
          ? "Excel loaded"
          : "Sheet live"
        : "Connecting";

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
        title={errorMessage || sourceTitle}
      >
        {refreshState === "error" ? (
          <AlertCircle />
        ) : isLive ? (
          <Check />
        ) : (
          <Database />
        )}

        {sourceLabel}
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

      <MetaFileUploadButton />

      <button
        type="button"
        className="mos-header-action"
        onClick={() => void loadData(true)}
        disabled={refreshState === "loading"}
        title={
          errorMessage ||
          "Refresh all Meta data from Google Sheets"
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
