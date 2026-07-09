"use client";

import { create } from "zustand";
import type { MetaV2Settings } from "@/lib/meta-v2/schema";
import { defaultMetaV2Settings } from "@/lib/meta-v2/settings";

interface MetaV2SettingsStore {
  settings: MetaV2Settings;
  updateSettings: (settings: Partial<MetaV2Settings>) => void;
  resetSettings: () => void;
}

export const useMetaV2SettingsStore = create<MetaV2SettingsStore>((set) => ({
  settings: defaultMetaV2Settings,
  updateSettings: (settings) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...settings,
      },
    })),
  resetSettings: () => set({ settings: defaultMetaV2Settings }),
}));
