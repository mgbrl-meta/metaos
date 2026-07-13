"use client";

import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
} from "lucide-react";

import {
  type CSSProperties,
  type ReactNode,
  useMemo,
} from "react";

import { IconButton } from "@/components/metaos-ui/primitives";
import type {
  DataTableColumn,
  DataTableDensity,
  DataTableSortState,
  DataTableTone,
} from "@/components/metaos-ui/table/types";

import { cx } from "@/lib/metaos-ui/cx";

export interface DataTableProps<TRow> {
  rows: readonly TRow[];
  columns: readonly DataTableColumn<TRow>[];

  getRowId: (
    row: TRow,
    rowIndex: number
  ) => string;

  ariaLabel: string;
  caption?: string;

  density?: DataTableDensity;

  sort?: DataTableSortState | null;
  onSortChange?: (
    sort: DataTableSortState
  ) => void;

  loading?: boolean;
  loadingRowCount?: number;

  emptyTitle?: string;
  emptyDescription?: string;

  stickyHeader?: boolean;

  rowTone?: (
    row: TRow
  ) => DataTableTone;

  rowClassName?: (
    row: TRow
  ) => string | undefined;

  expandedRowIds?: readonly string[];

  onToggleRow?: (
    rowId: string,
    row: TRow
  ) => void;

  renderExpandedRow?: (
    row: TRow,
    rowIndex: number
  ) => ReactNode;
}

function stickyStyle<TRow>(
  column: DataTableColumn<TRow>
): CSSProperties {
  if (!column.sticky) {
    return {};
  }

  if (column.sticky === "left") {
    return {
      left:
        column.stickyOffset ?? 0,
    };
  }

  return {
    right:
      column.stickyOffset ?? 0,
  };
}

function getHeaderLabel<TRow>(
  column: DataTableColumn<TRow>
): string {
  if (column.headerLabel) {
    return column.headerLabel;
  }

  if (
    typeof column.header === "string"
  ) {
    return column.header;
  }

  return column.id;
}

export function DataTable<TRow>({
  rows,
  columns,
  getRowId,
  ariaLabel,
  caption,
  density = "compact",
  sort,
  onSortChange,
  loading = false,
  loadingRowCount = 6,
  emptyTitle = "No results",
  emptyDescription =
    "No rows match the current selection.",
  stickyHeader = true,
  rowTone,
  rowClassName,
  expandedRowIds = [],
  onToggleRow,
  renderExpandedRow,
}: DataTableProps<TRow>) {
  const expandedSet = useMemo(
    () => new Set(expandedRowIds),
    [expandedRowIds]
  );

  const expandable =
    Boolean(
      onToggleRow &&
        renderExpandedRow
    );

  const totalColumns =
    columns.length +
    (expandable ? 1 : 0);

  function activateSort(
    column: DataTableColumn<TRow>
  ) {
    if (
      !column.sortable ||
      !onSortChange
    ) {
      return;
    }

    const key =
      column.sortKey ??
      column.id;

    const direction =
      sort?.key === key &&
      sort.direction === "asc"
        ? "desc"
        : "asc";

    onSortChange({
      key,
      direction,
    });
  }

  return (
    <div
      className="mos-table-region"
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
    >
      <div className="mos-table-scroll">
        <table
          className={cx(
            "mos-data-table",
            `is-${density}`,
            stickyHeader &&
              "has-sticky-header"
          )}
          aria-busy={
            loading || undefined
          }
        >
          {caption ? (
            <caption className="mos-sr-only">
              {caption}
            </caption>
          ) : null}

          <thead>
            <tr>
              {expandable ? (
                <th
                  className="mos-table-expand-column"
                  scope="col"
                >
                  <span className="mos-sr-only">
                    Expand row
                  </span>
                </th>
              ) : null}

              {columns.map(
                (column) => {
                  const key =
                    column.sortKey ??
                    column.id;

                  const activeSort =
                    sort?.key === key;

                  const ariaSort =
                    activeSort
                      ? sort?.direction ===
                        "asc"
                        ? "ascending"
                        : "descending"
                      : "none";

                  return (
                    <th
                      key={column.id}
                      scope="col"
                      aria-sort={
                        column.sortable
                          ? ariaSort
                          : undefined
                      }
                      className={cx(
                        `is-${column.align ?? "left"}`,
                        column.numeric &&
                          "is-numeric",
                        column.sticky &&
                          `is-sticky-${column.sticky}`,
                        column.headerClassName
                      )}
                      style={{
                        width:
                          column.width,
                        minWidth:
                          column.minWidth,
                        ...stickyStyle(
                          column
                        ),
                      }}
                    >
                      {column.sortable &&
                      onSortChange ? (
                        <button
                          type="button"
                          className={cx(
                            "mos-table-sort-button",
                            activeSort &&
                              "is-active"
                          )}
                          aria-label={`Sort by ${getHeaderLabel(
                            column
                          )}`}
                          onClick={() =>
                            activateSort(
                              column
                            )
                          }
                        >
                          <span>
                            {
                              column.header
                            }
                          </span>

                          {activeSort ? (
                            sort?.direction ===
                            "asc" ? (
                              <ChevronDown
                                className="is-ascending"
                                aria-hidden="true"
                              />
                            ) : (
                              <ChevronDown
                                aria-hidden="true"
                              />
                            )
                          ) : (
                            <ChevronsUpDown
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                }
              )}
            </tr>
          </thead>

          <tbody>
            {loading
              ? Array.from(
                  {
                    length:
                      loadingRowCount,
                  },
                  (_, rowIndex) => (
                    <tr
                      key={`loading-${rowIndex}`}
                      className="is-loading"
                    >
                      {Array.from(
                        {
                          length:
                            totalColumns,
                        },
                        (
                          __,
                          cellIndex
                        ) => (
                          <td
                            key={
                              cellIndex
                            }
                          >
                            <span className="mos-table-skeleton" />
                          </td>
                        )
                      )}
                    </tr>
                  )
                )
              : null}

            {!loading &&
            rows.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    totalColumns
                  }
                >
                  <div className="mos-table-empty">
                    <strong>
                      {emptyTitle}
                    </strong>

                    <span>
                      {
                        emptyDescription
                      }
                    </span>
                  </div>
                </td>
              </tr>
            ) : null}

            {!loading
              ? rows.map(
                  (
                    row,
                    rowIndex
                  ) => {
                    const rowId =
                      getRowId(
                        row,
                        rowIndex
                      );

                    const expanded =
                      expandedSet.has(
                        rowId
                      );

                    const tone =
                      rowTone?.(row) ??
                      "neutral";

                    return [
                      <tr
                        key={rowId}
                        className={cx(
                          `is-${tone}`,
                          expanded &&
                            "is-expanded",
                          rowClassName?.(
                            row
                          )
                        )}
                      >
                        {expandable ? (
                          <td className="mos-table-expand-cell">
                            <IconButton
                              label={
                                expanded
                                  ? "Collapse row"
                                  : "Expand row"
                              }
                              size="xs"
                              variant="ghost"
                              icon={
                                expanded ? (
                                  <ChevronDown />
                                ) : (
                                  <ChevronRight />
                                )
                              }
                              aria-expanded={
                                expanded
                              }
                              onClick={() =>
                                onToggleRow?.(
                                  rowId,
                                  row
                                )
                              }
                            />
                          </td>
                        ) : null}

                        {columns.map(
                          (column) => {
                            const cellTone =
                              column.tone?.(
                                row
                              ) ??
                              "neutral";

                            return (
                              <td
                                key={
                                  column.id
                                }
                                className={cx(
                                  `is-${column.align ?? "left"}`,
                                  `is-${cellTone}`,
                                  column.numeric &&
                                    "is-numeric",
                                  column.truncate &&
                                    "is-truncated",
                                  column.sticky &&
                                    `is-sticky-${column.sticky}`,
                                  column.cellClassName
                                )}
                                style={{
                                  width:
                                    column.width,
                                  minWidth:
                                    column.minWidth,
                                  ...stickyStyle(
                                    column
                                  ),
                                }}
                              >
                                <div className="mos-table-cell-content">
                                  {column.cell(
                                    row,
                                    rowIndex
                                  )}
                                </div>
                              </td>
                            );
                          }
                        )}
                      </tr>,

                      expanded &&
                      renderExpandedRow ? (
                        <tr
                          key={`${rowId}-expanded`}
                          className="mos-table-expanded-row"
                        >
                          <td
                            colSpan={
                              totalColumns
                            }
                          >
                            <div className="mos-table-expanded-content">
                              {renderExpandedRow(
                                row,
                                rowIndex
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : null,
                    ];
                  }
                )
              : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
