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
import { buildMetaDataQualitySummary, normalizeMetaRows, MetaQcSummary } from "@/lib/metaDataQuality";

interface MetaStore {
  settings: MetaSettings;
  rawRows: MetaNormalizedRow[];
  performanceRows: MetaPerformanceRow[];
  dataHealth: DataHealth | null;
  metaQcSummary: MetaQcSummary | null;

  updateSettings: (settings: Partial<MetaSettings>) => void;
  resetSettings: () => void;

  setRawRows: (rows: MetaNormalizedRow[]) => void;
  setPerformanceRows: (rows: MetaPerformanceRow[]) => void;
  setDataHealth: (dataHealth: DataHealth) => void;
  setMetaQcSummary: (summary: MetaQcSummary | null) => void;

  clearUpload: () => void;
}

export const useMetaStore = create<MetaStore>()(
  persist(
    (set) => ({
      settings: defaultMetaSettings,
      rawRows: [],
      performanceRows: [],
      dataHealth: null,
      metaQcSummary: null,

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

      setRawRows: (rows) => {
        const normalizedRows = normalizeMetaRows(rows as any[]);

        set({
          rawRows: normalizedRows as any,
          metaQcSummary: buildMetaDataQualitySummary(normalizedRows),
        });
      },

      setPerformanceRows: (rows) => {
        const normalizedRows = normalizeMetaRows(rows as any[]);

        set({
          performanceRows: normalizedRows as any,
          metaQcSummary: buildMetaDataQualitySummary(normalizedRows),
        });
      },

      setDataHealth: (dataHealth) =>
        set({
          dataHealth,
        }),

      setMetaQcSummary: (summary) =>
        set({
          metaQcSummary: summary,
        }),

      clearUpload: () =>
        set({
          rawRows: [],
          performanceRows: [],
          dataHealth: null,
          metaQcSummary: null,
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