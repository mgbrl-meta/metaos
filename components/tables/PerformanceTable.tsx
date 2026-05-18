"use client";

import { MetaPerformanceRow } from "@/types/meta";
import { TonePill } from "@/components/cards/MetaCards";
import { useThemeStore } from "@/components/theme/ThemeProvider";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 1) => Number(n || 0).toFixed(d);

function toneForDecision(decision: string): "green" | "red" | "yellow" | "neutral" {
  if (decision === "Scale") return "green";
  if (decision === "Kill" || decision === "Reduce") return "red";
  if (decision === "Refresh Creative" || decision === "Test More" || decision === "Watch") return "yellow";
  return "neutral";
}

export function PerformanceTable({
  rows,
  nameKey,
}: {
  rows: MetaPerformanceRow[];
  nameKey: "campaignName" | "adSetName" | "adName";
}) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <div className={isDark ? "overflow-hidden rounded-[30px] border border-white/10 bg-[#101010]/82 shadow-2xl backdrop-blur-xl" : "overflow-hidden rounded-[30px] border border-black/10 bg-white/88 shadow-xl backdrop-blur-xl"}>
      <div className="overflow-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className={isDark ? "border-b border-white/10 bg-white/[0.04] text-[11px] uppercase tracking-[0.16em] text-white/45" : "border-b border-black/10 bg-black/[0.035] text-[11px] uppercase tracking-[0.16em] text-black/55"}>
            <tr>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Spend</th>
              <th className="px-5 py-4">Revenue</th>
              <th className="px-5 py-4">ROAS</th>
              <th className="px-5 py-4">CPA</th>
              <th className="px-5 py-4">Purchases</th>
              <th className="px-5 py-4">Scale</th>
              <th className="px-5 py-4">Waste</th>
              <th className="px-5 py-4">Decision</th>
              <th className="px-5 py-4">Action</th>
            </tr>
          </thead>

          <tbody>
            {rows.slice(0, 80).map((row, index) => (
              <tr key={`${row[nameKey]}-${index}`} className={isDark ? "border-b border-white/5 text-white hover:bg-white/[0.04]" : "border-b border-black/5 text-black hover:bg-black/[0.035]"}>
                <td className="min-w-[320px] px-5 py-4 font-black whitespace-normal break-words">{row[nameKey]}</td>
                <td className="px-5 py-4 opacity-70">{money(row.spend)}</td>
                <td className="px-5 py-4 opacity-70">{money(row.revenue)}</td>
                <td className="px-5 py-4 opacity-70">{num(row.roas, 2)}</td>
                <td className="px-5 py-4 opacity-70">{money(row.cpa)}</td>
                <td className="px-5 py-4 opacity-70">{num(row.purchases, 0)}</td>
                <td className="px-5 py-4 font-black text-emerald-400">{row.scaleScore}</td>
                <td className="px-5 py-4 font-black text-red-400">{row.wasteScore}</td>
                <td className="px-5 py-4"><TonePill tone={toneForDecision(row.decision)}>{row.decision}</TonePill></td>
                <td className="min-w-[340px] px-5 py-4 text-xs leading-5 opacity-60">{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
