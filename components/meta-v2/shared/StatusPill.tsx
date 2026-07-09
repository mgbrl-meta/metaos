import type { MetaV2Tone } from "@/lib/meta-v2/schema";

const toneMap: Record<MetaV2Tone, string> = {
  blue: "border-[#0A84FF]/35 bg-[#0A84FF]/10 text-[#6BB6FF]",
  green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  red: "border-red-400/30 bg-red-400/10 text-red-300",
  amber: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  slate: "border-white/10 bg-white/5 text-white/65",
};

export function StatusPill({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: MetaV2Tone;
}) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.13em] ${toneMap[tone]}`}>
      {label}
    </span>
  );
}
