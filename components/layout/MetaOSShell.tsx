"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText,
  Grid2X2,
  Layers,
  LineChart,
  Menu,
  Search,
  RadioTower,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { ThemeFrame, ThemeToggle, useThemeStore } from "@/components/theme/ThemeProvider";

export type OSMode = "meta" | "google";

export type MetaTab =
  | "action_report"
  | "roi_gap"
  | "benchmark_audit"
  | "spend_visuals"
  | "creative"
  | "structure_report"
  | "summary"
  | "monthly"
  | "reach_frequency";

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
    id: "action_report",
    label: "Action Report",
    shortLabel: "Action",
    description: "Pause, reduce, scale and refresh actions",
    icon: Grid2X2,
  },
  {
    id: "roi_gap",
    label: "Efficiency Gaps",
    shortLabel: "Gaps",
    description: "Spend gaps, weak pockets and budget risk",
    icon: ShieldAlert,
  },
  {
    id: "benchmark_audit",
    label: "Performance Benchmark",
    shortLabel: "Benchmark",
    description: "Campaign, ad set and ad audit vs benchmark",
    icon: ShieldCheck,
  },
  {
    id: "reach_frequency",
    label: "Reach & Frequency",
    shortLabel: "Reach",
    description: "Reach, impressions, frequency and CPR",
    icon: RadioTower,
  },
  {
    id: "spend_visuals",
    label: "Spend Visuals",
    shortLabel: "Spend",
    description: "Spend, CPA, ROAS and trend analysis",
    icon: BarChart3,
  },
  {
    id: "creative",
    label: "Creative Audit",
    shortLabel: "Creative",
    description: "Creative diagnosis, winners and next briefs",
    icon: Sparkles,
  },
  {
    id: "structure_report",
    label: "Structure Report",
    shortLabel: "Structure",
    description: "Campaign → ad set → ad structure clarity",
    icon: Layers,
  },
  {
    id: "summary",
    label: "Team Summary",
    shortLabel: "Summary",
    description: "Daily execution report for team",
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
    description: "Negatives, exact keywords and query waste",
    icon: Search,
  },
  {
    id: "google_campaign_audit",
    label: "Campaign Audit",
    shortLabel: "Campaign",
    description: "Campaign-level spend and ROAS control",
    icon: BarChart3,
  },
  {
    id: "google_adgroup_audit",
    label: "Ad Group Audit",
    shortLabel: "Ad Group",
    description: "Ad-group efficiency and query quality",
    icon: Layers,
  },
  {
    id: "google_keyword_audit",
    label: "Keyword Audit",
    shortLabel: "Keywords",
    description: "Keyword pruning and exact-match scaling",
    icon: Sparkles,
  },
  {
    id: "google_ad_audit",
    label: "Ad Audit",
    shortLabel: "Ads",
    description: "RSA/ad copy and landing page match",
    icon: FileText,
  },
  {
    id: "google_team_summary",
    label: "Google Summary",
    shortLabel: "Summary",
    description: "Daily Google Ads action report",
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
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isGoogle = osMode === "google";
  const activeNav = osMode === "google" ? googleNav : metaNav;

  const activeTitle = useMemo(() => {
    if (activeSystemTab === "settings") return "Settings";
    if (osMode === "google") {
      return googleNav.find((item) => item.id === activeGoogleTab)?.label || "Google OS";
    }
    return metaNav.find((item) => item.id === activeMetaTab)?.label || "Meta OS";
  }, [activeSystemTab, osMode, activeMetaTab, activeGoogleTab]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [osMode, activeMetaTab, activeGoogleTab, activeSystemTab]);

  function activateMeta(tab: MetaTab) {
    setActiveMetaTab(tab);
    setActiveSystemTab(null);
    setOsMode("meta");
  }

  function activateGoogle(tab: GoogleTab) {
    setActiveGoogleTab(tab);
    setActiveSystemTab(null);
    setOsMode("google");
  }

  function activateSettings() {
    setActiveSystemTab("settings");
  }

  return (
    <ThemeFrame>
      <div
        className={
          isGoogle
            ? "min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#042416_0,#050706_34%,#020302_100%)] text-white"
            : isDark
            ? "min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#071a33_0,#050607_34%,#020203_100%)] text-white"
            : "min-h-screen overflow-x-hidden bg-[#f6f7f4] text-[#0b0c0f]"
        }
      >
        <DesktopSidebar
          osMode={osMode}
          setOsMode={(mode) => {
            setOsMode(mode);
            setActiveSystemTab(null);
          }}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          activeMetaTab={activeMetaTab}
          activeGoogleTab={activeGoogleTab}
          activeSystemTab={activeSystemTab}
          activateMeta={activateMeta}
          activateGoogle={activateGoogle}
          activateSettings={activateSettings}
        />

        <MobileHeader
          osMode={osMode}
          setOsMode={(mode) => {
            setOsMode(mode);
            setActiveSystemTab(null);
          }}
          activeTitle={activeTitle}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <MobileModuleNav
          osMode={osMode}
          activeNav={activeNav}
          activeMetaTab={activeMetaTab}
          activeGoogleTab={activeGoogleTab}
          activeSystemTab={activeSystemTab}
          activateMeta={activateMeta}
          activateGoogle={activateGoogle}
          activateSettings={activateSettings}
        />

        {mobileMenuOpen && (
          <MobileDrawer
            osMode={osMode}
            setOsMode={(mode) => {
              setOsMode(mode);
              setActiveSystemTab(null);
            }}
            activeMetaTab={activeMetaTab}
            activeGoogleTab={activeGoogleTab}
            activeSystemTab={activeSystemTab}
            activateMeta={activateMeta}
            activateGoogle={activateGoogle}
            activateSettings={activateSettings}
            setMobileMenuOpen={setMobileMenuOpen}
          />
        )}

        <main
          className={`min-w-0 transition-all duration-300 ${
            collapsed ? "lg:pl-[128px]" : "lg:pl-[376px]"
          }`}
        >
          <div className="mx-auto w-full max-w-[1680px] min-w-0 px-3 pb-24 pt-4 sm:px-5 lg:px-6 lg:py-6">
            <DesktopOSHeader
              osMode={osMode}
              activeSystemTab={activeSystemTab}
              activeTitle={activeTitle}
            />

            <div className="min-w-0 overflow-x-hidden lg:mt-6">{children}</div>
          </div>
        </main>
      </div>
    </ThemeFrame>
  );
}

function DesktopSidebar({
  osMode,
  setOsMode,
  collapsed,
  setCollapsed,
  activeMetaTab,
  activeGoogleTab,
  activeSystemTab,
  activateMeta,
  activateGoogle,
  activateSettings,
}: {
  osMode: OSMode;
  setOsMode: (mode: OSMode) => void;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  activeMetaTab: MetaTab;
  activeGoogleTab: GoogleTab;
  activeSystemTab: SystemTab | null;
  activateMeta: (tab: MetaTab) => void;
  activateGoogle: (tab: GoogleTab) => void;
  activateSettings: () => void;
}) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const isGoogle = osMode === "google";
  const activeNav = isGoogle ? googleNav : metaNav;

  return (
    <aside
      className={
        isGoogle
          ? `fixed left-5 top-5 z-30 hidden h-[calc(100vh-40px)] overflow-hidden rounded-[2rem] border border-emerald-400/15 bg-[#06100c]/92 shadow-2xl shadow-emerald-950/30 backdrop-blur-2xl transition-all duration-300 lg:block ${
              collapsed ? "w-[86px]" : "w-[326px]"
            }`
          : isDark
          ? `fixed left-5 top-5 z-30 hidden h-[calc(100vh-40px)] overflow-hidden rounded-[2rem] border border-white/10 bg-[#080d13]/92 shadow-2xl shadow-black/40 backdrop-blur-2xl transition-all duration-300 lg:block ${
              collapsed ? "w-[86px]" : "w-[326px]"
            }`
          : `fixed left-5 top-5 z-30 hidden h-[calc(100vh-40px)] overflow-hidden rounded-[2rem] border border-black/10 bg-white/92 shadow-2xl backdrop-blur-2xl transition-all duration-300 lg:block ${
              collapsed ? "w-[86px]" : "w-[326px]"
            }`
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 p-4">
          <div className="flex items-start justify-between gap-3">
            <BrandBlock osMode={osMode} collapsed={collapsed} />

            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-current/10 bg-current/[0.045] opacity-70 hover:opacity-100"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-current/10 bg-current/[0.045] opacity-70 hover:opacity-100"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <>
              <OSSwitcher osMode={osMode} setOsMode={setOsMode} />
              <StatusStrip osMode={osMode} />
            </>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <SectionTitle collapsed={collapsed} label={isGoogle ? "Google OS" : "Meta OS"} />

          <div className="grid gap-1.5">
            {activeNav.map((item) => (
              <SidebarButton
                key={item.id}
                item={item}
                osMode={osMode}
                collapsed={collapsed}
                active={
                  !activeSystemTab &&
                  (isGoogle ? activeGoogleTab === item.id : activeMetaTab === item.id)
                }
                onClick={() => {
                  if (isGoogle) activateGoogle(item.id as GoogleTab);
                  else activateMeta(item.id as MetaTab);
                }}
              />
            ))}
          </div>

          <div className="mt-7">
            <SectionTitle collapsed={collapsed} label="System" />

            <SidebarButton
              item={{
                id: "settings",
                label: "Settings",
                shortLabel: "Settings",
                description: "Targets and decision thresholds",
                icon: Settings,
              }}
              osMode={osMode}
              collapsed={collapsed}
              active={activeSystemTab === "settings"}
              onClick={activateSettings}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileHeader({
  osMode,
  setOsMode,
  activeTitle,
  setMobileMenuOpen,
}: {
  osMode: OSMode;
  setOsMode: (mode: OSMode) => void;
  activeTitle: string;
  setMobileMenuOpen: (value: boolean) => void;
}) {
  const isGoogle = osMode === "google";

  return (
    <header
      className={
        isGoogle
          ? "sticky top-0 z-40 border-b border-emerald-400/15 bg-[#06100c]/90 px-3 py-3 backdrop-blur-2xl lg:hidden"
          : "sticky top-0 z-40 border-b border-white/10 bg-[#080b0f]/90 px-3 py-3 text-white backdrop-blur-2xl lg:hidden"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={
              isGoogle
                ? "text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300"
                : "text-[11px] font-black uppercase tracking-[0.22em] text-[#0A84FF]"
            }
          >
            {isGoogle ? "Google OS" : "Meta OS"}
          </p>
          <h1 className="mt-0.5 truncate text-base font-black text-white">{activeTitle}</h1>
        </div>

        <ThemeToggle />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
        <button
          onClick={() => setOsMode("meta")}
          className={
            osMode === "meta"
              ? "rounded-xl bg-[#0A84FF] px-3 py-2 text-xs font-black text-white"
              : "rounded-xl px-3 py-2 text-xs font-black text-white/50"
          }
        >
          META
        </button>

        <button
          onClick={() => setOsMode("google")}
          className={
            osMode === "google"
              ? "rounded-xl bg-emerald-400 px-3 py-2 text-xs font-black text-black"
              : "rounded-xl px-3 py-2 text-xs font-black text-white/50"
          }
        >
          GOOGLE
        </button>
      </div>
    </header>
  );
}

function MobileModuleNav({
  osMode,
  activeNav,
  activeMetaTab,
  activeGoogleTab,
  activeSystemTab,
  activateMeta,
  activateGoogle,
  activateSettings,
}: {
  osMode: OSMode;
  activeNav: NavItem<any>[];
  activeMetaTab: MetaTab;
  activeGoogleTab: GoogleTab;
  activeSystemTab: SystemTab | null;
  activateMeta: (tab: MetaTab) => void;
  activateGoogle: (tab: GoogleTab) => void;
  activateSettings: () => void;
}) {
  const isGoogle = osMode === "google";

  return (
    <div
      className={
        isGoogle
          ? "sticky top-[116px] z-30 overflow-x-auto border-b border-emerald-400/10 bg-[#06100c]/88 px-3 py-2 backdrop-blur-2xl lg:hidden"
          : "sticky top-[116px] z-30 overflow-x-auto border-b border-white/10 bg-[#080b0f]/88 px-3 py-2 text-white backdrop-blur-2xl lg:hidden"
      }
    >
      <div className="flex min-w-max gap-2">
        {activeNav.map((item) => {
          const Icon = item.icon;
          const active =
            !activeSystemTab &&
            (osMode === "google" ? activeGoogleTab === item.id : activeMetaTab === item.id);

          return (
            <button
              key={item.id}
              onClick={() => {
                if (osMode === "google") activateGoogle(item.id as GoogleTab);
                else activateMeta(item.id as MetaTab);
              }}
              className={
                active
                  ? isGoogle
                    ? "inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-black"
                    : "inline-flex items-center gap-2 rounded-full bg-[#0A84FF] px-4 py-2 text-xs font-black text-white"
                  : "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-white/60"
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {item.shortLabel}
            </button>
          );
        })}

        <button
          onClick={activateSettings}
          className={
            activeSystemTab === "settings"
              ? "inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-black"
              : "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-white/60"
          }
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </button>
      </div>
    </div>
  );
}

function MobileDrawer({
  osMode,
  setOsMode,
  activeMetaTab,
  activeGoogleTab,
  activeSystemTab,
  activateMeta,
  activateGoogle,
  activateSettings,
  setMobileMenuOpen,
}: {
  osMode: OSMode;
  setOsMode: (mode: OSMode) => void;
  activeMetaTab: MetaTab;
  activeGoogleTab: GoogleTab;
  activeSystemTab: SystemTab | null;
  activateMeta: (tab: MetaTab) => void;
  activateGoogle: (tab: GoogleTab) => void;
  activateSettings: () => void;
  setMobileMenuOpen: (value: boolean) => void;
}) {
  const isGoogle = osMode === "google";
  const activeNav = isGoogle ? googleNav : metaNav;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        onClick={() => setMobileMenuOpen(false)}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close overlay"
      />

      <aside
        className={
          isGoogle
            ? "absolute left-0 top-0 h-full w-[88vw] max-w-[380px] overflow-y-auto border-r border-emerald-400/15 bg-[#06100c] p-4 text-white shadow-2xl"
            : "absolute left-0 top-0 h-full w-[88vw] max-w-[380px] overflow-y-auto border-r border-white/10 bg-[#080b0f] p-4 text-white shadow-2xl"
        }
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <BrandBlock osMode={osMode} collapsed={false} />
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <OSSwitcher osMode={osMode} setOsMode={setOsMode} />

        <div className="mt-5">
          <SectionTitle collapsed={false} label={isGoogle ? "Google OS" : "Meta OS"} />

          <div className="grid gap-2">
            {activeNav.map((item) => (
              <SidebarButton
                key={item.id}
                item={item}
                osMode={osMode}
                collapsed={false}
                active={
                  !activeSystemTab &&
                  (isGoogle ? activeGoogleTab === item.id : activeMetaTab === item.id)
                }
                onClick={() => {
                  if (isGoogle) activateGoogle(item.id as GoogleTab);
                  else activateMeta(item.id as MetaTab);
                }}
              />
            ))}
          </div>

          <div className="mt-7">
            <SectionTitle collapsed={false} label="System" />
            <SidebarButton
              item={{
                id: "settings",
                label: "Settings",
                shortLabel: "Settings",
                description: "Targets and decision thresholds",
                icon: Settings,
              }}
              osMode={osMode}
              collapsed={false}
              active={activeSystemTab === "settings"}
              onClick={activateSettings}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}

function DesktopOSHeader({
  osMode,
  activeSystemTab,
  activeTitle,
}: {
  osMode: OSMode;
  activeSystemTab: SystemTab | null;
  activeTitle: string;
}) {
  if (activeSystemTab === "settings") {
    return (
      <div className="mb-5 hidden rounded-[2rem] border border-current/10 bg-current/[0.03] p-5 lg:block">
        <p className="text-xs font-black uppercase tracking-[0.18em] opacity-45">System</p>
        <h1 className="mt-2 text-3xl font-black">Settings</h1>
      </div>
    );
  }

  if (osMode === "google") {
    return (
      <div className="mb-5 hidden rounded-[2rem] border border-emerald-400/15 bg-gradient-to-br from-[#111318] via-[#0d1015] to-[#07170f] p-5 shadow-2xl shadow-emerald-950/20 lg:block">
        <div className="flex flex-wrap gap-2">
          <Pill tone="blue">Google Ads</Pill>
          <Pill tone="green">BigQuery Connected</Pill>
          <Pill tone="yellow">Query Intelligence</Pill>
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-white">Google OS</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/55">
          {activeTitle}: daily waste control, query intelligence, keyword opportunities and budget efficiency.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-5 hidden rounded-[2rem] border border-current/10 bg-current/[0.03] p-5 lg:block">
      <div className="flex flex-wrap gap-2">
        <Pill tone="blue">Meta Ads</Pill>
        <Pill tone="neutral">Sheet Connected</Pill>
        <Pill tone="neutral">Yesterday-Led</Pill>
      </div>

      <h1 className="mt-4 text-3xl font-black tracking-tight">Meta OS</h1>
      <p className="mt-2 max-w-4xl text-sm leading-6 opacity-55">
        {activeTitle}: daily action engine for efficiency, creative, spend control and team execution.
      </p>
    </div>
  );
}

function BrandBlock({ osMode, collapsed }: { osMode: OSMode; collapsed: boolean }) {
  const isGoogle = osMode === "google";

  return (
    <div className={collapsed ? "flex w-full justify-center" : "flex min-w-0 items-center gap-3"}>
      <div
        className={
          isGoogle
            ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.3rem] bg-gradient-to-br from-[#4285F4] via-[#34A853] to-[#FBBC05] shadow-[0_0_34px_rgba(52,168,83,0.35)]"
            : "flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.3rem] bg-[#0A84FF] shadow-[0_0_34px_rgba(10,132,255,0.38)]"
        }
      >
        {isGoogle ? <Search className="h-6 w-6 text-white" /> : <Zap className="h-6 w-6 fill-white text-white" />}
      </div>

      {!collapsed && (
        <div className="min-w-0">
          <p
            className={
              isGoogle
                ? "whitespace-nowrap text-[15px] font-black tracking-[0.2em] text-emerald-300"
                : "whitespace-nowrap text-[15px] font-black tracking-[0.24em] text-[#0A84FF]"
            }
          >
            {isGoogle ? "GOOGLE OS" : "META OS"}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] opacity-45">
            Daily Performance OS
          </p>
        </div>
      )}
    </div>
  );
}

function OSSwitcher({
  osMode,
  setOsMode,
}: {
  osMode: OSMode;
  setOsMode: (mode: OSMode) => void;
}) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-current/10 bg-current/[0.035] p-1.5">
      <button
        onClick={() => setOsMode("meta")}
        className={
          osMode === "meta"
            ? "rounded-xl bg-[#0A84FF] px-3 py-2 text-xs font-black text-white"
            : "rounded-xl px-3 py-2 text-xs font-black opacity-55 hover:opacity-100"
        }
      >
        META OS
      </button>

      <button
        onClick={() => setOsMode("google")}
        className={
          osMode === "google"
            ? "rounded-xl bg-emerald-400 px-3 py-2 text-xs font-black text-black"
            : "rounded-xl px-3 py-2 text-xs font-black opacity-55 hover:opacity-100"
        }
      >
        GOOGLE OS
      </button>
    </div>
  );
}

function StatusStrip({ osMode }: { osMode: OSMode }) {
  const isGoogle = osMode === "google";

  return (
    <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
      <div className="inline-flex h-11 items-center gap-2 rounded-2xl border border-current/10 bg-current/[0.035] px-3">
        <span className={isGoogle ? "h-2 w-2 rounded-full bg-emerald-400" : "h-2 w-2 rounded-full bg-[#0A84FF]"} />
        <span className="text-xs font-black uppercase tracking-[0.14em] opacity-70">
          {isGoogle ? "BigQuery Live" : "Sheet Live"}
        </span>
      </div>

      <ThemeToggle />
    </div>
  );
}

function SectionTitle({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return null;

  return (
    <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.22em] opacity-35">
      {label}
    </p>
  );
}

function SidebarButton<T extends string>({
  item,
  active,
  collapsed,
  osMode,
  onClick,
}: {
  item: NavItem<T>;
  active: boolean;
  collapsed: boolean;
  osMode: OSMode;
  onClick: () => void;
}) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const Icon = item.icon;

  const activeClass =
    osMode === "google"
      ? "bg-emerald-400 text-black shadow-[0_14px_34px_rgba(52,168,83,0.22)]"
      : "bg-[#0A84FF] text-white shadow-[0_14px_34px_rgba(10,132,255,0.32)]";

  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={
        active
          ? collapsed
            ? `flex h-12 w-full items-center justify-center rounded-2xl ${activeClass}`
            : `grid w-full grid-cols-[24px_1fr] items-center gap-3 rounded-2xl px-4 py-3 text-left ${activeClass}`
          : collapsed
          ? isDark || osMode === "google"
            ? "flex h-12 w-full items-center justify-center rounded-2xl text-white/62 hover:bg-white/[0.06] hover:text-white"
            : "flex h-12 w-full items-center justify-center rounded-2xl text-black/62 hover:bg-black/[0.05] hover:text-black"
          : isDark || osMode === "google"
          ? "grid w-full grid-cols-[24px_1fr] items-center gap-3 rounded-2xl px-4 py-3 text-left text-white/68 hover:bg-white/[0.06] hover:text-white"
          : "grid w-full grid-cols-[24px_1fr] items-center gap-3 rounded-2xl px-4 py-3 text-left text-black/68 hover:bg-black/[0.05] hover:text-black"
      }
    >
      <Icon className="h-4 w-4 shrink-0" />

      {!collapsed && (
        <span className="min-w-0">
          <span className="block text-sm font-black leading-5">{item.label}</span>
          <span className={active ? "mt-0.5 block text-[11px] leading-4 opacity-72" : "mt-0.5 block text-[11px] leading-4 opacity-52"}>
            {item.description}
          </span>
        </span>
      )}
    </button>
  );
}

function Pill({ tone, children }: { tone: "blue" | "green" | "yellow" | "neutral"; children: ReactNode }) {
  const cls =
    tone === "blue"
      ? "border-[#0A84FF]/30 bg-[#0A84FF]/10 text-[#0A84FF]"
      : tone === "green"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
      : tone === "yellow"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : "border-current/10 bg-current/[0.04] opacity-60";

  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${cls}`}>
      {children}
    </span>
  );
}
