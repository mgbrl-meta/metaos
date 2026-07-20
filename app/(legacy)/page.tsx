"use client";

import { useEffect, useState } from "react";
import {
  MetaOSShell,
  MetaTab,
  OSMode,
} from "@/components/layout/MetaOSShell";

import { ZeroPurchaseTabV2 } from "@/components/meta/ZeroPurchaseTabV2";
import { InfluencerAdsTab } from "@/components/meta/InfluencerAdsTab";
import { TopDescalingPrioritiesTab, TopScalingPrioritiesTab } from "@/components/meta/PrioritySplitTabs";
import { HighCpaTab } from "@/components/meta/HighCpaTab";
import { HighRoasTab } from "@/components/meta/HighRoasTab";
import { SpendVisuals } from "@/components/dashboard/SpendVisuals";
import { DailySummaryExport } from "@/components/dashboard/DailySummaryExport";
import { MetaExecutiveSummary } from "@/components/meta/MetaExecutiveSummary";
import { EnhancedMonthlyReport } from "@/components/meta/EnhancedMonthlyReport";
import { MonthlyPerformance } from "@/components/dashboard/MonthlyPerformance";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

import { AutoMetaSheetLoader } from "@/components/meta/AutoMetaSheetLoader";
import { MetaFreshnessBadge } from "@/components/meta/MetaFreshnessBadge";
import { CriticalCpaCreatives } from "@/components/meta/CriticalCpaCreatives";
import { CreativeTimelineMetrics } from "@/components/meta/CreativeTimelineMetrics";
import { DataQCTab } from "@/components/meta/DataQCTab";
import { CreativeAgeingTab } from "@/components/meta/CreativeAgeingTab";
import { CreativeTab } from "@/components/meta/CreativeTab";
import { GptTab } from "@/components/meta/GptTab";
import { FunnelTabV2 } from "@/components/meta/FunnelTabV2";

export default function Home() {

  useEffect(() => {
    const versionKey = "METAOS_DATA_VERSION_2026_07_06_FRESHNESS_FIX";
    const existing = window.localStorage.getItem(versionKey);

    if (existing !== "1") {
      Object.keys(window.localStorage).forEach((key) => {
        if (
          key.toLowerCase().includes("meta") ||
          key.toLowerCase().includes("zustand")
        ) {
          window.localStorage.removeItem(key);
        }
      });

      window.localStorage.setItem(versionKey, "1");
      window.location.reload();
    }
  }, []);


  const [osMode, setOsMode] = useState<OSMode>("meta");
  const [activeMetaTab, setActiveMetaTab] = useState<MetaTab>("summary");
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
      activeSystemTab={activeSystemTab}
      setActiveSystemTab={setActiveSystemTab}
    >
      {activeSystemTab === "settings" && <SettingsPanel />}

      {!activeSystemTab && osMode === "meta" && (
        <>
          <AutoMetaSheetLoader />
          <MetaFreshnessBadge />
          {activeMetaTab === "top_descaling" && <TopDescalingPrioritiesTab />}
          {activeMetaTab === "top_scaling" && <TopScalingPrioritiesTab />}
          {activeMetaTab === "influencer_ads" && <InfluencerAdsTab />}
          {activeMetaTab === "zero_purchase" && <ZeroPurchaseTabV2 />}
          {activeMetaTab === "high_cpa" && <HighCpaTab />}
          {activeMetaTab === "high_roas" && <HighRoasTab />}
          {activeMetaTab === "spend_visuals" && <SpendVisuals />}
          {activeMetaTab === "funnel" && <FunnelTabV2 />}
          {activeMetaTab === "gpt" && <GptTab />}
          {activeMetaTab === "creative" && <CreativeTab />}
          {activeMetaTab === "creative_ageing" && <CreativeAgeingTab />}
          {activeMetaTab === "data_qc" && <DataQCTab />}
          {activeMetaTab === "summary" && <MetaExecutiveSummary />}
          {activeMetaTab === "monthly" && <EnhancedMonthlyReport />}
        </>
      )}
    </MetaOSShell>
  );
}
