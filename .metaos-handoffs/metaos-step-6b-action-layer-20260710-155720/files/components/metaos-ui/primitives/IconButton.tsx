"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { LoaderCircle } from "lucide-react";

import {
  cx,
} from "@/lib/metaos-ui/cx";

import type {
  ButtonSize,
  ButtonVariant,
} from "@/components/metaos-ui/primitives/Button";

export interface IconButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "aria-label"
  > {
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const IconButton =
  forwardRef<
    HTMLButtonElement,
    IconButtonProps
  >(function IconButton(
    {
      className,
      label,
      icon,
      variant = "ghost",
      size = "sm",
      loading = false,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) {
    return (
      <button
        {...props}
        ref={ref}
        type={type}
        aria-label={label}
        title={props.title || label}
        aria-busy={loading || undefined}
        disabled={disabled || loading}
        className={cx(
          "mos-icon-control",
          `is-${variant}`,
          `is-${size}`,
          className
        )}
      >
        {loading ? (
          <LoaderCircle
            className="mos-button-spinner"
            aria-hidden="true"
          />
        ) : (
          <span aria-hidden="true">
            {icon}
          </span>
        )}
      </button>
    );
  });

IconButton.displayName = "IconButton";
