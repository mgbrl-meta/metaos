"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { LoaderCircle } from "lucide-react";

import { cx } from "@/lib/metaos-ui/cx";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "positive"
  | "danger";

export type ButtonSize =
  | "xs"
  | "sm"
  | "md";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button =
  forwardRef<HTMLButtonElement, ButtonProps>(
    function Button(
      {
        className,
        children,
        variant = "secondary",
        size = "sm",
        loading = false,
        fullWidth = false,
        leadingIcon,
        trailingIcon,
        disabled,
        type = "button",
        ...props
      },
      ref
    ) {
      const isDisabled =
        disabled || loading;

      return (
        <button
          {...props}
          ref={ref}
          type={type}
          disabled={isDisabled}
          aria-busy={loading || undefined}
          className={cx(
            "mos-button",
            `is-${variant}`,
            `is-${size}`,
            fullWidth && "is-full-width",
            loading && "is-loading",
            className
          )}
        >
          {loading ? (
            <LoaderCircle
              className="mos-button-spinner"
              aria-hidden="true"
            />
          ) : leadingIcon ? (
            <span
              className="mos-button-icon"
              aria-hidden="true"
            >
              {leadingIcon}
            </span>
          ) : null}

          <span className="mos-button-label">
            {children}
          </span>

          {!loading && trailingIcon ? (
            <span
              className="mos-button-icon"
              aria-hidden="true"
            >
              {trailingIcon}
            </span>
          ) : null}
        </button>
      );
    }
  );

Button.displayName = "Button";
