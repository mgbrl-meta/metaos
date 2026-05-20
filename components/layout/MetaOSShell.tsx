"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText,
  Grid2X2,
  LineChart,
  Menu,
  Settings,
  ShieldAlert,
  Sparkles,
  UploadCloud,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { ThemeFrame, ThemeToggle, useThemeStore } from "@/components/theme/ThemeProvider";

export type MetaTab =
  | "action_report"
  | "roi_leakage"
  | "spend_visuals"
  | "creative"
  | "structure_report"
  | "summary"
  | "monthly"
  | "upload"
  | "settings";

type NavItem = {
  id: MetaTab;
  label: string;
  description: string;
  group: "Daily OS" | "Review" | "System";
  icon: any;
};

const navItems: NavItem[] = [
  {
    id: "action_report",
    label: "Action Report",
    description: "Today’s exact pause, reduce, scale and refresh actions",
    group: "Daily OS",
    icon: Grid2X2,
  },
  {
    id: "roi_leakage",
    label: "ROI Leakage",
    description: "KPMG-style gaps, leakage and budget risk",
    group: "Daily OS",
    icon: ShieldAlert,
  },
  {
    id: "spend_visuals",
    label: "Spend Visuals",
    description: "Custom date charts for spend, CPA, ROAS and revenue",
    group: "Daily OS",
    icon: BarChart3,
  },
  {
    id: "creative",
    label: "Creative Audit",
    description: "Creative diagnosis, winner angles and next briefs",
    group: "Daily OS",
    icon: Sparkles,
  },
  {
    id: "structure_report",
    label: "Structure Report",
    description: "Campaign → ad set → ad level structure clarity",
    group: "Daily OS",
    icon: LineChart,
  },
  {
    id: "summary",
    label: "Team Summary",
    description: "Copy/export the daily action note",
    group: "Daily OS",
    icon: FileText,
  },
  {
    id: "monthly",
    label: "Monthly Report",
    description: "This month vs last month performance review",
    group: "Review",
    icon: BarChart3,
  },
  {
    id: "upload",
    label: "Data Input",
    description: "Upload Meta export",
    group: "System",
    icon: UploadCloud,
  },
  {
    id: "settings",
    label: "Settings",
    description: "Targets and decision thresholds",
    group: "System",
    icon: Settings,
  },
];

function groupedItems(group: NavItem["group"]) {
  return navItems.filter((item) => item.group === group);
}

export function MetaOSShell({
  activeTab,
  setActiveTab,
  children,
}: {
  activeTab: MetaTab;
  setActiveTab: (tab: MetaTab) => void;
  children: ReactNode;
}) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [activeTab]);

  return (
    <ThemeFrame>
      <div
        className={
          isDark
            ? "min-h-screen bg-[#050607] text-white"
            : "min-h-screen bg-[#f6f7f4] text-[#0b0c0f]"
        }
      >
        {/* Mobile Top Bar */}
        <div
          className={
            isDark
              ? "sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#080a0d]/90 px-4 backdrop-blur-2xl lg:hidden"
              : "sticky top-0 z-40 flex h-16 items-center justify-between border-b border-black/10 bg-white/90 px-4 backdrop-blur-2xl lg:hidden"
          }
        >
          <button
            onClick={() => setMobileOpen(true)}
            className={
              isDark
                ? "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                : "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03]"
            }
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#0A84FF] shadow-[0_0_30px_rgba(10,132,255,0.35)]">
              <Zap className="h-5 w-5 fill-white text-white" />
            </div>
            <div>
              <p className="text-sm font-black tracking-[0.24em] text-[#0A84FF]">METAOS</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-45">
                Daily Performance OS
              </p>
            </div>
          </div>

          <ThemeToggle />
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu overlay"
            />

            <aside
              className={
                isDark
                  ? "absolute left-0 top-0 h-full w-[86vw] max-w-[360px] overflow-y-auto border-r border-white/10 bg-[#0b0f14] p-4 shadow-2xl"
                  : "absolute left-0 top-0 h-full w-[86vw] max-w-[360px] overflow-y-auto border-r border-black/10 bg-white p-4 shadow-2xl"
              }
            >
              <div className="mb-5 flex items-center justify-between">
                <BrandBlock collapsed={false} />
                <button
                  onClick={() => setMobileOpen(false)}
                  className={
                    isDark
                      ? "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                      : "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03]"
                  }
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <StatusAndTheme collapsed={false} />

              <SidebarNav activeTab={activeTab} setActiveTab={setActiveTab} collapsed={false} />
            </aside>
          </div>
        )}

        {/* Desktop Sidebar */}
        <aside
          className={
            isDark
              ? `fixed left-6 top-6 z-30 hidden h-[calc(100vh-48px)] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0f14]/92 shadow-2xl backdrop-blur-2xl transition-all duration-300 lg:block ${
                  collapsed ? "w-[96px]" : "w-[330px]"
                }`
              : `fixed left-6 top-6 z-30 hidden h-[calc(100vh-48px)] overflow-hidden rounded-[2rem] border border-black/10 bg-white/92 shadow-2xl backdrop-blur-2xl transition-all duration-300 lg:block ${
                  collapsed ? "w-[96px]" : "w-[330px]"
                }`
          }
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <BrandBlock collapsed={collapsed} />

                {!collapsed && (
                  <button
                    onClick={() => setCollapsed(true)}
                    className={
                      isDark
                        ? "inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 hover:text-white"
                        : "inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-black/70 hover:text-black"
                    }
                    aria-label="Collapse sidebar"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
              </div>

              {collapsed ? (
                <button
                  onClick={() => setCollapsed(false)}
                  className={
                    isDark
                      ? "mt-5 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 hover:text-white"
                      : "mt-5 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-black/70 hover:text-black"
                  }
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <StatusAndTheme collapsed={false} />
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <SidebarNav activeTab={activeTab} setActiveTab={setActiveTab} collapsed={collapsed} />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main
          className={`min-w-0 transition-all duration-300 ${
            collapsed ? "lg:pl-[130px]" : "lg:pl-[370px]"
          }`}
        >
          <div className="mx-auto w-full max-w-[1680px] min-w-0 px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
            <div className="min-w-0 overflow-x-hidden">{children}</div>
          </div>
        </main>
      </div>
    </ThemeFrame>
  );
}

function BrandBlock({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={collapsed ? "flex w-full justify-center" : "flex items-center gap-3"}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.3rem] bg-[#0A84FF] shadow-[0_0_34px_rgba(10,132,255,0.38)]">
        <Zap className="h-6 w-6 fill-white text-white" />
      </div>

      {!collapsed && (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-base font-black tracking-[0.28em] text-[#0A84FF]">METAOS</p>
            <span className="rounded-full border border-[#0A84FF]/35 bg-[#0A84FF]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#0A84FF]">
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

function StatusAndTheme({ collapsed }: { collapsed: boolean }) {
  if (collapsed) return null;

  return (
    <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
      <div className="inline-flex h-11 items-center gap-2 rounded-2xl border border-current/10 bg-current/[0.035] px-3">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="text-xs font-black uppercase tracking-[0.14em] opacity-70">
          Live-filtered
        </span>
      </div>

      <ThemeToggle />
    </div>
  );
}

function SidebarNav({
  activeTab,
  setActiveTab,
  collapsed,
}: {
  activeTab: MetaTab;
  setActiveTab: (tab: MetaTab) => void;
  collapsed: boolean;
}) {
  return (
    <nav className="grid gap-7">
      {(["Daily OS", "Review", "System"] as const).map((group) => (
        <div key={group}>
          {!collapsed && (
            <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.22em] opacity-35">
              {group}
            </p>
          )}

          <div className="grid gap-1.5">
            {groupedItems(group).map((item) => (
              <SidebarButton
                key={item.id}
                item={item}
                active={activeTab === item.id}
                collapsed={collapsed}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarButton({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={
        active
          ? collapsed
            ? "flex h-12 w-full items-center justify-center rounded-2xl bg-[#0A84FF] text-white shadow-[0_14px_34px_rgba(10,132,255,0.32)]"
            : "grid w-full grid-cols-[24px_1fr] items-center gap-3 rounded-2xl bg-[#0A84FF] px-4 py-3 text-left text-white shadow-[0_14px_34px_rgba(10,132,255,0.32)]"
          : collapsed
          ? isDark
            ? "flex h-12 w-full items-center justify-center rounded-2xl text-white/62 hover:bg-white/[0.06] hover:text-white"
            : "flex h-12 w-full items-center justify-center rounded-2xl text-black/62 hover:bg-black/[0.05] hover:text-black"
          : isDark
          ? "grid w-full grid-cols-[24px_1fr] items-center gap-3 rounded-2xl px-4 py-3 text-left text-white/68 hover:bg-white/[0.06] hover:text-white"
          : "grid w-full grid-cols-[24px_1fr] items-center gap-3 rounded-2xl px-4 py-3 text-left text-black/68 hover:bg-black/[0.05] hover:text-black"
      }
    >
      <Icon className="h-4 w-4 shrink-0" />

      {!collapsed && (
        <span className="min-w-0">
          <span className="block text-sm font-black leading-5">{item.label}</span>
          <span className={active ? "mt-0.5 block text-[11px] leading-4 text-white/72" : "mt-0.5 block text-[11px] leading-4 opacity-52"}>
            {item.description}
          </span>
        </span>
      )}
    </button>
  );
}
