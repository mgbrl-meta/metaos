"use client";

import { CreativeAgeingModule } from "@/components/metaos-ui/modules/CreativeAgeingModule";
import { MonthlyAnalysisModule } from "@/components/metaos-ui/modules/MonthlyAnalysisModule";

import { SpendAnalysisModule } from "@/components/metaos-ui/modules/SpendAnalysisModule";
import { CreativeFatigueModule } from "@/components/metaos-ui/modules/CreativeFatigueModule";
import { CreativeScalingModule } from "@/components/metaos-ui/modules/creative-scaling/CreativeScalingModule";


import { GoogleSearchTermAudit } from "@/components/google/GoogleSearchTermAudit";




import { CommandCenterModule } from "@/components/metaos-ui/modules/CommandCenterModule";
import { ZeroPurchaseModule } from "@/components/metaos-ui/modules/ZeroPurchaseModule";
import { DataQcModule } from "@/components/metaos-ui/modules/DataQcModule";
import { FunnelModule } from "@/components/metaos-ui/modules/FunnelModule";
import { SummaryModule } from "@/components/metaos-ui/modules/SummaryModule";
import {
  TopDescalingModule,
  TopScalingModule,
} from "@/components/metaos-ui/modules/PriorityModule";
import { InfluencerModule } from "@/components/metaos-ui/modules/InfluencerModule";
import { HighCpaModule } from "@/components/metaos-ui/modules/HighCpaModule";
import { GptControlModule } from "@/components/metaos-ui/modules/GptControlModule";
import { HighRoasModule } from "@/components/metaos-ui/modules/HighRoasModule";

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
      return <SummaryModule />;

    case "top_descaling":
      return <TopDescalingModule />;

    case "top_scaling":
      return <TopScalingModule />;

    case "influencer_ads":
      return <InfluencerModule />;

    case "zero_purchase":
      return <ZeroPurchaseModule />;

    case "high_cpa":
      return <HighCpaModule />;

    case "gpt":
      return <GptControlModule />;

    case "funnel":
      return <FunnelModule />;

    case "high_roas":
      return <HighRoasModule />;

    case "spend_visuals":
      return <SpendAnalysisModule />;

    case "creative":
      return <CreativeFatigueModule />;

    case "creative_scaling":
      return <CreativeScalingModule />;

    case "creative_ageing":
      return <CreativeAgeingModule />;

    case "monthly":
      return <MonthlyAnalysisModule />;

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
