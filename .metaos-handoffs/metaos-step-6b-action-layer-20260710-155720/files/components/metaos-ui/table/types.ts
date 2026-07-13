import type {
  CSSProperties,
  ReactNode,
} from "react";

export type DataTableAlign =
  | "left"
  | "center"
  | "right";

export type DataTableTone =
  | "neutral"
  | "positive"
  | "negative"
  | "warning"
  | "muted";

export type DataTableDensity =
  | "compact"
  | "comfortable";

export type DataTableSortDirection =
  | "asc"
  | "desc";

export interface DataTableSortState {
  key: string;
  direction: DataTableSortDirection;
}

export interface DataTableColumn<TRow> {
  id: string;
  header: ReactNode;

  cell: (
    row: TRow,
    rowIndex: number
  ) => ReactNode;

  headerLabel?: string;

  align?: DataTableAlign;
  tone?: (
    row: TRow
  ) => DataTableTone;

  sortable?: boolean;
  sortKey?: string;

  width?: CSSProperties["width"];
  minWidth?: CSSProperties["minWidth"];

  sticky?: "left" | "right";
  stickyOffset?: CSSProperties["left"];

  truncate?: boolean;
  numeric?: boolean;

  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTablePaginationState {
  page: number;
  pageSize: number;
  totalRows: number;
}
