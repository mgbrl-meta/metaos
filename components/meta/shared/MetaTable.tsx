import type { ReactNode } from "react";

export interface MetaTableColumn<T> {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  className?: string;
  render: (row: T) => ReactNode;
}

export function MetaTable<T>({
  columns,
  rows,
  getRowKey,
  empty,
}: {
  columns: MetaTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  empty?: ReactNode;
}) {
  if (!rows.length) {
    return <>{empty}</>;
  }

  return (
    <div className="metaos-table-wrap overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111827]">
      <table className="metaos-table w-full min-w-[980px] border-collapse text-sm">
        <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
          <tr>
            {columns.map((column) => {
              const alignClass =
                column.align === "center"
                  ? "text-center"
                  : column.align === "right"
                    ? "text-right"
                    : "text-left";

              return (
                <th
                  key={column.key}
                  className={[
                    "metaos-table-head whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wide",
                    alignClass,
                    column.className || "",
                  ].join(" ")}
                >
                  {column.label}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 dark:divide-white/10">
          {rows.map((row, index) => (
            <tr
              key={getRowKey(row, index)}
              className="metaos-table-row hover:bg-slate-50/70 dark:hover:bg-white/[0.03]"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={[
                    "metaos-table-cell px-3 py-3 text-sm text-slate-700 dark:text-slate-300",
                    column.align === "center"
                      ? "text-center"
                      : column.align === "right"
                        ? "text-right"
                        : "text-left",
                    column.className || "",
                  ].join(" ")}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
