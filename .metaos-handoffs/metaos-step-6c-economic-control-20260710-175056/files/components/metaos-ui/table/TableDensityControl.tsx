"use client";

import {
  AlignJustify,
  Rows3,
} from "lucide-react";

import { SegmentedControl } from "@/components/metaos-ui/primitives";
import type {
  DataTableDensity,
} from "@/components/metaos-ui/table/types";

export function TableDensityControl({
  value,
  onChange,
}: {
  value: DataTableDensity;

  onChange: (
    value: DataTableDensity
  ) => void;
}) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      ariaLabel="Table density"
      options={[
        {
          value: "compact",
          label: "Compact",
          icon: <Rows3 />,
        },
        {
          value: "comfortable",
          label: "Comfortable",
          icon: <AlignJustify />,
        },
      ]}
    />
  );
}
