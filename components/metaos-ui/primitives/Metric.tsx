import type {
  ReactNode,
} from "react";

import { cn } from "@/lib/utils";

import type {
  MetaOSTone,
} from "@/lib/metaos-ui/themeContract";

export interface MetaOSMetricProps {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  change?: ReactNode;
  tone?: MetaOSTone;
  changeTone?: MetaOSTone;
  large?: boolean;
  className?: string;
}

function toneClass(
  tone: MetaOSTone,
  target: "value" | "change"
) {
  if (target === "value") {
    if (tone === "positive") {
      return "mos-metric__value--positive";
    }

    if (tone === "negative") {
      return "mos-metric__value--negative";
    }

    return "";
  }

  if (tone === "positive") {
    return "mos-metric__change--positive";
  }

  if (tone === "negative") {
    return "mos-metric__change--negative";
  }

  return "mos-metric__change--neutral";
}

export function MetaOSMetric({
  label,
  value,
  note,
  change,
  tone = "neutral",
  changeTone = "neutral",
  large = false,
  className,
}: MetaOSMetricProps) {
  return (
    <div
      className={cn(
        "mos-metric",
        className
      )}
    >
      <div className="mos-metric__header">
        <div className="mos-metric__label">
          {label}
        </div>

        {change !== undefined ? (
          <div
            className={cn(
              "mos-metric__change",
              toneClass(
                changeTone,
                "change"
              )
            )}
          >
            {change}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "mos-metric__value",
          large &&
            "mos-metric__value--large",
          toneClass(tone, "value")
        )}
      >
        {value}
      </div>

      {note !== undefined ? (
        <div className="mos-metric__note">
          {note}
        </div>
      ) : null}
    </div>
  );
}
