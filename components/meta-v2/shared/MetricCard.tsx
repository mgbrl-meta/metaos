import type { ReactNode } from "react";
import type { MetaV2Tone } from "@/lib/meta-v2/schema";
import { themeColor, type ThemeColorKey } from "@/lib/meta-v2/theming/useThemeColor";

const toneMap: Record<MetaV2Tone, ThemeColorKey> = {
  blue: "status-info",
  green: "status-success",
  red: "status-error",
  amber: "status-warning",
  slate: "text-primary",
};

export function MetricCard({
  label,
  value,
  note,
  tone = "slate",
  icon,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: MetaV2Tone;
  icon?: ReactNode;
}) {
  return (
    <div
      className="rounded-[28px] border p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl"
      style={{
        borderColor: themeColor('border'),
        backgroundColor: `var(--theme-bg-surface)`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className="text-[11px] font-black uppercase tracking-[0.16em]"
          style={{ color: themeColor('text-secondary') }}
        >
          {label}
        </div>
        {icon ? (
          <div style={{ color: themeColor('text-secondary') }}>{icon}</div>
        ) : null}
      </div>

      <div
        className="mt-3 text-2xl font-black tracking-tight"
        style={{ color: themeColor(toneMap[tone]) }}
      >
        {value}
      </div>

      {note ? (
        <div
          className="mt-1 text-xs font-medium"
          style={{ color: themeColor('text-secondary'), opacity: 0.8 }}
        >
          {note}
        </div>
      ) : null}
    </div>
  );
}
