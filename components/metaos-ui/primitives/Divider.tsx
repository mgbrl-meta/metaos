import type {
  HTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

export function MetaOSDivider({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "mos-divider",
        className
      )}
      {...props}
    />
  );
}
