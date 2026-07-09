"use client";

import { useMemo } from "react";
import { useMetaStore } from "@/store/metaStore";
import { useMetaV2SettingsStore } from "@/store/metaV2SettingsStore";
import { useMetaV2UiStore } from "@/store/metaV2UiStore";
import { normalizeMetaV2Rows } from "@/lib/meta-v2/normalize";
import { buildMetaV2CommandCenter } from "@/lib/meta-v2/engines/commandCenterEngine";
import { MetaOSV2Header } from "@/components/meta-v2/shell/MetaOSV2Header";
import { MetaOSV2Sidebar } from "@/components/meta-v2/shell/MetaOSV2Sidebar";
import { CommandCenter } from "@/components/meta-v2/dashboard/CommandCenter";
import { DataQcDashboard } from "@/components/meta-v2/dashboard/DataQcDashboard";
import { FunnelDashboard } from "@/components/meta-v2/dashboard/FunnelDashboard";
import { ZeroPurchaseDashboard } from "@/components/meta-v2/dashboard/ZeroPurchaseDashboard";
import { EmptyState } from "@/components/meta-v2/shared/EmptyState";
import { SectionCard } from "@/components/meta-v2/shared/SectionCard";

function ComingSoon({ title }: { title: string }) {
  return (
    <SectionCard title={title} eyebrow="V2 Module">
      <p className="text-sm leading-6 text-white/55">
        This V2 module will be connected to its own engine next. The structure is ready; logic will not be placed inside UI.
      </p>
    </SectionCard>
  );
}

export function MetaOSV2App() {
  const performanceRows = useMetaStore((state) => state.performanceRows);
  const dataHealth = useMetaStore((state) => state.dataHealth);
  const settings = useMetaV2SettingsStore((state) => state.settings);
  const activeTab = useMetaV2UiStore((state) => state.activeTab);

  const cleanRows = useMemo(
    () => normalizeMetaV2Rows((performanceRows || []) as unknown as Record<string, unknown>[]),
    [performanceRows]
  );

  const commandOutput = useMemo(
    () => buildMetaV2CommandCenter(cleanRows, settings, new Date().toISOString()),
    [cleanRows, settings]
  );

  const status = {
    ...commandOutput.status,
    rowCount: cleanRows.length || dataHealth?.rowsImported || 0,
  };

  return (
    <div className="min-h-screen bg-[#05070D] text-white">
      <MetaOSV2Header status={status} />

      <div className="flex">
        <MetaOSV2Sidebar />

        <main className="min-w-0 flex-1 p-4 md:p-6">
          {!cleanRows.length ? (
            <EmptyState
              title="MetaOS V2 is ready"
              description="Use the existing dashboard to load/refresh Meta data. V2 will automatically read the prepared rows from the current store until the V2 data adapter is connected."
            />
          ) : activeTab === "command" ? (
            <CommandCenter output={commandOutput} />
          ) : activeTab === "data_qc" ? (
            <DataQcDashboard rows={cleanRows} />
          ) : activeTab === "descale" ? (
            <ComingSoon title="Top De-scaling" />
          ) : activeTab === "scale" ? (
            <ComingSoon title="Top Scaling" />
          ) : activeTab === "zero_purchase" ? (
            <ZeroPurchaseDashboard rows={cleanRows} />
          ) : activeTab === "high_cpa" ? (
            <ComingSoon title="High CPA" />
          ) : activeTab === "high_roas" ? (
            <ComingSoon title="High ROAS" />
          ) : activeTab === "funnel" ? (
            <FunnelDashboard rows={cleanRows} />
          ) : activeTab === "creative" ? (
            <ComingSoon title="Creative Intelligence" />
          ) : activeTab === "budget" ? (
            <ComingSoon title="Budget Reallocation" />
          ) : activeTab === "strategy" ? (
            <ComingSoon title="Strategy Memo" />
          ) : (
            <ComingSoon title="Settings" />
          )}
        </main>
      </div>
    </div>
  );
}
