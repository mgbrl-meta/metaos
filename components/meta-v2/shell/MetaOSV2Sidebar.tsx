"use client";

import {
  BarChart3,
  Brain,
  Gauge,
  Layers3,
  LineChart,
  Megaphone,
  Settings,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useMetaV2UiStore, type MetaV2Tab } from "@/store/metaV2UiStore";

const tabs: {
  id: MetaV2Tab;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "command", label: "Command", icon: Gauge },
  { id: "data_qc", label: "Data QC", icon: ShieldAlert },
  { id: "descale", label: "De-scale", icon: TrendingDown },
  { id: "scale", label: "Scale", icon: TrendingUp },
  { id: "zero_purchase", label: "Zero Purchase", icon: ShieldAlert },
  { id: "high_cpa", label: "High CPA", icon: BarChart3 },
  { id: "high_roas", label: "High ROAS", icon: LineChart },
  { id: "funnel", label: "Funnel", icon: Layers3 },
  { id: "creative", label: "Creative", icon: Megaphone },
  { id: "budget", label: "Budget", icon: WalletCards },
  { id: "strategy", label: "Strategy", icon: Brain },
  { id: "settings", label: "Settings", icon: Settings },
];

export function MetaOSV2Sidebar() {
  const activeTab = useMetaV2UiStore((state) => state.activeTab);
  const setActiveTab = useMetaV2UiStore((state) => state.setActiveTab);

  return (
    <aside className="hidden min-h-screen w-[250px] shrink-0 border-r border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl lg:block">
      <div className="mb-5 px-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
        Operator Modules
      </div>

      <nav className="grid gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition",
                active
                  ? "bg-[#0A84FF] text-white shadow-[0_18px_60px_rgba(10,132,255,0.35)]"
                  : "text-white/55 hover:bg-white/[0.07] hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
