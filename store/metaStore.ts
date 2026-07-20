"use client";

import {
  create,
} from "zustand";

import {
  persist,
} from "zustand/middleware";

import type {
  DataHealth,
  MetaNormalizedRow,
  MetaPerformanceRow,
  MetaSettings,
} from "@/types/meta";

import {
  defaultMetaSettings,
} from "@/lib/defaultSettings";

import {
  buildMetaDataQualitySummary,
  normalizeMetaRows,
} from "@/lib/metaDataQuality";

import type {
  MetaQcSummary,
} from "@/lib/metaDataQuality";

import {
  loadMetaSheetData,
} from "@/lib/meta-sheet/client";

export async function fetchFreshMetaRowsForStore() {
  const response =
    await loadMetaSheetData({
      forceRefresh:
        true,
    });

  return {
    rows:
      response.dataset.rows,

    latestDate:
      response.dataset
        .latestDate,

    rowCount:
      response.dataset
        .rowCount,

    source:
      response.source,

    sheetTab:
      response.diagnostics
        .sheetTab,

    fetchedAt:
      response.dataset
        .fetchedAt,
  };
}

interface MetaStore {
  settings:
    MetaSettings;

  rawRows:
    MetaNormalizedRow[];

  performanceRows:
    MetaPerformanceRow[];

  dataHealth:
    DataHealth | null;

  metaQcSummary:
    MetaQcSummary | null;

  metaLatestDate:
    string;

  metaFetchedAt:
    string;

  metaRowCount:
    number;

  metaSource:
    "sheet" | "file" | "";

  metaSourceLabel:
    string;

  updateSettings: (
    settings:
      Partial<MetaSettings>
  ) => void;

  resetSettings:
    () => void;

  setRawRows: (
    rows:
      MetaNormalizedRow[]
  ) => void;

  setPerformanceRows: (
    rows:
      MetaPerformanceRow[]
  ) => void;

  setDataHealth: (
    dataHealth:
      DataHealth
  ) => void;

  setMetaQcSummary: (
    summary:
      MetaQcSummary | null
  ) => void;

  setMetaFreshness: (
    freshness: {
      latestDate?:
        string;

      fetchedAt?:
        string;

      rowCount?:
        number;

      source?:
        "sheet" | "file" | "";

      sourceLabel?:
        string;
    }
  ) => void;

  hydrateMetaDataset: (
    input: {
      rows:
        Record<
          string,
          unknown
        >[];

      latestDate:
        string;

      fetchedAt:
        string;

      rowCount:
        number;
    }
  ) => void;

  clearUpload:
    () => void;
}

function normalizeAndSummarize(
  rows:
    unknown[]
) {
  const normalizedRows =
    normalizeMetaRows(
      (rows || []) as Record<string, any>[]
    );

  return {
    normalizedRows,

    summary:
      buildMetaDataQualitySummary(
        normalizedRows
      ),
  };
}

export const useMetaStore =
  create<MetaStore>()(
    persist(
      (set) => ({
        settings:
          defaultMetaSettings,

        rawRows: [],

        performanceRows:
          [],

        dataHealth:
          null,

        metaQcSummary:
          null,

        metaLatestDate:
          "",

        metaFetchedAt:
          "",

        metaRowCount:
          0,

        metaSource:
          "",

        metaSourceLabel:
          "",

        updateSettings: (
          settings
        ) =>
          set(
            (state) => ({
              settings: {
                ...state.settings,
                ...settings,
              },
            })
          ),

        resetSettings:
          () =>
            set({
              settings:
                defaultMetaSettings,
            }),

        setRawRows: (
          rows
        ) => {
          const {
            normalizedRows,
            summary,
          } =
            normalizeAndSummarize(
              rows
            );

          set({
            rawRows:
              normalizedRows as MetaNormalizedRow[],

            metaQcSummary:
              summary,
          });
        },

        setPerformanceRows: (
          rows
        ) => {
          const {
            normalizedRows,
            summary,
          } =
            normalizeAndSummarize(
              rows
            );

          set({
            performanceRows:
              normalizedRows as MetaPerformanceRow[],

            metaQcSummary:
              summary,
          });
        },

        setDataHealth: (
          dataHealth
        ) =>
          set({
            dataHealth,
          }),

        setMetaQcSummary: (
          summary
        ) =>
          set({
            metaQcSummary:
              summary,
          }),

        setMetaFreshness: (
          freshness
        ) =>
          set(
            (state) => ({
              metaLatestDate:
                freshness
                  .latestDate ??
                state
                  .metaLatestDate,

              metaFetchedAt:
                freshness
                  .fetchedAt ??
                state
                  .metaFetchedAt,

              metaRowCount:
                freshness
                  .rowCount ??
                state
                  .metaRowCount,

              metaSource:
                freshness
                  .source ??
                state
                  .metaSource,

              metaSourceLabel:
                freshness
                  .sourceLabel ??
                state
                  .metaSourceLabel,
            })
          ),

        hydrateMetaDataset: (
          input
        ) => {
          const {
            normalizedRows,
            summary,
          } =
            normalizeAndSummarize(
              input.rows
            );

          set({
            rawRows:
              normalizedRows as MetaNormalizedRow[],

            performanceRows:
              normalizedRows as MetaPerformanceRow[],

            metaQcSummary:
              summary,

            metaLatestDate:
              input.latestDate,

            metaFetchedAt:
              input.fetchedAt,

            metaRowCount:
              input.rowCount,

            metaSource:
              "sheet",

            metaSourceLabel:
              "Google Sheet",
          });
        },

        clearUpload:
          () =>
            set({
              rawRows: [],

              performanceRows:
                [],

              dataHealth:
                null,

              metaQcSummary:
                null,

              metaLatestDate:
                "",

              metaFetchedAt:
                "",

              metaRowCount:
                0,

              metaSource:
                "",

              metaSourceLabel:
                "",
            }),
      }),

      {
        name:
          "meta-ai-growth-os-store",

        partialize: (
          state
        ) => ({
          settings:
            state.settings,
        }),
      }
    )
  );
