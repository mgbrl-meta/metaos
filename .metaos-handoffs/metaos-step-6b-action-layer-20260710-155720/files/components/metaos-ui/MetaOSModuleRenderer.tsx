"use client";

import { SpendVisuals } from "@/components/dashboard/SpendVisuals";

import { GoogleSearchTermAudit } from "@/components/google/GoogleSearchTermAudit";

import { CreativeAgeingTab } from "@/components/meta/CreativeAgeingTab";
import { CreativeTab } from "@/components/meta/CreativeTab";
import { DataQCTab } from "@/components/meta/DataQCTab";
import { EnhancedMonthlyReport } from "@/components/meta/EnhancedMonthlyReport";
import { GptTab } from "@/components/meta/GptTab";
import { HighCpaTab } from "@/components/meta/HighCpaTab";
import { HighRoasTab } from "@/components/meta/HighRoasTab";
import { InfluencerAdsTab } from "@/components/meta/InfluencerAdsTab";
import { MetaExecutiveSummary } from "@/components/meta/MetaExecutiveSummary";

import {
  TopDescalingPrioritiesTab,
  TopScalingPrioritiesTab,
} from "@/components/meta/PrioritySplitTabs";

import { ZeroPurchaseTabV2 } from "@/components/meta/ZeroPurchaseTabV2";

import { CommandCenterModule } from "@/components/metaos-ui/modules/CommandCenterModule";
import { ZeroPurchaseModule } from "@/components/metaos-ui/modules/ZeroPurchaseModule";
import { DataQcModule } from "@/components/metaos-ui/modules/DataQcModule";
import { FunnelModule } from "@/components/metaos-ui/modules/FunnelModule";

import { SettingsPanel } from "@/components/settings/SettingsPanel";

import type { MetaOSModuleId } from "@/lib/metaos-ui/contracts";

export function MetaOSModuleRenderer({
  moduleId,
}: {
  moduleId: MetaOSModuleId;
}) {
  switch (moduleId) {
    case "command_center":
      return <CommandCenterModule />;

    case "data_qc":
      return <DataQcModule />;

    case "summary":
      return <MetaExecutiveSummary />;

    case "top_descaling":
      return <TopDescalingPrioritiesTab />;

    case "top_scaling":
      return <TopScalingPrioritiesTab />;

    case "influencer_ads":
      return <InfluencerAdsTab />;

    case "zero_purchase":
      return <ZeroPurchaseModule />;

    case "high_cpa":
      return <HighCpaTab />;

    case "gpt":
      return <GptTab />;

    case "funnel":
      return <FunnelModule />;

    case "high_roas":
      return <HighRoasTab />;

    case "spend_visuals":
      return <SpendVisuals />;

    case "creative":
      return <CreativeTab />;

    case "creative_ageing":
      return <CreativeAgeingTab />;

    case "monthly":
      return <EnhancedMonthlyReport />;

    case "google_search_terms":
      return (
        <GoogleSearchTermAudit
          initialTab="search_terms"
        />
      );

    case "google_campaign_audit":
      return (
        <GoogleSearchTermAudit
          initialTab="campaigns"
        />
      );

    case "google_adgroup_audit":
      return (
        <GoogleSearchTermAudit
          initialTab="adgroups"
        />
      );

    case "google_keyword_audit":
      return (
        <GoogleSearchTermAudit
          initialTab="keywords"
        />
      );

    case "google_ad_audit":
      return (
        <GoogleSearchTermAudit
          initialTab="ads"
        />
      );

    case "google_team_summary":
      return (
        <GoogleSearchTermAudit
          initialTab="summary"
        />
      );

    case "settings":
      return <SettingsPanel />;

    default: {
      const exhaustiveCheck: never = moduleId;
      return exhaustiveCheck;
    }
  }
}
