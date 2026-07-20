import { themeColor } from "@/lib/meta-v2/theming/useThemeColor";

export function EmptyState({
  title = "No data available",
  description = "Refresh Meta data to activate this V2 screen.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div
      className="rounded-[28px] border p-8 shadow-[0_24px_80px_rgba(0,0,0,0.24)]"
      style={{
        borderColor: themeColor('border'),
        backgroundColor: `var(--theme-bg-surface)`,
      }}
    >
      <div
        className="text-lg font-black"
        style={{ color: themeColor('text-primary') }}
      >
        {title}
      </div>
      <p
        className="mt-2 max-w-2xl text-sm leading-6"
        style={{ color: themeColor('text-secondary') }}
      >
        {description}
      </p>
    </div>
  );
}
