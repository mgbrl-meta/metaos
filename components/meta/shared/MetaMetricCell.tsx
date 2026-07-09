import {
  formatINRCompact,
  formatNumberCompact,
  formatPct,
  formatRoas,
} from "@/lib/meta/formatters";

export type MetaMetricType =
  | "number"
  | "currency"
  | "percent"
  | "roas"
  | "text";

export function MetaMetricCell({
  value,
  type = "number",
  align = "right",
  strong = false,
}: {
  value: number | string;
  type?: MetaMetricType;
  align?: "left" | "right" | "center";
  strong?: boolean;
}) {
  const formatted =
    type === "currency"
      ? formatINRCompact(Number(value || 0))
      : type === "percent"
        ? formatPct(Number(value || 0))
        : type === "roas"
          ? formatRoas(Number(value || 0))
          : type === "number"
            ? formatNumberCompact(Number(value || 0))
            : String(value ?? "");

  const alignClass =
    align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right";

  return (
    <td
      className={[
        "metaos-table-cell whitespace-nowrap px-3 py-3 text-sm tabular-nums",
        alignClass,
        strong ? "font-semibold text-slate-950 dark:text-white" : "text-slate-700 dark:text-slate-300",
      ].join(" ")}
    >
      {formatted}
    </td>
  );
}
