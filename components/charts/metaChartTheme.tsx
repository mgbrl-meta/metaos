"use client";

import type { ReactNode } from "react";

export const META_CHART_THEME = {
  light: {
    axis: "#475569",
    axisStrong: "#0f172a",
    grid: "rgba(15, 23, 42, 0.10)",
    tooltipBg: "#0b0f14",
    tooltipBorder: "rgba(255,255,255,0.14)",
    tooltipText: "#ffffff",
    tooltipMuted: "rgba(255,255,255,0.72)",
  },
  dark: {
    axis: "#CBD5E1",
    axisStrong: "#F8FAFC",
    grid: "rgba(226, 232, 240, 0.13)",
    tooltipBg: "#0b0f14",
    tooltipBorder: "rgba(255,255,255,0.18)",
    tooltipText: "#ffffff",
    tooltipMuted: "rgba(255,255,255,0.72)",
  },
};

export function getMetaChartTheme() {
  if (typeof document !== "undefined" && document.documentElement.classList.contains("os-light")) {
    return META_CHART_THEME.light;
  }

  return META_CHART_THEME.dark;
}

export const metaAxisTick = {
  fontSize: 11,
  fill: "var(--meta-chart-axis)",
  fontWeight: 700,
};

export const metaAxisTickSmall = {
  fontSize: 10,
  fill: "var(--meta-chart-axis)",
  fontWeight: 700,
};

export const metaGridStroke = "var(--meta-chart-grid)";

export function MetaChartTooltipShell({
  title,
  children,
}: {
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="meta-chart-tooltip">
      {title ? <div className="meta-chart-tooltip-title">{title}</div> : null}
      <div className="meta-chart-tooltip-body">{children}</div>
    </div>
  );
}

export function MetaTooltipRow({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="meta-chart-tooltip-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
