"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DataHealth,
  MetaNormalizedRow,
  MetaPerformanceRow,
  MetaSettings,
} from "@/types/meta";
import { defaultMetaSettings } from "@/lib/defaultSettings";

interface MetaStore {
  settings: MetaSettings;
  rawRows: MetaNormalizedRow[];
  performanceRows: MetaPerformanceRow[];
  dataHealth: DataHealth | null;

  updateSettings: (settings: Partial<MetaSettings>) => void;
  resetSettings: () => void;

  setRawRows: (rows: MetaNormalizedRow[]) => void;
  setPerformanceRows: (rows: MetaPerformanceRow[]) => void;
  setDataHealth: (dataHealth: DataHealth) => void;

  clearUpload: () => void;
}

export const useMetaStore = create<MetaStore>()(
  persist(
    (set) => ({
      settings: defaultMetaSettings,
      rawRows: [],
      performanceRows: [],
      dataHealth: null,

      updateSettings: (settings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...settings,
          },
        })),

      resetSettings: () =>
        set({
          settings: defaultMetaSettings,
        }),

      setRawRows: (rows) =>
        set({
          rawRows: rows,
        }),

      setPerformanceRows: (rows) =>
        set({
          performanceRows: rows,
        }),

      setDataHealth: (dataHealth) =>
        set({
          dataHealth,
        }),

      clearUpload: () =>
        set({
          rawRows: [],
          performanceRows: [],
          dataHealth: null,
        }),
    }),
    {
      name: "meta-ai-growth-os-store",
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);