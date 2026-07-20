import type { MetaV2Tone } from "@/lib/meta-v2/schema";
import { themeColor, type ThemeColorKey } from "@/lib/meta-v2/theming/useThemeColor";

interface ToneStyle {
  border: string;
  bg: string;
  text: ThemeColorKey;
}

const toneMap: Record<MetaV2Tone, ToneStyle> = {
  blue: {
    border: "status-info",
    bg: "status-info-soft",
    text: "status-info",
  },
  green: {
    border: "status-success",
    bg: "status-success-soft",
    text: "status-success",
  },
  red: {
    border: "status-error",
    bg: "status-error-soft",
    text: "status-error",
  },
  amber: {
    border: "status-warning",
    bg: "status-warning-soft",
    text: "status-warning",
  },
  slate: {
    border: "border",
    bg: "bg-surface-subtle",
    text: "text-secondary",
  },
};

export function StatusPill({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: MetaV2Tone;
}) {
  const style = toneMap[tone];
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.13em]"
      style={{
        borderColor: themeColor(style.border as ThemeColorKey),
        backgroundColor: `var(--theme-${style.bg})`,
        color: themeColor(style.text),
      }}
    >
      {label}
    </span>
  );
}
