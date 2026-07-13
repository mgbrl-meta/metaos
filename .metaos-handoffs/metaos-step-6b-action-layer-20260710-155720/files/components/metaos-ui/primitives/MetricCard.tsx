import type {
  ReactNode,
} from "react";

import { cx } from "@/lib/metaos-ui/cx";

export type MetricTone =
  | "neutral"
  | "positive"
  | "negative"
  | "warning";

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  icon?: ReactNode;
  tone?: MetricTone;
  compact?: boolean;
}

export function MetricCard({
  label,
  value,
  note,
  icon,
  tone = "neutral",
  compact = false,
}: MetricCardProps) {
  return (
    <article
      className={cx(
        "mos-metric-card",
        `is-${tone}`,
        compact && "is-compact"
      )}
    >
      <div className="mos-metric-card-top">
        <span className="mos-label">
          {label}
        </span>

        {icon ? (
          <span
            className="mos-metric-card-icon"
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
      </div>

      <div className="mos-metric-card-value mos-number">
        {value}
      </div>

      {note ? (
        <div className="mos-metric-card-note">
          {note}
        </div>
      ) : null}
    </article>
  );
}
