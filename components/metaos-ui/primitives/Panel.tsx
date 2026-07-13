import * as React from "react";

import {
  cva,
  type VariantProps,
} from "class-variance-authority";

import { cn } from "@/lib/utils";

const metaOSPanelVariants = cva(
  "mos-panel",
  {
    variants: {
      variant: {
        default: "",
        subtle:
          "mos-panel--subtle",
        raised:
          "mos-panel--raised",
        inverse:
          "mos-panel--inverse",
      },

      padding: {
        none: "",
        sm:
          "mos-panel--padded-sm",
        md:
          "mos-panel--padded-md",
        lg:
          "mos-panel--padded-lg",
      },
    },

    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  }
);

export interface MetaOSPanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<
      typeof metaOSPanelVariants
    > {}

export function MetaOSPanel({
  className,
  variant,
  padding,
  ...props
}: MetaOSPanelProps) {
  return (
    <div
      className={cn(
        metaOSPanelVariants({
          variant,
          padding,
        }),
        className
      )}
      {...props}
    />
  );
}
