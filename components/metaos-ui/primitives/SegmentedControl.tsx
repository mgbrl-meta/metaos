"use client";

import type {
  ReactNode,
} from "react";

import { cx } from "@/lib/metaos-ui/cx";

export interface SegmentedOption<
  TValue extends string,
> {
  value: TValue;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<
  TValue extends string,
> {
  value: TValue;
  options: readonly SegmentedOption<TValue>[];
  onChange: (value: TValue) => void;
  ariaLabel: string;
}

export function SegmentedControl<
  TValue extends string,
>({
  value,
  options,
  onChange,
  ariaLabel,
}: SegmentedControlProps<TValue>) {
  return (
    <div
      className="mos-segmented-control"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active =
          option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            aria-pressed={active}
            className={cx(
              "mos-segmented-option",
              active && "is-active"
            )}
            onClick={() =>
              onChange(option.value)
            }
          >
            {option.icon ? (
              <span
                className="mos-segmented-icon"
                aria-hidden="true"
              >
                {option.icon}
              </span>
            ) : null}

            {option.label}
          </button>
        );
      })}
    </div>
  );
}
