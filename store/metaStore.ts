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
import {
  buildMetaDataQualitySummary,
  normalizeMetaRows,
  MetaQcSummary,
} from "@/lib/metaDataQuality";
import { extractMetaRows, getMetaLatestDate } from "@/lib/meta/dataFreshness";

export async function fetchFreshMetaRowsForStore() {
  const response = await fetch(`/api/meta-data?limit=1000000&t=${Date.now()}`, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`Meta BigQuery fetch failed: ${response.status}`);
  }

  const payload = await response.json();
  const rows = extractMetaRows(payload);

  return {
    rows,
    latestDate: getMetaLatestDate(rows),
    rowCount: rows.length,
    source: payload?.source || "unknown",
    sheetTab: payload?.table || "",
    fetchedAt: new Date().toISOString(),
  };
}

interface MetaStore {
  settings: MetaSettings;
  rawRows: MetaNormalizedRow[];
  performanceRows: MetaPerformanceRow[];
  dataHealth: DataHealth | null;
  metaQcSummary: MetaQcSummary | null;
  metaLatestDate: string;
  metaFetchedAt: string;
  metaRowCount: number;

  updateSettings: (settings: Partial<MetaSettings>) => void;
  resetSettings: () => void;

  setRawRows: (rows: MetaNormalizedRow[]) => void;
  setPerformanceRows: (rows: MetaPerformanceRow[]) => void;
  setDataHealth: (dataHealth: DataHealth) => void;
  setMetaQcSummary: (summary: MetaQcSummary | null) => void;
  setMetaFreshness: (freshness: { latestDate?: string; fetchedAt?: string; rowCount?: number }) => void;

  clearUpload: () => void;
}

function normalizeAndSummarize(rows: any[]) {
  const normalizedRows = normalizeMetaRows(rows || []);
  return {
    normalizedRows,
    summary: buildMetaDataQualitySummary(normalizedRows),
  };
}

export const useMetaStore = create<MetaStore>()(
  persist(
    (set) => ({
      settings: defaultMetaSettings,
      rawRows: [],
      performanceRows: [],
      dataHealth: null,
      metaQcSummary: null,
      metaLatestDate: "",
      metaFetchedAt: "",
      metaRowCount: 0,

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
        const { normalizedRows, summary } = normalizeAndSummarize(rows as any[]);

        set({
          rawRows: normalizedRows as any,
          metaQcSummary: summary,
        });
      },

      setPerformanceRows: (rows) => {
        const { normalizedRows, summary } = normalizeAndSummarize(rows as any[]);

        set({
          performanceRows: normalizedRows as any,
          metaQcSummary: summary,
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

      setMetaFreshness: (freshness) =>
        set((state) => ({
          metaLatestDate: freshness.latestDate ?? state.metaLatestDate,
          metaFetchedAt: freshness.fetchedAt ?? state.metaFetchedAt,
          metaRowCount: freshness.rowCount ?? state.metaRowCount,
        })),

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
