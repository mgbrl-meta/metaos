"use client";

import { create } from "zustand";

export type MetaV2Tab =
  | "command"
  | "data_qc"
  | "descale"
  | "scale"
  | "zero_purchase"
  | "high_cpa"
  | "high_roas"
  | "funnel"
  | "creative"
  | "budget"
  | "strategy"
  | "settings";

interface MetaV2UiStore {
  activeTab: MetaV2Tab;
  sidebarOpen: boolean;
  setActiveTab: (tab: MetaV2Tab) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useMetaV2UiStore = create<MetaV2UiStore>((set) => ({
  activeTab: "command",
  sidebarOpen: true,
  setActiveTab: (activeTab) => set({ activeTab }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
