"use client";

import { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: "dark",
      toggleTheme: () =>
        set({
          theme: get().theme === "dark" ? "light" : "dark",
        }),
    }),
    { name: "metaos-theme-v3" }
  )
);

export function ThemeFrame({ children }: { children: ReactNode }) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <div
      className={
        isDark
          ? "min-h-screen bg-[#08090b] text-white"
          : "min-h-screen bg-[#f6f7fb] text-[#111827]"
      }
      style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}
    >
      <div
        className={
          isDark
            ? "pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(10,132,255,0.16),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(34,197,94,0.08),transparent_26%),radial-gradient(circle_at_10%_55%,rgba(239,68,68,0.06),transparent_26%)]"
            : "pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(10,132,255,0.10),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(34,197,94,0.045),transparent_26%),radial-gradient(circle_at_10%_55%,rgba(239,68,68,0.035),transparent_26%)]"
        }
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className={
        isDark
          ? "inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-xs font-black uppercase tracking-[0.12em] text-white/80 transition hover:bg-white/[0.1]"
          : "inline-flex h-10 items-center gap-2 rounded-2xl border border-black/10 bg-black/[0.04] px-4 text-xs font-black uppercase tracking-[0.12em] text-black/70 transition hover:bg-black/[0.07]"
      }
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
