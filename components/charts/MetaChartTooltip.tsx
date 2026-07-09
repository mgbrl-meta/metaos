"use client";

export function compactMoney(value: number) {
  const n = Number(value || 0);

  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(0)}K`;

  return `₹${Math.round(n)}`;
}

export function fullMoney(value: number) {
  return `₹${Math.round(Number(value || 0)).toLocaleString()}`;
}

export function chartAxisColor(isDark: boolean) {
  return isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.62)";
}

export function chartGridColor(isDark: boolean) {
  return isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
}

export function MetaChartTooltip({
  active,
  payload,
  label,
  title = "Performance",
  valueFormatter,
  labelPrefix = "Date",
}: {
  active?: boolean;
  payload?: readonly any[];
  label?: string | number;
  title?: string;
  valueFormatter?: (value: number, name?: string) => string;
  labelPrefix?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "#111318",
        color: "#ffffff",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 18,
        boxShadow: "0 22px 60px rgba(0,0,0,0.45)",
        padding: "12px 14px",
        minWidth: 190,
        maxWidth: 280,
      }}
    >
      <div
        style={{
          fontSize: 10,
          lineHeight: "14px",
          fontWeight: 900,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {payload.map((item, index) => {
          const rawValue = Number(item.value || 0);
          const name = String(item.name || item.dataKey || "Value");
          const color = item.color || item.stroke || item.fill || "#0A84FF";

          return (
            <div
              key={`${name}-${index}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                fontSize: 12,
                lineHeight: "16px",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  color: "rgba(255,255,255,0.72)",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: color,
                    display: "inline-block",
                  }}
                />
                {name}
              </span>

              <strong style={{ color: "#ffffff", fontWeight: 900 }}>
                {valueFormatter ? valueFormatter(rawValue, name) : rawValue.toLocaleString()}
              </strong>
            </div>
          );
        })}
      </div>

      {label !== undefined && label !== null && (
        <div
          style={{
            marginTop: 9,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: 11,
            color: "rgba(255,255,255,0.48)",
          }}
        >
          {labelPrefix}: {String(label)}
        </div>
      )}
    </div>
  );
}
