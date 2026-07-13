import type {
  HTMLAttributes,
  ReactNode,
} from "react";

import { cx } from "@/lib/metaos-ui/cx";

export type CardDensity =
  | "compact"
  | "regular";

export type CardTone =
  | "default"
  | "subtle"
  | "positive"
  | "negative"
  | "warning";

export interface CardProps
  extends HTMLAttributes<HTMLDivElement> {
  density?: CardDensity;
  tone?: CardTone;
}

export function Card({
  className,
  density = "regular",
  tone = "default",
  ...props
}: CardProps) {
  return (
    <section
      {...props}
      className={cx(
        "mos-card",
        `is-${density}`,
        `is-${tone}`,
        className
      )}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cx(
        "mos-card-header",
        className
      )}
    />
  );
}

export function CardHeaderText({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cx(
        "mos-card-header-text",
        className
      )}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      {...props}
      className={cx(
        "mos-card-title",
        className
      )}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      {...props}
      className={cx(
        "mos-card-description",
        className
      )}
    />
  );
}

export function CardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cx(
        "mos-card-body",
        className
      )}
    />
  );
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <footer
      {...props}
      className={cx(
        "mos-card-footer",
        className
      )}
    />
  );
}

export function CardAction({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mos-card-action">
      {children}
    </div>
  );
}
