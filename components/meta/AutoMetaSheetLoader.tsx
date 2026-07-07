"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Wifi } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";
import { enrichRows } from "@/lib/metrics";

type LoadStatus = "loading" | "connected" | "error";

function formatSyncTime(value: string) {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AutoMetaSheetLoader() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [message, setMessage] = useState("Connecting to Meta Google Sheet...");
  const [rowCount, setRowCount] = useState(0);
  const [latestDate, setLatestDate] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState("");

  async function loadMetaSheet() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45000);

    try {
      setStatus("loading");
      setMessage("Syncing latest Meta data from Google Sheet...");

      const res = await fetch(`/api/meta-sheet?source=raw&t=${Date.now()}`, {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Meta Sheet connection failed");
      }

      const rows = enrichRows(json.rows || [], useMetaStore.getState().settings);

      useMetaStore.getState().setPerformanceRows(rows as any);

      useMetaStore.getState().setMetaFreshness({
        latestDate: json.latestDate || "",
        fetchedAt: json.generatedAt || new Date().toISOString(),
        rowCount: rows.length,
      });

      if (json.qcSummary) {
        useMetaStore.getState().setMetaQcSummary(json.qcSummary);
      }

      setRowCount(rows.length);
      setLatestDate(json.latestDate || "");
      setLastLoadedAt(json.generatedAt || new Date().toISOString());
      setStatus("connected");

      const shifted = Number(json.qcSummary?.shiftedRowsFixed || 0);
      const critical = Number(json.qcSummary?.rowsWithCritical || 0);

      if (shifted > 0 || critical > 0) {
        setMessage(
          `Meta Sheet live · ${rows.length.toLocaleString()} rows loaded · Latest ${json.latestDate || "NA"} · QC alert found`
        );
      } else {
        setMessage(
          `Meta Sheet live · ${rows.length.toLocaleString()} rows loaded · Latest ${json.latestDate || "NA"}`
        );
      }
    } catch (error: any) {
      setStatus("error");

      if (error?.name === "AbortError") {
        setMessage("Meta Sheet is taking too long to respond. Check sheet size or Vercel env variables.");
      } else {
        setMessage(error?.message || "Meta Sheet connection failed");
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }

  useEffect(() => {
    loadMetaSheet();
  }, []);

  const base =
    status === "connected"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : status === "error"
        ? "border-red-400/20 bg-red-400/10 text-red-300"
        : "border-[#0A84FF]/20 bg-[#0A84FF]/10 text-[#8cc8ff]";


  return (
    <div
      className="hidden"
      data-meta-sheet-loader="true"
      data-meta-sheet-status={status}
      data-meta-sheet-message={message}
      data-meta-sheet-row-count={rowCount}
      data-meta-sheet-last-loaded-at={lastLoadedAt}
    />
  );
}
