"use client";

import { ReactNode } from "react";
import {
  ShieldAlert,
  BarChart3,
  Circle,
  FileText,
  LayoutDashboard,
  Settings,
  Sparkles,
  UploadCloud,
  Zap,
  Activity,
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

const navGroups: {
  title: string;
  items: { value: MetaTab; label: string; description: string; icon: any }[];
}[] = [
  {
    title: "Daily OS",
    items: [
      {
        value: "action_report",
        label: "Action Report",
        description: "Today’s exact pause, reduce, scale and refresh actions",
        icon: LayoutDashboard,
      },
      {
        value: "spend_visuals",
        label: "Spend Visuals",
        description: "Custom date charts for spend, CPA, ROAS and revenue",
        icon: BarChart3,
      },
      {
        value: "creative",
        label: "Creative Audit",
        description: "Creative diagnosis, winner angles and next briefs",
        icon: Sparkles,
      },
      {
        value: "structure_report",
        label: "Structure Report",
        description: "Campaign → ad set → ad level structure clarity",
        icon: Activity,
      },
      {
        value: "summary",
        label: "Team Summary",
        description: "Copy/export the daily action note",
        icon: FileText,
      },
    ],
  },
  {
    title: "Review",
    items: [
      {
        value: "monthly",
        label: "Monthly Report",
        description: "This month vs last month performance review",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        value: "upload",
        label: "Data Input",
        description: "Upload Meta export",
        icon: UploadCloud,
      },
      {
        value: "settings",
        label: "Settings",
        description: "Targets and decision thresholds",
        icon: Settings,
      },
    ],
  },
];

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

  const activeItem =
    navGroups.flatMap((g) => g.items).find((item) => item.value === activeTab) ||
    navGroups[0].items[0];

  return (
    <ThemeFrame>
      <div className="mx-auto grid max-w-[1600px] gap-6 px-5 py-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside
          className={
            isDark
              ? "sticky top-6 h-[calc(100vh-48px)] overflow-y-auto rounded-[32px] border border-white/10 bg-[#111318]/95 p-4 shadow-2xl backdrop-blur-xl"
              : "sticky top-6 h-[calc(100vh-48px)] overflow-y-auto rounded-[32px] border border-black/10 bg-white/95 p-4 shadow-xl backdrop-blur-xl"
          }
        >
          <div className="flex items-center gap-3 border-b border-current/10 pb-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0A84FF] text-white shadow-[0_0_30px_rgba(10,132,255,0.35)]">
              <Zap className="h-5 w-5 fill-white" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black uppercase tracking-[0.24em] text-[#0A84FF]">
                  MetaOS
                </h1>
                <span className="rounded-full border border-[#0A84FF]/30 bg-[#0A84FF]/10 px-2 py-0.5 text-[10px] font-black text-[#0A84FF]">
                  operator
                </span>
              </div>
              <p
                className={
                  isDark
                    ? "mt-1 text-[10px] uppercase tracking-[0.18em] text-white/35"
                    : "mt-1 text-[10px] uppercase tracking-[0.18em] text-black/42"
                }
              >
                Daily Performance OS
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3">
            <span
              className={
                isDark
                  ? "flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/60"
                  : "flex h-10 items-center gap-2 rounded-2xl border border-black/10 bg-black/[0.035] px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-black/58"
              }
            >
              <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
              Live-filtered
            </span>
            <ThemeToggle />
          </div>

          <nav className="mt-6 grid gap-6">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p
                  className={
                    isDark
                      ? "mb-2 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/32"
                      : "mb-2 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-black/40"
                  }
                >
                  {group.title}
                </p>

                <div className="grid gap-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.value;

                    return (
                      <button
                        key={item.value}
                        onClick={() => setActiveTab(item.value)}
                        className={
                          active
                            ? "flex w-full items-start gap-3 rounded-2xl border border-[#0A84FF]/40 bg-[#0A84FF] px-3 py-3 text-left text-white shadow-[0_0_22px_rgba(10,132,255,0.22)]"
                            : isDark
                            ? "flex w-full items-start gap-3 rounded-2xl border border-transparent px-3 py-3 text-left text-white/62 transition-all hover:bg-white/[0.06] hover:text-white"
                            : "flex w-full items-start gap-3 rounded-2xl border border-transparent px-3 py-3 text-left text-black/62 transition-all hover:bg-black/[0.045] hover:text-black"
                        }
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-sm font-black leading-none">
                            {item.label}
                          </span>
                          <span
                            className={
                              active
                                ? "mt-1 block text-[11px] leading-4 text-white/75"
                                : isDark
                                ? "mt-1 block text-[11px] leading-4 text-white/38"
                                : "mt-1 block text-[11px] leading-4 text-black/42"
                            }
                          >
                            {item.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          <TopCommandHeader activeItem={activeItem} />
          <div className="grid gap-6">{children}</div>
        </main>
      </div>
    </ThemeFrame>
  );
}

function TopCommandHeader({
  activeItem,
}: {
  activeItem: { label: string; description: string };
}) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <section
      className={
        isDark
          ? "mb-6 rounded-[34px] border border-white/10 bg-[#111318]/90 px-6 py-8 shadow-2xl backdrop-blur-xl"
          : "mb-6 rounded-[34px] border border-black/10 bg-white/94 px-6 py-8 shadow-xl backdrop-blur-xl"
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full border border-[#0A84FF]/30 bg-[#0A84FF]/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#0A84FF]">
          Meta Ads Intelligence
        </span>
        <span
          className={
            isDark
              ? "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white/55"
              : "inline-flex rounded-full border border-black/10 bg-black/[0.035] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-black/55"
          }
        >
          {activeItem.label}
        </span>
      </div>

      <h2 className="max-w-5xl text-4xl font-black tracking-tight md:text-5xl">
        Decide faster.
        <span className="block text-[#0A84FF]">Improve today.</span>
      </h2>

      <p
        className={
          isDark
            ? "mt-4 max-w-3xl text-sm leading-7 text-white/55 md:text-base"
            : "mt-4 max-w-3xl text-sm leading-7 text-black/58 md:text-base"
        }
      >
        {activeItem.description}. Recommendations are based only on ads with latest-day spend or impressions.
      </p>
    </section>
  );
}
