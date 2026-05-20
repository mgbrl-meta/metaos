"use client";

import { useState } from "react";
import {
  GoogleTab,
  MetaOSShell,
  MetaTab,
  OSMode,
} from "@/components/layout/MetaOSShell";

import { ActionReport } from "@/components/dashboard/ActionReport";
import { EfficiencyGaps } from "@/components/dashboard/EfficiencyGaps";
import { BenchmarkAudit } from "@/components/dashboard/BenchmarkAudit";
import { SpendVisuals } from "@/components/dashboard/SpendVisuals";
import { CreativeActions } from "@/components/dashboard/CreativeActions";
import { StructureReport } from "@/components/dashboard/StructureReport";
import { DailySummaryExport } from "@/components/dashboard/DailySummaryExport";
import { MonthlyPerformance } from "@/components/dashboard/MonthlyPerformance";
import { UploadPanel } from "@/components/upload/UploadPanel";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

import { GoogleSearchTermAudit } from "@/components/google/GoogleSearchTermAudit";

export default function Home() {
  const [osMode, setOsMode] = useState<OSMode>("meta");
  const [activeMetaTab, setActiveMetaTab] = useState<MetaTab>("action_report");
  const [activeGoogleTab, setActiveGoogleTab] = useState<GoogleTab>("google_search_terms");
  const [activeSystemTab, setActiveSystemTab] = useState<"upload" | "settings" | null>(null);

  return (
    <MetaOSShell
      osMode={osMode}
      setOsMode={(mode) => {
        setOsMode(mode);
        setActiveSystemTab(null);
      }}
      activeMetaTab={activeMetaTab}
      setActiveMetaTab={(tab) => {
        setActiveMetaTab(tab);
        setActiveSystemTab(null);
        setOsMode("meta");
      }}
      activeGoogleTab={activeGoogleTab}
      setActiveGoogleTab={(tab) => {
        setActiveGoogleTab(tab);
        setActiveSystemTab(null);
        setOsMode("google");
      }}
      activeSystemTab={activeSystemTab}
      setActiveSystemTab={setActiveSystemTab}
    >
      {activeSystemTab === "upload" && <UploadPanel />}
      {activeSystemTab === "settings" && <SettingsPanel />}

      {!activeSystemTab && osMode === "meta" && (
        <>
          {activeMetaTab === "action_report" && <ActionReport />}
          {activeMetaTab === "roi_gap" && <EfficiencyGaps />}
          {activeMetaTab === "benchmark_audit" && <BenchmarkAudit />}
          {activeMetaTab === "spend_visuals" && <SpendVisuals />}
          {activeMetaTab === "creative" && <CreativeActions />}
          {activeMetaTab === "structure_report" && <StructureReport />}
          {activeMetaTab === "summary" && <DailySummaryExport />}
          {activeMetaTab === "monthly" && <MonthlyPerformance />}
        </>
      )}

      {!activeSystemTab && osMode === "google" && (
        <>
          {activeGoogleTab === "google_search_terms" && <GoogleSearchTermAudit initialTab="search_terms" />}
          {activeGoogleTab === "google_campaign_audit" && <GoogleSearchTermAudit initialTab="campaigns" />}
          {activeGoogleTab === "google_adgroup_audit" && <GoogleSearchTermAudit initialTab="adgroups" />}
          {activeGoogleTab === "google_keyword_audit" && <GoogleSearchTermAudit initialTab="keywords" />}
          {activeGoogleTab === "google_ad_audit" && <GoogleSearchTermAudit initialTab="ads" />}
          {activeGoogleTab === "google_team_summary" && <GoogleSearchTermAudit initialTab="summary" />}
        </>
      )}
    </MetaOSShell>
  );
}
