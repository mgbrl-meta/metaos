"use client";

import {
  ReactNode,
  useEffect,
  useMemo,
  useState } from "react"; import {   AlertTriangle,
  BarChart3,
  FileText,
  Grid2X2,
  LineChart,
  Menu,
  Settings,
  ShieldAlert,
  ShieldCheck,
  X,
  Zap,
  PiggyBank,
  Trophy,
  MousePointerClick,
  TrendingUp,
  Hourglass,
  Flame,
  IndianRupee,
  Filter,
} from "lucide-react";
import { ThemeFrame, ThemeToggle, useThemeStore } from "@/components/theme/ThemeProvider";
import { useMetaStore } from "@/store/metaStore";

export type OSMode = "meta";

export type MetaTab =
  | "gpt"
  | "funnel"
  | "creative"
  | "creative_ageing"
  | "data_qc"
  | "top_descaling"
  | "top_scaling"
  | "influencer_ads"
  | "zero_purchase"
  | "high_cpa"
  | "high_roas"
  | "spend_visuals"
  | "summary"
  | "monthly";

type SystemTab = "settings";

type NavItem<T extends string> = {
  id: T;
  label: string;
  shortLabel: string;
  description: string;
  icon: any;
};

const metaNav: NavItem<MetaTab>[] = [
  {
    id: "data_qc",
    label: "Data QC",
    shortLabel: "QC",
    description: "Data quality checks",
    icon: ShieldCheck,
  },

  {
    id: "summary",
    label: "Summary",
    shortLabel: "Summary",
    description: "Daily execution report",
    icon: FileText,
  },
  {
    id: "top_descaling",
    label: "Top De-scaling Priorities",
    shortLabel: "De-scale",
    description: "Ranked creatives to reduce, refresh, cap or pause",
    icon: ShieldAlert,
  },
  {
    id: "top_scaling",
    label: "Top Scaling Priorities",
    shortLabel: "Scale",
    description: "Ranked creatives eligible for controlled scaling",
    icon: TrendingUp,
  },
  {
    id: "influencer_ads",
    label: "Influencer Ads",
    shortLabel: "Influencer",
    description: "Creator approval queue",
    icon: ShieldCheck,
  },

  {
    id: "zero_purchase",
    label: "Zero Purchase",
    shortLabel: "Zero Purchase",
    description: "Live ads with lifetime spend and no purchases",
    icon: ShieldAlert,
  },
  {
    id: "high_cpa",
    label: "High CPA",
    shortLabel: "High CPA",
    description: "Live ads with high lifetime CPA",
    icon: ShieldAlert,
  },
  {
    id: "gpt",
    label: "GPT",
    shortLabel: "GPT",
    description: "Gross profit per transaction control",
    icon: IndianRupee,
  },
  {
    id: "funnel",
    label: "Funnel",
    shortLabel: "Funnel",
    description: "WoW and MoM funnel movement",
    icon: Filter,
  },
  {
    id: "high_roas",
    label: "High ROAS",
    shortLabel: "High ROAS",
    description: "Live ads with strong lifetime ROAS",
    icon: LineChart,
  },  {
    id: "spend_visuals",
    label: "Spend",
    shortLabel: "Spend",
    description: "Spend movement and efficiency visuals",
    icon: BarChart3,
  },
  {
    id: "creative",
    label: "Creative",
    shortLabel: "Creative",
    description: "Creative fatigue and saturation signals",
    icon: Flame,
  },


  {
    id: "creative_ageing",
    label: "Creative Ageing",
    shortLabel: "Ageing",
    description: "Creative age mix and spend exposure",
    icon: Hourglass,
  },
  {
    id: "monthly",
    label: "Monthly",
    shortLabel: "Monthly",
    description: "Monthly performance review",
    icon: LineChart,
  },
];

export function MetaOSShell({
  children,
  osMode,
  setOsMode,
  activeMetaTab,
  setActiveMetaTab,
  activeSystemTab,
  setActiveSystemTab,
}: {
  children: ReactNode;
  osMode: OSMode;
  setOsMode: (mode: OSMode) => void;
  activeMetaTab: MetaTab;
  setActiveMetaTab: (tab: MetaTab) => void;
  activeSystemTab: SystemTab | null;
  setActiveSystemTab: (tab: SystemTab | null) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const metaQcSummary = useMetaStore((state) => (state as any).metaQcSummary);
  const qcCriticalCount = Number(metaQcSummary?.rowsWithCritical || 0);
  const qcShiftedCount = Number(metaQcSummary?.shiftedRowsFixed || 0);
  const qcWarningCount = Number(metaQcSummary?.rowsWithWarnings || 0);

  function osModePillClass(isActive: boolean) {
    return isActive
      ? "metaos-apple-pill metaos-apple-pill-active"
      : "metaos-apple-pill metaos-apple-pill-inactive";
  }

  function metaTabPillClass(isActive: boolean) {
    return isActive
      ? "metaos-apple-tab metaos-apple-pill-active"
      : "metaos-apple-tab metaos-apple-pill-inactive";
  }


  const activeNav = metaNav;

  useEffect(() => {
    document.documentElement.classList.toggle("os-dark", isDark);
    document.documentElement.classList.toggle("os-light", !isDark);
  }, [isDark]);

  const activeTitle = useMemo(() => {
    if (activeSystemTab === "settings") return "Settings";
    return metaNav.find((x) => x.id === activeMetaTab)?.label || "Meta OS";
  }, [activeSystemTab, activeMetaTab]);

  const activeDescription = useMemo(() => {
    if (activeSystemTab === "settings") return "Targets, thresholds and operating rules";
    return metaNav.find((x) => x.id === activeMetaTab)?.description || "";
  }, [activeSystemTab, activeMetaTab]);

  useEffect(() => {
    setMobileOpen(false);
  }, [osMode, activeMetaTab, activeSystemTab]);

  function selectMeta(tab: MetaTab) {
    setOsMode("meta");
    setActiveMetaTab(tab);
    setActiveSystemTab(null);
  }

  function selectSettings() {
    setActiveSystemTab("settings");
  }

  return (
    <ThemeFrame>
      <div data-os-root="true" data-os-theme={isDark ? "dark" : "light"} className={isDark ? "metaos-app metaos-dark min-h-screen overflow-x-hidden" : "metaos-app metaos-light min-h-screen overflow-x-hidden"}>
        <header className={isDark ? "sticky top-0 z-40 border-b border-white/10 bg-[#080a0d]/92 backdrop-blur-2xl" : "sticky top-0 z-40 border-b border-black/10 bg-white/92 backdrop-blur-2xl"}>
          <div className="mx-auto max-w-[1920px] px-3 py-2 lg:px-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-current/10 bg-current/[0.04] lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A84FF]">
                  <Zap className="h-4.5 w-4.5 fill-white text-white" />
                </div>

              </div>

              <div className="min-w-0 flex-1" />

              <div className="hidden items-center gap-2 rounded-xl border border-current/10 bg-current/[0.04] px-3 py-2 lg:flex">
                <span className="h-2 w-2 rounded-full bg-[#0A84FF]" />
                <span className="text-[11px] font-black uppercase tracking-[0.14em] opacity-60">
                  Sheet Live
                </span>
              </div>

              <button
                onClick={selectSettings}
                className={
                  activeSystemTab === "settings"
                    ? "inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-black"
                    : "inline-flex h-9 items-center gap-2 rounded-xl border border-current/10 bg-current/[0.04] px-3 text-xs font-black opacity-65 hover:text-white"
                }
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>

              <ThemeToggle />
            </div>

            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">

              {activeNav.map((item) => {
                const Icon = item.icon;
                const active = !activeSystemTab && activeMetaTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => selectMeta(item.id as MetaTab)}
                    className={
                      active
                        ? "inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#0A84FF] px-3 py-2 text-xs font-black text-white"
                        : "inline-flex shrink-0 items-center gap-2 rounded-xl border border-current/10 bg-current/[0.035] px-3 py-2 text-xs font-black opacity-60 hover:text-white"
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{item.shortLabel}</span>
                    <span className="sm:hidden">{item.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {(qcCriticalCount > 0 || qcShiftedCount > 0 || qcWarningCount > 0) && (
          <button
            type="button"
            onClick={() => selectMeta("data_qc" as MetaTab)}
            className="meta-qc-announcement"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>
              Data QC Alert:
              {qcShiftedCount > 0 ? ` ${qcShiftedCount} shifted row(s) fixed.` : ""}
              {qcCriticalCount > 0 ? ` ${qcCriticalCount} critical row(s).` : ""}
              {qcWarningCount > 0 ? ` ${qcWarningCount} warning row(s).` : ""}
            </span>
            <strong>View QC</strong>
          </button>
        )}

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              className="absolute inset-0 bg-black/70"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            />
            <aside className="absolute left-0 top-0 h-full w-[86vw] max-w-[360px] overflow-y-auto border-r border-white/10 bg-[#080a0d] p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={
                      "flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A84FF]"
                    }
                  >
                    <Zap className="h-5 w-5 fill-white" />
                  </div>
                </div>

                <button
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-current/10 bg-current/[0.04]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid gap-2">
                {activeNav.map((item) => {
                  const Icon = item.icon;
                  const active = !activeSystemTab && activeMetaTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => selectMeta(item.id as MetaTab)}
                      className={
                        active
                          ? "grid grid-cols-[20px_1fr] gap-3 rounded-xl bg-[#0A84FF] px-4 py-3 text-left text-white"
                          : "grid grid-cols-[20px_1fr] gap-3 rounded-xl border border-current/10 bg-current/[0.035] px-4 py-3 text-left opacity-70"
                      }
                    >
                      <Icon className="h-4 w-4" />
                      <span>
                        <span className="block text-sm font-black">{item.label}</span>
                        <span className="mt-0.5 block text-xs opacity-60">{item.description}</span>
                      </span>
                    </button>
                  );
                })}

                <button
                  onClick={selectSettings}
                  className={
                    activeSystemTab === "settings"
                      ? "grid grid-cols-[20px_1fr] gap-3 rounded-xl bg-white px-4 py-3 text-left text-black"
                      : "grid grid-cols-[20px_1fr] gap-3 rounded-xl border border-current/10 bg-current/[0.035] px-4 py-3 text-left opacity-70"
                  }
                >
                  <Settings className="h-4 w-4" />
                  <span>
                    <span className="block text-sm font-black">Settings</span>
                    <span className="mt-0.5 block text-xs opacity-60">Targets and thresholds</span>
                  </span>
                </button>
              </div>
            </aside>
          </div>
        )}

        <main className="min-w-0">
          <div className="mx-auto w-full max-w-[1920px] min-w-0 px-3 py-3 lg:px-4">

            <div className="min-w-0 overflow-x-hidden">{children}</div>
          </div>
        </main>
      </div>
    </ThemeFrame>
  );
}
