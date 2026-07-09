import type { ReactNode } from "react";
import type { MetaV2Tone } from "@/lib/meta-v2/schema";

const toneMap: Record<MetaV2Tone, string> = {
  blue: "text-[#0A84FF]",
  green: "text-emerald-400",
  red: "text-red-400",
  amber: "text-amber-300",
  slate: "text-white",
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
    <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/45">
          {label}
        </div>
        {icon ? <div className="text-white/45">{icon}</div> : null}
      </div>

      <div className={`mt-3 text-2xl font-black tracking-tight ${toneMap[tone]}`}>
        {value}
      </div>

      {note ? <div className="mt-1 text-xs font-medium text-white/40">{note}</div> : null}
    </div>
  );
}
