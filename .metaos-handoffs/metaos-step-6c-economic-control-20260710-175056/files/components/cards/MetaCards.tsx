"use client";

import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useThemeStore } from "@/components/theme/ThemeProvider";

export function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <div
      className={
        isDark
          ? `rounded-[28px] border border-white/10 bg-[#111318]/90 shadow-2xl backdrop-blur-xl ${className}`
          : `rounded-[28px] border border-black/10 bg-white/92 shadow-xl backdrop-blur-xl ${className}`
      }
    >
      {children}
    </div>
  );
}

export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <div
      className={
        isDark
          ? `rounded-2xl border border-white/10 bg-white/[0.045] ${className}`
          : `rounded-2xl border border-black/10 bg-black/[0.035] ${className}`
      }
    >
      {children}
    </div>
  );
}

export function MutedText({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { theme } = useThemeStore();

  return (
    <p className={theme === "dark" ? `text-white/55 ${className}` : `text-black/58 ${className}`}>
      {children}
    </p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0A84FF]">{eyebrow}</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">{title}</h1>
      <MutedText className="mt-2 max-w-5xl">{description}</MutedText>
    </div>
  );
}

export function MetaButton({
  children,
  onClick,
  variant = "secondary",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const base = "inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-black transition";

  const cls =
    variant === "primary"
      ? "bg-[#0A84FF] text-white hover:bg-[#2563EB]"
      : variant === "danger"
      ? "border border-red-400/30 bg-red-400/10 text-red-400 hover:bg-red-400/15"
      : isDark
      ? "border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.1]"
      : "border border-black/15 bg-black/[0.04] text-black hover:bg-black/[0.08]";

  return (
    <button onClick={onClick} className={`${base} ${cls} ${className}`}>
      {children}
    </button>
  );
}

export function MetricCard({
  label,
  value,
  tone = "neutral",
  note,
}: {
  label: string;
  value: string;
  tone?: "green" | "red" | "yellow" | "blue" | "neutral";
  note?: string;
}) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const toneClass =
    tone === "green"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
      : tone === "red"
      ? "border-red-400/30 bg-red-400/10 text-red-400"
      : tone === "yellow"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
      : tone === "blue"
      ? "border-[#0A84FF]/30 bg-[#0A84FF]/10 text-[#0A84FF]"
      : isDark
      ? "border-white/15 bg-white/[0.06] text-white/70"
      : "border-black/15 bg-black/[0.04] text-black/60";

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={isDark ? "text-[11px] font-black uppercase tracking-[0.16em] text-white/38" : "text-[11px] font-black uppercase tracking-[0.16em] text-black/42"}>
            {label}
          </p>
          <p className={isDark ? "mt-3 text-3xl font-black tracking-tight text-white" : "mt-3 text-3xl font-black tracking-tight text-black"}>
            {value}
          </p>
          {note && <p className={isDark ? "mt-2 text-xs text-white/45" : "mt-2 text-xs text-black/48"}>{note}</p>}
        </div>

        <div className={`rounded-xl border p-2 ${toneClass}`}>
          {tone === "green" || tone === "blue" ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : tone === "red" ? (
            <ArrowDownRight className="h-4 w-4" />
          ) : (
            <Minus className="h-4 w-4" />
          )}
        </div>
      </div>
    </GlassCard>
  );
}

export function TonePill({
  tone,
  children,
}: {
  tone: "green" | "red" | "yellow" | "blue" | "neutral";
  children: ReactNode;
}) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const cls =
    tone === "green"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
      : tone === "red"
      ? "border-red-400/30 bg-red-400/10 text-red-400"
      : tone === "yellow"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
      : tone === "blue"
      ? "border-[#0A84FF]/30 bg-[#0A84FF]/10 text-[#0A84FF]"
      : isDark
      ? "border-white/15 bg-white/[0.06] text-white/62"
      : "border-black/15 bg-black/[0.04] text-black/58";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.11em] ${cls}`}>
      {children}
    </span>
  );
}
