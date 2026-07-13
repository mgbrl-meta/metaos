import {
  BarChart3,
  CalendarDays,
  FileText,
  Filter,
  Gauge,
  Hourglass,
  IndianRupee,
  Layers,
  LineChart,
  Megaphone,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import registryJson from "@/config/metaos-module-registry.json";

import type {
  MetaOSIconKey,
  MetaOSModuleDefinition,
  MetaOSModuleRegistryConfig,
} from "@/lib/metaos-ui/contracts";

const ICONS: Record<MetaOSIconKey, LucideIcon> = {
  gauge: Gauge,
  shield_check: ShieldCheck,
  file_text: FileText,
  trending_down: TrendingDown,
  trending_up: TrendingUp,
  users: Users,
  shield_alert: ShieldAlert,
  indian_rupee: IndianRupee,
  filter: Filter,
  line_chart: LineChart,
  bar_chart: BarChart3,
  sparkles: Sparkles,
  hourglass: Hourglass,
  calendar: CalendarDays,
  search: Search,
  layers: Layers,
  megaphone: Megaphone,
  settings: Settings,
};

export const METAOS_REGISTRY_CONFIG =
  registryJson as unknown as MetaOSModuleRegistryConfig;

export const METAOS_MODULES:
  readonly MetaOSModuleDefinition[] =
  METAOS_REGISTRY_CONFIG.modules
    .map((module) => ({
      ...module,
      icon: ICONS[module.iconKey],
    }))
    .sort((a, b) => a.order - b.order);

export const METAOS_SECTIONS = [
  ...METAOS_REGISTRY_CONFIG.sections,
].sort((a, b) => a.order - b.order);

export const METAOS_DEFAULT_MODULE_ID =
  METAOS_REGISTRY_CONFIG.defaultModuleId;
