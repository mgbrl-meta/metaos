import type {
  HTMLAttributes,
  ReactNode,
} from "react";

import { cx } from "@/lib/metaos-ui/cx";

export type BadgeTone =
  | "neutral"
  | "positive"
  | "negative"
  | "warning"
  | "inverse";

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: ReactNode;
  dot?: boolean;
}

export function Badge({
  className,
  children,
  tone = "neutral",
  icon,
  dot = false,
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={cx(
        "mos-badge",
        `is-${tone}`,
        className
      )}
    >
      {dot ? (
        <span
          className="mos-badge-dot"
          aria-hidden="true"
        />
      ) : null}

      {icon ? (
        <span
          className="mos-badge-icon"
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}

      {children}
    </span>
  );
}
