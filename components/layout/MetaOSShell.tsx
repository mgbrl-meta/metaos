"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  FileText,
  Grid2X2,
  Layers,
  LineChart,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
  PiggyBank,
  Trophy,
  MousePointerClick,
  TrendingUp,
} from "lucide-react";
import { ThemeFrame, ThemeToggle, useThemeStore } from "@/components/theme/ThemeProvider";

export type OSMode = "meta" | "google";

export type MetaTab =
  | "zero_purchase"
  | "high_cpa"
  | "high_roas"
  | "spend_visuals"
  | "winner"
  | "hook_hold"
  | "structure_report"
  | "summary"
  | "monthly";

export type GoogleTab =
  | "google_search_terms"
  | "google_campaign_audit"
  | "google_adgroup_audit"
  | "google_keyword_audit"
  | "google_ad_audit"
  | "google_team_summary";

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
    id: "zero_purchase",
    label: "Zero Purchase",
    shortLabel: "Zero Purchase",
    description: "Live ads with lifetime spend and no purchases",
    icon: AlertTriangle,
  },
  {
    id: "high_cpa",
    label: "High CPA",
    shortLabel: "High CPA",
    description: "Live ads with high lifetime CPA",
    icon: AlertTriangle,
  },
  {
    id: "high_roas",
    label: "High ROAS",
    shortLabel: "High ROAS",
    description: "Live ads with strong lifetime ROAS",
    icon: TrendingUp,
  },
  {
    id: "spend_visuals",
    label: "Spend Visuals",
    shortLabel: "Spend",
    description: "Spend, CPA, ROAS trends",
    icon: BarChart3,
  },
  {
    id: "winner",
    label: "Winner Creatives",
    shortLabel: "Winner",
    description: "Top performing creative learnings",
    icon: Trophy,
  },
  {
    id: "hook_hold",
    label: "Hook / Hold",
    shortLabel: "Hook / Hold",
    description: "Top hook rate and hold rate creatives",
    icon: MousePointerClick,
  },
  {
    id: "structure_report",
    label: "Structure Report",
    shortLabel: "Structure",
    description: "Campaign → ad set → ad clarity",
    icon: Layers,
  },
  {
    id: "summary",
    label: "Team Summary",
    shortLabel: "Summary",
    description: "Daily execution report",
    icon: FileText,
  },
  {
    id: "monthly",
    label: "Monthly Report",
    shortLabel: "Monthly",
    description: "Monthly performance review",
    icon: LineChart,
  },
];

const googleNav: NavItem<GoogleTab>[] = [
  {
    id: "google_search_terms",
    label: "Search Term Audit",
    shortLabel: "Terms",
    description: "Negatives and exact keywords",
    icon: Search,
  },
  {
    id: "google_campaign_audit",
    label: "Campaign Audit",
    shortLabel: "Campaign",
    description: "Campaign efficiency",
    icon: BarChart3,
  },
  {
    id: "google_adgroup_audit",
    label: "Ad Group Audit",
    shortLabel: "Ad Group",
    description: "Ad-group control",
    icon: Layers,
  },
  {
    id: "google_keyword_audit",
    label: "Keyword Audit",
    shortLabel: "Keywords",
    description: "Keyword pruning and scaling",
    icon: Sparkles,
  },
  {
    id: "google_ad_audit",
    label: "Ad Audit",
    shortLabel: "Ads",
    description: "Ad copy and LP match",
    icon: FileText,
  },
  {
    id: "google_team_summary",
    label: "Google Summary",
    shortLabel: "Summary",
    description: "Daily Google action report",
    icon: ShieldCheck,
  },
];

export function MetaOSShell({
  children,
  osMode,
  setOsMode,
  activeMetaTab,
  setActiveMetaTab,
  activeGoogleTab,
  setActiveGoogleTab,
  activeSystemTab,
  setActiveSystemTab,
}: {
  children: ReactNode;
  osMode: OSMode;
  setOsMode: (mode: OSMode) => void;
  activeMetaTab: MetaTab;
  setActiveMetaTab: (tab: MetaTab) => void;
  activeGoogleTab: GoogleTab;
  setActiveGoogleTab: (tab: GoogleTab) => void;
  activeSystemTab: SystemTab | null;
  setActiveSystemTab: (tab: SystemTab | null) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const isGoogle = osMode === "google";
  const activeNav = isGoogle ? googleNav : metaNav;

  useEffect(() => {
    document.documentElement.classList.toggle("os-dark", isDark);
    document.documentElement.classList.toggle("os-light", !isDark);
  }, [isDark]);

  const activeTitle = useMemo(() => {
    if (activeSystemTab === "settings") return "Settings";
    if (isGoogle) return googleNav.find((x) => x.id === activeGoogleTab)?.label || "Google OS";
    return metaNav.find((x) => x.id === activeMetaTab)?.label || "Meta OS";
  }, [activeSystemTab, isGoogle, activeGoogleTab, activeMetaTab]);

  const activeDescription = useMemo(() => {
    if (activeSystemTab === "settings") return "Targets, thresholds and operating rules";
    if (isGoogle) return googleNav.find((x) => x.id === activeGoogleTab)?.description || "";
    return metaNav.find((x) => x.id === activeMetaTab)?.description || "";
  }, [activeSystemTab, isGoogle, activeGoogleTab, activeMetaTab]);

  useEffect(() => {
    setMobileOpen(false);
  }, [osMode, activeMetaTab, activeGoogleTab, activeSystemTab]);

  function switchOS(mode: OSMode) {
    setOsMode(mode);
    setActiveSystemTab(null);
  }

  function selectMeta(tab: MetaTab) {
    setOsMode("meta");
    setActiveMetaTab(tab);
    setActiveSystemTab(null);
  }

  function selectGoogle(tab: GoogleTab) {
    setOsMode("google");
    setActiveGoogleTab(tab);
    setActiveSystemTab(null);
  }

  function selectSettings() {
    setActiveSystemTab("settings");
  }

  return (
    <ThemeFrame>
      <div data-os-root="true" data-os-theme={isDark ? "dark" : "light"} className="metaos-app min-h-screen overflow-x-hidden">
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
                <div
                  className={
                    isGoogle
                      ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4285F4] via-[#34A853] to-[#FBBC05]"
                      : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A84FF]"
                  }
                >
                  {isGoogle ? (
                    <Search className="h-4.5 w-4.5 text-white" />
                  ) : (
                    <Zap className="h-4.5 w-4.5 fill-white text-white" />
                  )}
                </div>

                <div className="hidden min-w-0 sm:block">
                  <p
                    className={
                      isGoogle
                        ? "text-[12px] font-black uppercase tracking-[0.18em] text-emerald-300"
                        : "text-[12px] font-black uppercase tracking-[0.18em] text-[#0A84FF]"
                    }
                  >
                    {isGoogle ? "Google OS" : "Meta OS"}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-45">
                    Daily Performance OS
                  </p>
                </div>
              </div>

              <div className="ml-1 hidden rounded-xl border border-current/10 bg-current/[0.04] p-1 md:flex">
                <button
                  onClick={() => switchOS("meta")}
                  className={
                    osMode === "meta"
                      ? "rounded-lg bg-[#0A84FF] px-4 py-2 text-xs font-black text-white"
                      : "rounded-lg px-4 py-2 text-xs font-black opacity-55 hover:text-white"
                  }
                >
                  META OS
                </button>
                <button
                  onClick={() => switchOS("google")}
                  className={
                    osMode === "google"
                      ? "rounded-lg bg-emerald-400 px-4 py-2 text-xs font-black text-black"
                      : "rounded-lg px-4 py-2 text-xs font-black opacity-55 hover:text-white"
                  }
                >
                  GOOGLE OS
                </button>
              </div>

              <div className="min-w-0 flex-1" />

              <div className="hidden items-center gap-2 rounded-xl border border-current/10 bg-current/[0.04] px-3 py-2 lg:flex">
                <span className={isGoogle ? "h-2 w-2 rounded-full bg-emerald-400" : "h-2 w-2 rounded-full bg-[#0A84FF]"} />
                <span className="text-[11px] font-black uppercase tracking-[0.14em] opacity-60">
                  {isGoogle ? "BigQuery Live" : "Sheet Live"}
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
              <div className="flex rounded-xl border border-current/10 bg-current/[0.04] p-1 md:hidden">
                <button
                  onClick={() => switchOS("meta")}
                  className={
                    osMode === "meta"
                      ? "rounded-lg bg-[#0A84FF] px-3 py-1.5 text-[11px] font-black text-white"
                      : "rounded-lg px-3 py-1.5 text-[11px] font-black opacity-45"
                  }
                >
                  META
                </button>
                <button
                  onClick={() => switchOS("google")}
                  className={
                    osMode === "google"
                      ? "rounded-lg bg-emerald-400 px-3 py-1.5 text-[11px] font-black text-black"
                      : "rounded-lg px-3 py-1.5 text-[11px] font-black opacity-45"
                  }
                >
                  GOOGLE
                </button>
              </div>

              {activeNav.map((item) => {
                const Icon = item.icon;
                const active =
                  !activeSystemTab &&
                  (isGoogle ? activeGoogleTab === item.id : activeMetaTab === item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (isGoogle) selectGoogle(item.id as GoogleTab);
                      else selectMeta(item.id as MetaTab);
                    }}
                    className={
                      active
                        ? isGoogle
                          ? "inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-400 px-3 py-2 text-xs font-black text-black"
                          : "inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#0A84FF] px-3 py-2 text-xs font-black text-white"
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
                      isGoogle
                        ? "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4285F4] via-[#34A853] to-[#FBBC05]"
                        : "flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A84FF]"
                    }
                  >
                    {isGoogle ? <Search className="h-5 w-5" /> : <Zap className="h-5 w-5 fill-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-black">{isGoogle ? "Google OS" : "Meta OS"}</p>
                    <p className="text-xs opacity-45">Daily Performance OS</p>
                  </div>
                </div>

                <button
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-current/10 bg-current/[0.04]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl border border-current/10 bg-current/[0.04] p-1">
                <button
                  onClick={() => switchOS("meta")}
                  className={
                    osMode === "meta"
                      ? "rounded-lg bg-[#0A84FF] px-3 py-2 text-xs font-black text-white"
                      : "rounded-lg px-3 py-2 text-xs font-black opacity-55"
                  }
                >
                  META OS
                </button>
                <button
                  onClick={() => switchOS("google")}
                  className={
                    osMode === "google"
                      ? "rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black text-black"
                      : "rounded-lg px-3 py-2 text-xs font-black opacity-55"
                  }
                >
                  GOOGLE OS
                </button>
              </div>

              <div className="mt-5 grid gap-2">
                {activeNav.map((item) => {
                  const Icon = item.icon;
                  const active =
                    !activeSystemTab &&
                    (isGoogle ? activeGoogleTab === item.id : activeMetaTab === item.id);

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (isGoogle) selectGoogle(item.id as GoogleTab);
                        else selectMeta(item.id as MetaTab);
                      }}
                      className={
                        active
                          ? isGoogle
                            ? "grid grid-cols-[20px_1fr] gap-3 rounded-xl bg-emerald-400 px-4 py-3 text-left text-black"
                            : "grid grid-cols-[20px_1fr] gap-3 rounded-xl bg-[#0A84FF] px-4 py-3 text-left text-white"
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
            <section className={isDark ? "mb-3 rounded-xl border border-current/10 bg-current/[0.035] px-4 py-3" : "mb-3 rounded-xl border border-black/10 bg-white px-4 py-3"}>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={
                        isGoogle
                          ? "rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300"
                          : "rounded-full border border-[#0A84FF]/25 bg-[#0A84FF]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#0A84FF]"
                      }
                    >
                      {isGoogle ? "Google Ads" : "Meta Ads"}
                    </span>
                    <span className="rounded-full border border-current/10 bg-current/[0.035] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] opacity-45">
                      {isGoogle ? "BigQuery Live" : "Sheet Live"}
                    </span>
                  </div>

                  <h1 className="mt-2 text-2xl font-black tracking-tight lg:text-3xl">
                    {activeSystemTab === "settings" ? "Settings" : isGoogle ? "Google OS" : "Meta OS"}
                  </h1>
                  <p className="mt-1 text-sm leading-5 opacity-60">
                    {activeTitle} · {activeDescription}
                  </p>
                </div>
              </div>
            </section>

            <div className="min-w-0 overflow-x-hidden">{children}</div>
          </div>
        </main>
      </div>
    </ThemeFrame>
  );
}
