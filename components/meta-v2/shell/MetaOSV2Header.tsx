"use client";

import { RefreshCw, Settings, Sparkles } from "lucide-react";
import type { MetaV2Status } from "@/lib/meta-v2/schema";
import { formatDate, formatNumberFull, formatSyncTime } from "@/lib/meta-v2/formatters";
import { StatusPill } from "@/components/meta-v2/shared/StatusPill";

export function MetaOSV2Header({
  status,
}: {
  status: MetaV2Status;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#05070D]/80 px-5 py-4 backdrop-blur-2xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A84FF] text-white shadow-[0_18px_60px_rgba(10,132,255,0.45)]">
            <Sparkles className="h-5 w-5" />
          </div>

          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/40">
              Paid Media Intelligence
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">MetaOS V2</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label={status.isLive ? "Sheet Live" : "No Data"} tone={status.isLive ? "green" : "red"} />
          <StatusPill label={`Latest ${formatDate(status.latestDate)}`} tone="blue" />
          <StatusPill label={`${formatNumberFull(status.rowCount)} rows`} tone="slate" />
          <StatusPill label={`Sync ${formatSyncTime(status.syncedAt)}`} tone="slate" />

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/75 transition hover:bg-white/[0.1]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/75 transition hover:bg-white/[0.1]"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
        </div>
      </div>
    </header>
  );
}
