"use client";

import { useState } from "react";
import { MetaOSShell, MetaTab } from "@/components/layout/MetaOSShell";

import { ActionReport } from "@/components/dashboard/ActionReport";
import { ROIGap } from "@/components/dashboard/ROIGap";
import { BenchmarkAudit } from "@/components/dashboard/BenchmarkAudit";
import { SpendVisuals } from "@/components/dashboard/SpendVisuals";
import { CreativeActions } from "@/components/dashboard/CreativeActions";
import { StructureReport } from "@/components/dashboard/StructureReport";
import { DailySummaryExport } from "@/components/dashboard/DailySummaryExport";
import { MonthlyPerformance } from "@/components/dashboard/MonthlyPerformance";
import { UploadPanel } from "@/components/upload/UploadPanel";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export default function Home() {
  const [activeTab, setActiveTab] = useState<MetaTab>("action_report");

  return (
    <MetaOSShell activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === "action_report" && <ActionReport />}
      {activeTab === "roi_gap" && <ROIGap />}
      {activeTab === "benchmark_audit" && <BenchmarkAudit />}
      {activeTab === "spend_visuals" && <SpendVisuals />}
      {activeTab === "creative" && <CreativeActions />}
      {activeTab === "structure_report" && <StructureReport />}
      {activeTab === "summary" && <DailySummaryExport />}
      {activeTab === "monthly" && <MonthlyPerformance />}
      {activeTab === "upload" && <UploadPanel />}
      {activeTab === "settings" && <SettingsPanel />}
    </MetaOSShell>
  );
}
