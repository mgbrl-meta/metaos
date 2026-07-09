"use client";

type TooltipPayloadItem = {
  name?: string;
  dataKey?: string;
  value?: number | string | null;
  color?: string;
};

function formatMoney(value: unknown) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "₹0";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatPct(value: unknown) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0.00%";
  return `${(n * 100).toFixed(2)}%`;
}

function formatNumber(value: unknown) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(2);
}

function formatTooltipValue(name: string, value: unknown) {
  if (value === null || value === undefined) {
    if (name === "CPA" || name === "AOV") return "No sale";
    return "0";
  }

  if (name === "Spend") return formatMoney(value);
  if (name === "CPM") return formatMoney(value);
  if (name === "CPA") return formatMoney(value);
  if (name === "AOV") return formatMoney(value);
  if (name === "CTR") return formatPct(value);
  if (name === "ROAS") return `${formatNumber(value)}x`;

  return String(value);
}

export function CreativeTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const cleanPayload = payload.filter((item) => item && item.value !== undefined);

  if (!cleanPayload.length) return null;

  return (
    <div
      className="creative-trend-tooltip"
      style={{
        minWidth: 150,
        background: "#111318",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 12,
        padding: "10px 12px",
        boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
        color: "#ffffff",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          color: "#ffffff",
          fontSize: 11,
          fontWeight: 900,
          marginBottom: 8,
          lineHeight: 1.2,
        }}
      >
        {label || "Trend"}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {cleanPayload.map((item) => {
          const name = String(item.name || item.dataKey || "");
          const value = formatTooltipValue(name, item.value);

          return (
            <div
              key={`${name}-${String(item.dataKey || "")}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                background: "transparent",
                color: "#ffffff",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "rgba(255,255,255,0.72)",
                  fontSize: 11,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: item.color || "rgba(255,255,255,0.6)",
                    display: "inline-block",
                  }}
                />
                {name}
              </span>

              <span
                style={{
                  color: "#ffffff",
                  fontSize: 11,
                  fontWeight: 900,
                  whiteSpace: "nowrap",
                }}
              >
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
