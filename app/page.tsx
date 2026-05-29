"use client";

import { useState } from "react";
import {
  GoogleTab,
  MetaOSShell,
  MetaTab,
  OSMode,
} from "@/components/layout/MetaOSShell";

import { ActionReport } from "@/components/dashboard/ActionReport";
import { CompactActionReport } from "@/components/meta/CompactActionReport";
import { BudgetIntelligenceTab } from "@/components/meta/BudgetIntelligenceTab";
import { ZeroPurchaseTab } from "@/components/meta/ZeroPurchaseTab";
import { EfficiencyGaps } from "@/components/dashboard/EfficiencyGaps";
import { BenchmarkAudit } from "@/components/dashboard/BenchmarkAudit";
import { SpendVisuals } from "@/components/dashboard/SpendVisuals";
import { CreativeActions } from "@/components/dashboard/CreativeActions";
import { CompactCreativeAudit } from "@/components/meta/CompactCreativeAudit";
import { WinnerCreativeTab } from "@/components/meta/WinnerCreativeTab";
import { HookHoldCreativeTab } from "@/components/meta/HookHoldCreativeTab";
import { StructureReport } from "@/components/dashboard/StructureReport";
import { DailySummaryExport } from "@/components/dashboard/DailySummaryExport";
import { MetaExecutiveSummary } from "@/components/meta/MetaExecutiveSummary";
import { EnhancedMonthlyReport } from "@/components/meta/EnhancedMonthlyReport";
import { MonthlyPerformance } from "@/components/dashboard/MonthlyPerformance";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

import { GoogleSearchTermAudit } from "@/components/google/GoogleSearchTermAudit";
import { AutoMetaSheetLoader } from "@/components/meta/AutoMetaSheetLoader";
import { CriticalCpaCreatives } from "@/components/meta/CriticalCpaCreatives";
import { CreativeTimelineMetrics } from "@/components/meta/CreativeTimelineMetrics";

export default function Home() {
  const [osMode, setOsMode] = useState<OSMode>("meta");
  const [activeMetaTab, setActiveMetaTab] = useState<MetaTab>("action_report");
  const [activeGoogleTab, setActiveGoogleTab] = useState<GoogleTab>("google_search_terms");
  const [activeSystemTab, setActiveSystemTab] = useState<"settings" | null>(null);

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
      {activeSystemTab === "settings" && <SettingsPanel />}

      {!activeSystemTab && osMode === "meta" && (
        <>
          <AutoMetaSheetLoader />
          {activeMetaTab === "zero_purchase" && <ZeroPurchaseTab />}
          {activeMetaTab === "action_report" && <CompactActionReport />}
          {activeMetaTab === "budget_intelligence" && <BudgetIntelligenceTab />}
          {activeMetaTab === "roi_gap" && <EfficiencyGaps />}
          {activeMetaTab === "benchmark_audit" && <BenchmarkAudit />}
          {activeMetaTab === "spend_visuals" && <SpendVisuals />}
          {activeMetaTab === "creative" && <CompactCreativeAudit />}
          {activeMetaTab === "winner" && <WinnerCreativeTab />}
          {activeMetaTab === "hook_hold" && <HookHoldCreativeTab />}
          {activeMetaTab === "structure_report" && <StructureReport />}
          {activeMetaTab === "summary" && <MetaExecutiveSummary />}
          {activeMetaTab === "monthly" && <EnhancedMonthlyReport />}
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
