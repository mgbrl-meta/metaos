import type {
  ComponentPropsWithoutRef,
  ElementType,
  ReactNode,
} from "react";

import { cn } from "@/lib/utils";

import type {
  MetaOSDensity,
  MetaOSTheme,
} from "@/lib/metaos-ui/themeContract";

type MetaOSThemeScopeProps<
  T extends ElementType
> = {
  as?: T;
  theme: MetaOSTheme;
  density?: MetaOSDensity;
  children: ReactNode;
  className?: string;
} & Omit<
  ComponentPropsWithoutRef<T>,
  | "as"
  | "children"
  | "className"
  | "color"
>;

export function MetaOSThemeScope<
  T extends ElementType = "div"
>({
  as,
  theme,
  density = "compact",
  children,
  className,
  ...props
}: MetaOSThemeScopeProps<T>) {
  const Component =
    as ?? "div";

  return (
    <Component
      className={cn(
        "metaos-ui",
        className
      )}
      data-metaos-theme={theme}
      data-metaos-density={density}
      {...props}
    >
      {children}
    </Component>
  );
}
