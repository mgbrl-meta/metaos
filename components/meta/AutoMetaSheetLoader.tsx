"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";
import { enrichRows } from "@/lib/metrics";

export function AutoMetaSheetLoader() {
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading");
  const [message, setMessage] = useState("Loading Meta Sheet...");
  const [rowCount, setRowCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadMetaSheet() {
      try {
        setStatus("loading");
        setMessage("Loading Meta Sheet...");

        const res = await fetch("/api/meta-sheet", {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load Meta Sheet");
        }

        const rows = enrichRows(json.rows || []);

        useMetaStore.setState({
          performanceRows: rows,
        } as any);

        if (!cancelled) {
          setRowCount(rows.length);
          setStatus("connected");
          setMessage(`Meta Sheet connected · ${rows.length.toLocaleString()} rows`);
        }
      } catch (error: any) {
        if (!cancelled) {
          setStatus("error");
          setMessage(error?.message || "Meta Sheet connection failed");
        }
      }
    }

    loadMetaSheet();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={
        status === "connected"
          ? "mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300"
          : status === "error"
          ? "mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
          : "mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[#0A84FF]/20 bg-[#0A84FF]/10 px-4 py-3 text-sm text-[#7dbdff]"
      }
    >
      {status === "connected" ? (
        <Wifi className="h-4 w-4" />
      ) : status === "error" ? (
        <WifiOff className="h-4 w-4" />
      ) : (
        <RefreshCw className="h-4 w-4 animate-spin" />
      )}

      <span className="font-bold">{message}</span>

      {status === "connected" && (
        <span className="rounded-full border border-current/20 px-2 py-0.5 text-xs font-black">
          Auto-refresh on page load
        </span>
      )}
    </div>
  );
}
