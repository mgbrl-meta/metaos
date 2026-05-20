"use client";

import { ReactNode, useEffect, useState } from "react";
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
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UploadCloud,
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
  | "monthly";

export type GoogleTab =
  | "google_search_terms"
  | "google_campaign_audit"
  | "google_adgroup_audit"
  | "google_keyword_audit"
  | "google_ad_audit"
  | "google_team_summary";

type SystemTab = "upload" | "settings";

type NavItem<T extends string> = {
  id: T;
  label: string;
  description: string;
  icon: any;
  disabled?: boolean;
};

const metaNav: NavItem<MetaTab>[] = [
  {
    id: "action_report",
    label: "Action Report",
    description: "Today’s exact pause, reduce, scale and refresh actions",
    icon: Grid2X2,
  },
  {
    id: "roi_gap",
    label: "Efficiency Gaps",
    description: "Spend gaps, weak pockets and budget risk",
    icon: ShieldAlert,
  },
  {
    id: "benchmark_audit",
    label: "Performance Benchmark",
    description: "Campaign, ad set and ad audit vs high benchmark",
    icon: ShieldCheck,
  },
  {
    id: "spend_visuals",
    label: "Spend Visuals",
    description: "Spend, CPA, ROAS and trend analysis",
    icon: BarChart3,
  },
  {
    id: "creative",
    label: "Creative Audit",
    description: "Creative diagnosis, winners and next briefs",
    icon: Sparkles,
  },
  {
    id: "structure_report",
    label: "Structure Report",
    description: "Campaign → ad set → ad structure clarity",
    icon: Layers,
  },
  {
    id: "summary",
    label: "Team Summary",
    description: "Daily execution report for team",
    icon: FileText,
  },
  {
    id: "monthly",
    label: "Monthly Report",
    description: "Monthly performance review",
    icon: LineChart,
  },
];

const googleNav: NavItem<GoogleTab>[] = [
  {
    id: "google_search_terms",
    label: "Search Term Audit",
    description: "Negatives, exact keywords and query waste",
    icon: Search,
  },
  {
    id: "google_campaign_audit",
    label: "Campaign Audit",
    description: "Campaign-level spend and ROAS control",
    icon: BarChart3,
    disabled: true,
  },
  {
    id: "google_adgroup_audit",
    label: "Ad Group Audit",
    description: "Ad-group efficiency and query quality",
    icon: Layers,
    disabled: true,
  },
  {
    id: "google_keyword_audit",
    label: "Keyword Audit",
    description: "Keyword pruning and exact-match scaling",
    icon: Sparkles,
    disabled: true,
  },
  {
    id: "google_ad_audit",
    label: "Ad Audit",
    description: "RSA/ad copy and landing page match",
    icon: FileText,
    disabled: true,
  },
  {
    id: "google_team_summary",
    label: "Google Summary",
    description: "Daily Google Ads action report",
    icon: ShieldCheck,
    disabled: true,
  },
];

const systemNav: NavItem<SystemTab>[] = [
  {
    id: "upload",
    label: "Data Input",
    description: "Upload Meta export",
    icon: UploadCloud,
  },
  {
    id: "settings",
    label: "Settings",
    description: "Targets and decision thresholds",
    icon: Settings,
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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [osMode, activeMetaTab, activeGoogleTab, activeSystemTab]);

  const isGoogle = osMode === "google";

  return (
    <ThemeFrame>
      <div
        className={
          isGoogle
            ? "min-h-screen bg-[#070b08] text-white"
            : isDark
            ? "min-h-screen bg-[#050607] text-white"
            : "min-h-screen bg-[#f6f7f4] text-[#0b0c0f]"
        }
      >
        <MobileTopBar
          osMode={osMode}
          setMobileOpen={setMobileOpen}
          isDark={isDark}
        />

        {mobileOpen && (
          <MobileDrawer
            osMode={osMode}
            setOsMode={setOsMode}
            activeMetaTab={activeMetaTab}
            setActiveMetaTab={setActiveMetaTab}
            activeGoogleTab={activeGoogleTab}
            setActiveGoogleTab={setActiveGoogleTab}
            activeSystemTab={activeSystemTab}
            setActiveSystemTab={setActiveSystemTab}
            setMobileOpen={setMobileOpen}
            isDark={isDark}
          />
        )}

        <aside
          className={
            isGoogle
              ? `fixed left-6 top-6 z-30 hidden h-[calc(100vh-48px)] overflow-hidden rounded-[2rem] border border-emerald-400/15 bg-[#0b1110]/94 shadow-2xl backdrop-blur-2xl transition-all duration-300 lg:block ${
                  collapsed ? "w-[96px]" : "w-[340px]"
                }`
              : isDark
              ? `fixed left-6 top-6 z-30 hidden h-[calc(100vh-48px)] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0f14]/92 shadow-2xl backdrop-blur-2xl transition-all duration-300 lg:block ${
                  collapsed ? "w-[96px]" : "w-[340px]"
                }`
              : `fixed left-6 top-6 z-30 hidden h-[calc(100vh-48px)] overflow-hidden rounded-[2rem] border border-black/10 bg-white/92 shadow-2xl backdrop-blur-2xl transition-all duration-300 lg:block ${
                  collapsed ? "w-[96px]" : "w-[340px]"
                }`
          }
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <BrandBlock collapsed={collapsed} osMode={osMode} />

                {!collapsed && (
                  <button
                    onClick={() => setCollapsed(true)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-current/10 bg-current/[0.04] opacity-70 hover:opacity-100"
                    aria-label="Collapse sidebar"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
              </div>

              {collapsed ? (
                <button
                  onClick={() => setCollapsed(false)}
                  className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-current/10 bg-current/[0.04] opacity-70 hover:opacity-100"
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <>
                  <OSSwitcher osMode={osMode} setOsMode={setOsMode} />
                  <StatusAndTheme osMode={osMode} />
                </>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <SidebarNav
                collapsed={collapsed}
                osMode={osMode}
                activeMetaTab={activeMetaTab}
                setActiveMetaTab={setActiveMetaTab}
                activeGoogleTab={activeGoogleTab}
                setActiveGoogleTab={setActiveGoogleTab}
                activeSystemTab={activeSystemTab}
                setActiveSystemTab={setActiveSystemTab}
              />
            </div>
          </div>
        </aside>

        <main
          className={`min-w-0 transition-all duration-300 ${
            collapsed ? "lg:pl-[138px]" : "lg:pl-[390px]"
          }`}
        >
          <div className="mx-auto w-full max-w-[1800px] min-w-0 px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
            <OSHeader osMode={osMode} activeSystemTab={activeSystemTab} />
            <div className="mt-6 min-w-0 overflow-x-hidden">{children}</div>
          </div>
        </main>
      </div>
    </ThemeFrame>
  );
}

function MobileTopBar({
  osMode,
  setMobileOpen,
  isDark,
}: {
  osMode: OSMode;
  setMobileOpen: (open: boolean) => void;
  isDark: boolean;
}) {
  return (
    <div
      className={
        osMode === "google"
          ? "sticky top-0 z-40 flex h-16 items-center justify-between border-b border-emerald-400/15 bg-[#07100c]/90 px-4 backdrop-blur-2xl lg:hidden"
          : isDark
          ? "sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#080a0d]/90 px-4 backdrop-blur-2xl lg:hidden"
          : "sticky top-0 z-40 flex h-16 items-center justify-between border-b border-black/10 bg-white/90 px-4 backdrop-blur-2xl lg:hidden"
      }
    >
      <button
        onClick={() => setMobileOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-current/10 bg-current/[0.04]"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <BrandBlock collapsed={false} osMode={osMode} />

      <ThemeToggle />
    </div>
  );
}

function MobileDrawer({
  osMode,
  setOsMode,
  activeMetaTab,
  setActiveMetaTab,
  activeGoogleTab,
  setActiveGoogleTab,
  activeSystemTab,
  setActiveSystemTab,
  setMobileOpen,
  isDark,
}: {
  osMode: OSMode;
  setOsMode: (mode: OSMode) => void;
  activeMetaTab: MetaTab;
  setActiveMetaTab: (tab: MetaTab) => void;
  activeGoogleTab: GoogleTab;
  setActiveGoogleTab: (tab: GoogleTab) => void;
  activeSystemTab: SystemTab | null;
  setActiveSystemTab: (tab: SystemTab | null) => void;
  setMobileOpen: (open: boolean) => void;
  isDark: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setMobileOpen(false)}
        aria-label="Close menu overlay"
      />

      <aside
        className={
          osMode === "google"
            ? "absolute left-0 top-0 h-full w-[88vw] max-w-[370px] overflow-y-auto border-r border-emerald-400/15 bg-[#07100c] p-4 shadow-2xl"
            : isDark
            ? "absolute left-0 top-0 h-full w-[88vw] max-w-[370px] overflow-y-auto border-r border-white/10 bg-[#0b0f14] p-4 shadow-2xl"
            : "absolute left-0 top-0 h-full w-[88vw] max-w-[370px] overflow-y-auto border-r border-black/10 bg-white p-4 shadow-2xl"
        }
      >
        <div className="mb-5 flex items-center justify-between">
          <BrandBlock collapsed={false} osMode={osMode} />
          <button
            onClick={() => setMobileOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-current/10 bg-current/[0.04]"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <OSSwitcher osMode={osMode} setOsMode={setOsMode} />

        <div className="mt-5">
          <SidebarNav
            collapsed={false}
            osMode={osMode}
            activeMetaTab={activeMetaTab}
            setActiveMetaTab={setActiveMetaTab}
            activeGoogleTab={activeGoogleTab}
            setActiveGoogleTab={setActiveGoogleTab}
            activeSystemTab={activeSystemTab}
            setActiveSystemTab={setActiveSystemTab}
          />
        </div>
      </aside>
    </div>
  );
}

function BrandBlock({ collapsed, osMode }: { collapsed: boolean; osMode: OSMode }) {
  const isGoogle = osMode === "google";

  return (
    <div className={collapsed ? "flex w-full justify-center" : "flex items-center gap-3"}>
      <div
        className={
          isGoogle
            ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.3rem] bg-gradient-to-br from-[#4285F4] via-[#34A853] to-[#FBBC05] shadow-[0_0_34px_rgba(52,168,83,0.35)]"
            : "flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.3rem] bg-[#0A84FF] shadow-[0_0_34px_rgba(10,132,255,0.38)]"
        }
      >
        {isGoogle ? (
          <Search className="h-6 w-6 text-white" />
        ) : (
          <Zap className="h-6 w-6 fill-white text-white" />
        )}
      </div>

      {!collapsed && (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={
                isGoogle
                  ? "text-base font-black tracking-[0.22em] text-emerald-300"
                  : "text-base font-black tracking-[0.28em] text-[#0A84FF]"
              }
            >
              {isGoogle ? "GOOGLE OS" : "META OS"}
            </p>
            <span className="rounded-full border border-current/20 bg-current/[0.08] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] opacity-70">
              operator
            </span>
          </div>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.24em] opacity-45">
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

function StatusAndTheme({ osMode }: { osMode: OSMode }) {
  return (
    <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
      <div className="inline-flex h-11 items-center gap-2 rounded-2xl border border-current/10 bg-current/[0.035] px-3">
        <span
          className={
            osMode === "google"
              ? "h-2 w-2 rounded-full bg-emerald-400"
              : "h-2 w-2 rounded-full bg-[#0A84FF]"
          }
        />
        <span className="text-xs font-black uppercase tracking-[0.14em] opacity-70">
          {osMode === "google" ? "BigQuery Live" : "Live-filtered"}
        </span>
      </div>

      <ThemeToggle />
    </div>
  );
}

function SidebarNav({
  collapsed,
  osMode,
  activeMetaTab,
  setActiveMetaTab,
  activeGoogleTab,
  setActiveGoogleTab,
  activeSystemTab,
  setActiveSystemTab,
}: {
  collapsed: boolean;
  osMode: OSMode;
  activeMetaTab: MetaTab;
  setActiveMetaTab: (tab: MetaTab) => void;
  activeGoogleTab: GoogleTab;
  setActiveGoogleTab: (tab: GoogleTab) => void;
  activeSystemTab: SystemTab | null;
  setActiveSystemTab: (tab: SystemTab | null) => void;
}) {
  return (
    <nav className="grid gap-7">
      <div>
        {!collapsed && (
          <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.22em] opacity-35">
            {osMode === "google" ? "Google OS" : "Meta OS"}
          </p>
        )}

        <div className="grid gap-1.5">
          {osMode === "google"
            ? googleNav.map((item) => (
                <SidebarButton
                  key={item.id}
                  item={item}
                  active={!activeSystemTab && activeGoogleTab === item.id}
                  collapsed={collapsed}
                  osMode={osMode}
                  onClick={() => {
                    if (item.disabled) return;
                    setActiveGoogleTab(item.id);
                    setActiveSystemTab(null);
                  }}
                />
              ))
            : metaNav.map((item) => (
                <SidebarButton
                  key={item.id}
                  item={item}
                  active={!activeSystemTab && activeMetaTab === item.id}
                  collapsed={collapsed}
                  osMode={osMode}
                  onClick={() => {
                    setActiveMetaTab(item.id);
                    setActiveSystemTab(null);
                  }}
                />
              ))}
        </div>
      </div>

      <div>
        {!collapsed && (
          <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.22em] opacity-35">
            System
          </p>
        )}

        <div className="grid gap-1.5">
          {systemNav.map((item) => (
            <SidebarButton
              key={item.id}
              item={item}
              active={activeSystemTab === item.id}
              collapsed={collapsed}
              osMode={osMode}
              onClick={() => setActiveSystemTab(item.id)}
            />
          ))}
        </div>
      </div>
    </nav>
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
      disabled={item.disabled}
      title={collapsed ? item.label : undefined}
      className={
        item.disabled
          ? collapsed
            ? "flex h-12 w-full cursor-not-allowed items-center justify-center rounded-2xl opacity-25"
            : "grid w-full cursor-not-allowed grid-cols-[24px_1fr] items-center gap-3 rounded-2xl px-4 py-3 text-left opacity-25"
          : active
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
          <span
            className={
              active
                ? osMode === "google"
                  ? "mt-0.5 block text-[11px] leading-4 text-black/60"
                  : "mt-0.5 block text-[11px] leading-4 text-white/72"
                : "mt-0.5 block text-[11px] leading-4 opacity-52"
            }
          >
            {item.description}
          </span>
        </span>
      )}
    </button>
  );
}

function OSHeader({
  osMode,
  activeSystemTab,
}: {
  osMode: OSMode;
  activeSystemTab: SystemTab | null;
}) {
  if (activeSystemTab) {
    return (
      <div className="rounded-[2rem] border border-current/10 bg-current/[0.025] p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] opacity-45">
          System
        </p>
        <h1 className="mt-2 text-3xl font-black">
          {activeSystemTab === "upload" ? "Data Input" : "Settings"}
        </h1>
      </div>
    );
  }

  if (osMode === "google") {
    return (
      <div className="rounded-[2rem] border border-emerald-400/15 bg-gradient-to-br from-[#111318] via-[#0d1015] to-[#07170f] p-5 shadow-2xl">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-blue-300">
            Google Ads
          </span>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-300">
            BigQuery Connected
          </span>
          <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-yellow-300">
            Query Intelligence
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-white">
          Google OS
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/55">
          Search term, campaign, ad group, keyword and ad intelligence from BigQuery. Built for daily negatives, exact keyword promotion and waste control.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-current/10 bg-current/[0.025] p-5">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-[#0A84FF]/30 bg-[#0A84FF]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#0A84FF]">
          Meta Ads
        </span>
        <span className="rounded-full border border-current/10 bg-current/[0.04] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] opacity-60">
          Live Ads Only
        </span>
        <span className="rounded-full border border-current/10 bg-current/[0.04] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] opacity-60">
          Yesterday-Led
        </span>
      </div>

      <h1 className="mt-4 text-3xl font-black tracking-tight">Meta OS</h1>

      <p className="mt-2 max-w-4xl text-sm leading-6 opacity-55">
        Daily action engine for Meta account efficiency: pause, reduce, protect, scale, benchmark, creative and team execution.
      </p>
    </div>
  );
}
