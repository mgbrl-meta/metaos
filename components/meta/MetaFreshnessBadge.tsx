"use client";

import { Database, RefreshCcw } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";

function formatTime(value: string) {
  if (!value) return "NA";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "NA";

  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MetaFreshnessBadge() {
  const latestDate = useMetaStore((state) => state.metaLatestDate);
  const fetchedAt = useMetaStore((state) => state.metaFetchedAt);
  const rowCount = useMetaStore((state) => state.metaRowCount);

  if (!latestDate && !rowCount) return null;

  return (
    <div className="mb-3 rounded-2xl border border-current/10 bg-current/[0.025] px-4 py-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[#0A84FF]" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] opacity-70">
              Global Meta Data Freshness
            </p>
            <p className="mt-0.5 text-sm opacity-60">
              All normal dashboard tabs read from this same refreshed store.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em]">
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:text-emerald-300">
            Latest {latestDate || "NA"}
          </span>
          <span className="rounded-full border border-current/10 px-3 py-1">
            Rows {Number(rowCount || 0).toLocaleString("en-IN")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-current/10 px-3 py-1">
            <RefreshCcw className="h-3.5 w-3.5" />
            Sync {formatTime(fetchedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
