"use client";

import type { ReactNode } from "react";
import {
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function MetaPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`metaos-kit-page ${className}`}>{children}</div>;
}

export function MetaSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`metaos-kit-section ${className}`}>{children}</section>;
}

export function MetaCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`metaos-kit-card ${className}`}>{children}</div>;
}

export function MetaTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div>
      {eyebrow ? <p className="metaos-kit-eyebrow">{eyebrow}</p> : null}
      <h1 className="metaos-kit-title">{title}</h1>
      {subtitle ? <p className="metaos-kit-subtitle">{subtitle}</p> : null}
    </div>
  );
}

export function MetaCardTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div>
      {eyebrow ? <p className="metaos-kit-card-eyebrow">{eyebrow}</p> : null}
      <h2 className="metaos-kit-card-title">{title}</h2>
      {subtitle ? <p className="metaos-kit-card-subtitle">{subtitle}</p> : null}
    </div>
  );
}

export function MetaKpiCard({
  label,
  value,
  tone = "neutral",
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "neutral" | "green" | "red" | "amber" | "blue";
}) {
  return (
    <div className="metaos-kit-kpi">
      <p className="metaos-kit-kpi-label">{label}</p>
      <p className={`metaos-kit-kpi-value metaos-kit-tone-${tone}`}>{value}</p>
    </div>
  );
}

export function MetaPill({
  children,
  active = false,
  tone = "neutral",
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  tone?: "neutral" | "green" | "red" | "amber" | "blue";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? "true" : "false"}
      className={`metaos-kit-pill metaos-kit-pill-${tone}`}
    >
      {children}
    </button>
  );
}

export function MetaTable({
  children,
  minWidth = 980,
}: {
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="metaos-kit-table-wrap">
      <table className="metaos-kit-table" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export const metaAxisTick = {
  fontSize: 11,
  fill: "var(--meta-chart-axis)",
  fontWeight: 750,
};

export const metaAxisTickSmall = {
  fontSize: 10,
  fill: "var(--meta-chart-axis)",
  fontWeight: 750,
};

export function MetaCartesianGrid(props: any) {
  return <CartesianGrid stroke="var(--meta-chart-grid)" strokeDasharray="3 3" {...props} />;
}

export function MetaXAxis(props: any) {
  return (
    <XAxis
      axisLine={false}
      tickLine={false}
      tick={metaAxisTick}
      {...props}
    />
  );
}

export function MetaYAxis(props: any) {
  return (
    <YAxis
      axisLine={false}
      tickLine={false}
      tick={metaAxisTick}
      {...props}
    />
  );
}

export function MetaChartTooltip({
  moneyKeys = [],
  percentKeys = [],
  multipleKeys = [],
}: {
  moneyKeys?: string[];
  percentKeys?: string[];
  multipleKeys?: string[];
}) {
  return (
    <Tooltip
      content={({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;

        return (
          <div className="metaos-kit-tooltip">
            <div className="metaos-kit-tooltip-title">{label}</div>

            <div className="metaos-kit-tooltip-body">
              {payload.map((item: any) => {
                const key = String(item.dataKey || item.name || "");
                const name = String(item.name || item.dataKey || "");
                const raw = Number(item.value || 0);

                let value = raw.toLocaleString("en-IN");

                if (moneyKeys.some((x) => key.toLowerCase().includes(x.toLowerCase()) || name.toLowerCase().includes(x.toLowerCase()))) {
                  value = `₹${Math.round(raw).toLocaleString("en-IN")}`;
                }

                if (percentKeys.some((x) => key.toLowerCase().includes(x.toLowerCase()) || name.toLowerCase().includes(x.toLowerCase()))) {
                  value = `${raw.toFixed(2)}%`;
                }

                if (multipleKeys.some((x) => key.toLowerCase().includes(x.toLowerCase()) || name.toLowerCase().includes(x.toLowerCase()))) {
                  value = `${raw.toFixed(2)}x`;
                }

                return (
                  <div key={`${key}-${name}`} className="metaos-kit-tooltip-row">
                    <span>{name}</span>
                    <strong>{value}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }}
    />
  );
}
