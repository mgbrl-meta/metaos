import type { LucideIcon } from "lucide-react";

export const METAOS_PLATFORMS = [
  "meta",
  "google",
  "system",
] as const;

export type MetaOSPlatform =
  (typeof METAOS_PLATFORMS)[number];

export const METAOS_MODULE_IDS = [
  "command_center",
  "data_qc",
  "summary",
  "top_descaling",
  "top_scaling",
  "influencer_ads",
  "zero_purchase",
  "high_cpa",
  "gpt",
  "funnel",
  "high_roas",
  "spend_visuals",
  "creative",
  "creative_scaling",
  "creative_ageing",
  "monthly",
  "google_search_terms",
  "google_campaign_audit",
  "google_adgroup_audit",
  "google_keyword_audit",
  "google_ad_audit",
  "google_team_summary",
  "settings",
] as const;

export type MetaOSModuleId =
  (typeof METAOS_MODULE_IDS)[number];

export const METAOS_SECTION_IDS = [
  "meta_overview",
  "meta_control",
  "meta_diagnostics",
  "meta_intelligence",
  "meta_reporting",
  "google_operations",
  "system",
] as const;

export type MetaOSSectionId =
  (typeof METAOS_SECTION_IDS)[number];

export const METAOS_ICON_KEYS = [
  "gauge",
  "shield_check",
  "file_text",
  "trending_down",
  "trending_up",
  "users",
  "shield_alert",
  "indian_rupee",
  "filter",
  "line_chart",
  "bar_chart",
  "sparkles",
  "hourglass",
  "calendar",
  "search",
  "layers",
  "megaphone",
  "settings",
] as const;

export type MetaOSIconKey =
  (typeof METAOS_ICON_KEYS)[number];

export type MetaOSModuleImplementation =
  | "existing_screen"
  | "v2_screen"
  | "v2_engine"
  | "system_screen";

export type MetaOSModuleStatus = "ready";

export interface MetaOSSectionDefinition {
  id: MetaOSSectionId;
  platform: MetaOSPlatform;
  label: string;
  order: number;
}

export interface MetaOSModuleDefinitionInput {
  id: MetaOSModuleId;
  platform: MetaOSPlatform;
  sectionId: MetaOSSectionId;
  label: string;
  shortLabel: string;
  description: string;
  iconKey: MetaOSIconKey;
  componentKey: MetaOSModuleId;
  componentPath: string;
  preferredComponentPath?: string;
  componentVariant?: string;
  currentRoute: "/" | "/v2";
  implementation: MetaOSModuleImplementation;
  status: MetaOSModuleStatus;
  order: number;
  keywords: string[];
}

export interface MetaOSModuleDefinition
  extends MetaOSModuleDefinitionInput {
  icon: LucideIcon;
}

export interface MetaOSModuleRegistryConfig {
  version: string;
  defaultModuleId: MetaOSModuleId;
  platformOrder: MetaOSPlatform[];
  sections: MetaOSSectionDefinition[];
  modules: MetaOSModuleDefinitionInput[];
}

export interface MetaOSNavigationSection {
  section: MetaOSSectionDefinition;
  modules: MetaOSModuleDefinition[];
}
