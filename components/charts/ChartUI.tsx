"use client";

export function compactMoney(value: number) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
}

export function chartAxisColor(isDark: boolean) {
  return isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.62)";
}

export function chartGridColor(isDark: boolean) {
  return isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
}

export function ChartTooltip({
  active,
  payload,
  label,
  title,
  valueFormatter,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  title: string;
  valueFormatter?: (value: number, name?: string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111318] px-4 py-3 text-white shadow-2xl">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/45">
        {title}
      </p>

      <div className="mt-2 grid gap-1">
        {payload.map((item, index) => {
          const value = Number(item.value || 0);
          const name = item.name || item.dataKey || "Value";
          const color = item.color || item.stroke || item.fill || "#0A84FF";

          return (
            <div key={`${name}-${index}`} className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2 text-white/70">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {name}
              </span>
              <b className="text-white">
                {valueFormatter ? valueFormatter(value, name) : value.toLocaleString()}
              </b>
            </div>
          );
        })}
      </div>

      {label && <p className="mt-2 text-xs text-white/45">Date: {label}</p>}
    </div>
  );
}
