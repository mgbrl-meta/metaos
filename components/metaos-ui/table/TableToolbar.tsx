"use client";

import {
  Search,
  X,
} from "lucide-react";

import type {
  ReactNode,
} from "react";

import { IconButton } from "@/components/metaos-ui/primitives";

export interface TableSearchConfig {
  value: string;

  onChange: (
    value: string
  ) => void;

  placeholder?: string;
  ariaLabel?: string;
}

export interface TableToolbarProps {
  search?: TableSearchConfig;
  filters?: ReactNode;
  summary?: ReactNode;
  actions?: ReactNode;
}

export function TableToolbar({
  search,
  filters,
  summary,
  actions,
}: TableToolbarProps) {
  return (
    <div className="mos-table-toolbar">
      <div className="mos-table-toolbar-primary">
        {search ? (
          <div className="mos-table-search">
            <Search
              aria-hidden="true"
            />

            <input
              type="search"
              value={search.value}
              placeholder={
                search.placeholder ??
                "Search rows"
              }
              aria-label={
                search.ariaLabel ??
                "Search table"
              }
              onChange={(event) =>
                search.onChange(
                  event.target.value
                )
              }
            />

            {search.value ? (
              <IconButton
                label="Clear search"
                size="xs"
                variant="ghost"
                icon={<X />}
                onClick={() =>
                  search.onChange("")
                }
              />
            ) : null}
          </div>
        ) : null}

        {filters ? (
          <div className="mos-table-toolbar-filters">
            {filters}
          </div>
        ) : null}
      </div>

      {summary ? (
        <div className="mos-table-toolbar-summary">
          {summary}
        </div>
      ) : null}

      {actions ? (
        <div className="mos-table-toolbar-actions">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
