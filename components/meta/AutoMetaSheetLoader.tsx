"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Wifi } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";
import { enrichRows } from "@/lib/metrics";

type LoadStatus = "loading" | "connected" | "error";

export function AutoMetaSheetLoader() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [message, setMessage] = useState("Connecting to Meta Google Sheet...");
  const [rowCount, setRowCount] = useState(0);
  const [lastLoadedAt, setLastLoadedAt] = useState("");

  async function loadMetaSheet() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);

    try {
      setStatus("loading");
      setMessage("Syncing latest Meta data from Google Sheet...");

      const res = await fetch("/api/meta-sheet", {
        cache: "no-store",
        signal: controller.signal,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Meta Sheet connection failed");
      }

      const rows = enrichRows(json.rows || [], useMetaStore.getState().settings);

      useMetaStore.setState({
        performanceRows: rows,
      } as any);

      setRowCount(rows.length);
      setStatus("connected");
      setLastLoadedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setMessage(`Meta Sheet live · ${rows.length.toLocaleString()} rows loaded`);
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
    <div className={`mb-5 rounded-[1.5rem] border px-4 py-3 ${base}`}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5">
            {status === "connected" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : status === "error" ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <RefreshCw className="h-5 w-5 animate-spin" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-black leading-5">{message}</p>
            <p className="mt-1 text-xs leading-5 opacity-70">
              Source: Google Sheet · Auto-loads on every dashboard open
              {lastLoadedAt ? ` · Last sync ${lastLoadedAt}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {status === "connected" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-current/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em]">
              <Wifi className="h-3.5 w-3.5" />
              Live Source
            </span>
          )}

          {rowCount > 0 && (
            <span className="rounded-full border border-current/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em]">
              {rowCount.toLocaleString()} Rows
            </span>
          )}

          <button
            onClick={loadMetaSheet}
            className="rounded-full border border-current/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] hover:bg-current/10"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
