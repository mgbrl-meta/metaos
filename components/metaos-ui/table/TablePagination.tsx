"use client";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/metaos-ui/primitives";
import type {
  DataTablePaginationState,
} from "@/components/metaos-ui/table/types";

export interface TablePaginationProps
  extends DataTablePaginationState {
  onPageChange: (
    page: number
  ) => void;

  onPageSizeChange?: (
    pageSize: number
  ) => void;

  pageSizeOptions?: readonly number[];
}

export function TablePagination({
  page,
  pageSize,
  totalRows,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [
    25,
    50,
    100,
  ],
}: TablePaginationProps) {
  const totalPages = Math.max(
    1,
    Math.ceil(
      totalRows /
        Math.max(1, pageSize)
    )
  );

  const safePage = Math.min(
    Math.max(page, 1),
    totalPages
  );

  const firstRow =
    totalRows === 0
      ? 0
      : (safePage - 1) *
          pageSize +
        1;

  const lastRow = Math.min(
    safePage * pageSize,
    totalRows
  );

  return (
    <div className="mos-table-pagination">
      <div className="mos-table-pagination-summary">
        {totalRows === 0
          ? "0 rows"
          : `${firstRow.toLocaleString(
              "en-IN"
            )}–${lastRow.toLocaleString(
              "en-IN"
            )} of ${totalRows.toLocaleString(
              "en-IN"
            )}`}
      </div>

      <div className="mos-table-pagination-controls">
        {onPageSizeChange ? (
          <label className="mos-table-page-size">
            <span>
              Rows
            </span>

            <select
              value={pageSize}
              aria-label="Rows per page"
              onChange={(event) =>
                onPageSizeChange(
                  Number(
                    event.target
                      .value
                  )
                )
              }
            >
              {pageSizeOptions.map(
                (option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                )
              )}
            </select>
          </label>
        ) : null}

        <span className="mos-table-page-count">
          Page {safePage} of{" "}
          {totalPages}
        </span>

        <Button
          variant="secondary"
          size="xs"
          leadingIcon={
            <ChevronLeft />
          }
          disabled={
            safePage <= 1
          }
          onClick={() =>
            onPageChange(
              safePage - 1
            )
          }
        >
          Previous
        </Button>

        <Button
          variant="secondary"
          size="xs"
          trailingIcon={
            <ChevronRight />
          }
          disabled={
            safePage >=
            totalPages
          }
          onClick={() =>
            onPageChange(
              safePage + 1
            )
          }
        >
          Next
        </Button>
      </div>
    </div>
  );
}
