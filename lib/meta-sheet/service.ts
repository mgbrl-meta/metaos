import {
  createMetaSheetClient,
} from "./auth";

import {
  getMetaSheetConfig,
} from "./config";

import {
  probeMetaSheet,
  readMetaSheetRows,
} from "./repository";

import type {
  MetaSheetCacheStatus,
  MetaSheetHealthResponse,
  MetaSheetResponse,
  MetaSheetRow,
} from "./schema";

interface CachedDataset {
  response:
    MetaSheetResponse;

  expiresAt:
    number;
}

interface GlobalMetaSheetState {
  cache:
    CachedDataset | null;

  inFlight:
    Promise<MetaSheetResponse>
    | null;
}

const globalState =
  globalThis as typeof globalThis & {
    __metaosSheetState?:
      GlobalMetaSheetState;
  };

const state:
  GlobalMetaSheetState =
  globalState
    .__metaosSheetState || {
      cache: null,
      inFlight: null,
    };

globalState
  .__metaosSheetState =
  state;

function parseDate(
  input: unknown
) {
  if (
    input === null ||
    input === undefined ||
    input === ""
  ) {
    return 0;
  }

  if (
    typeof input === "number" &&
    input > 20_000 &&
    input < 100_000
  ) {
    return (
      Date.UTC(
        1899,
        11,
        30
      ) +
      input *
        86_400_000
    );
  }

  const raw =
    String(input).trim();

  const nativeValue =
    new Date(raw)
      .getTime();

  if (
    Number.isFinite(
      nativeValue
    )
  ) {
    return nativeValue;
  }

  const match =
    raw.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/
    );

  if (!match) {
    return 0;
  }

  const yearValue =
    Number(match[3]);

  const year =
    yearValue < 100
      ? 2000 + yearValue
      : yearValue;

  return Date.UTC(
    year,
    Number(match[2]) - 1,
    Number(match[1])
  );
}

function rowDate(
  row: MetaSheetRow
) {
  const candidates = [
    "Day",
    "day",
    "Date",
    "date",
    "Reporting starts",
    "Reporting Starts",
    "Reporting start",
  ];

  for (const key of candidates) {
    const value =
      parseDate(
        row[key]
      );

    if (value > 0) {
      return value;
    }
  }

  return 0;
}

function latestDate(
  rows: MetaSheetRow[]
) {
  let latest = 0;

  for (const row of rows) {
    latest =
      Math.max(
        latest,
        rowDate(row)
      );
  }

  return latest > 0
    ? new Date(latest)
        .toISOString()
        .slice(0, 10)
    : "";
}

function failureResponse(
  message: string,
  sheetTab: string,
  durationMs: number
): MetaSheetResponse {
  return {
    ok: false,
    source:
      "google_sheet",
    status:
      "error",

    diagnostics: {
      sheetTab,
      range: "",
      chunkCount: 0,
      fetchDurationMs:
        durationMs,
      cacheStatus:
        "miss",
    },

    error: {
      code:
        "META_SHEET_FETCH_FAILED",
      message,
    },
  };
}

async function fetchFreshDataset(
  cacheStatus:
    MetaSheetCacheStatus
): Promise<MetaSheetResponse> {
  const startedAt =
    Date.now();

  let sheetTab = "";

  try {
    const config =
      getMetaSheetConfig();

    sheetTab =
      config.sheetTab;

    const sheets =
      createMetaSheetClient(
        config
      );

    const result =
      await readMetaSheetRows(
        sheets,
        config
      );

    const fetchedAt =
      new Date()
        .toISOString();

    return {
      ok: true,
      source:
        "google_sheet",

      status:
        result.rows.length
          ? "ready"
          : "empty",

      dataset: {
        rows:
          result.rows,

        headers:
          result.probe
            .headers,

        rowCount:
          result.rows
            .length,

        latestDate:
          latestDate(
            result.rows
          ),

        fetchedAt,
      },

      diagnostics: {
        sheetTab:
          result.probe
            .sheetTab,

        range:
          result.probe
            .dataRange,

        chunkCount:
          result.chunkCount,

        fetchDurationMs:
          Date.now() -
          startedAt,

        cacheStatus,
      },
    };
  } catch (error) {
    return failureResponse(
      error instanceof Error
        ? error.message
        : String(error),

      sheetTab,

      Date.now() -
      startedAt
    );
  }
}

export async function getMetaSheetData(
  forceRefresh = false
): Promise<MetaSheetResponse> {
  const config =
    getMetaSheetConfig();

  const now =
    Date.now();

  if (
    !forceRefresh &&
    state.cache &&
    state.cache
      .expiresAt > now
  ) {
    const response =
      state.cache.response;

    if (response.ok) {
      return {
        ...response,

        diagnostics: {
          ...response
            .diagnostics,

          cacheStatus:
            "hit",
        },
      };
    }

    return response;
  }

  if (state.inFlight) {
    const response =
      await state.inFlight;

    if (response.ok) {
      return {
        ...response,

        diagnostics: {
          ...response
            .diagnostics,

          cacheStatus:
            "shared-in-flight",
        },
      };
    }

    return response;
  }

  const request =
    fetchFreshDataset(
      forceRefresh
        ? "refreshed"
        : "miss"
    );

  state.inFlight =
    request;

  try {
    const response =
      await request;

    if (response.ok) {
      state.cache = {
        response,
        expiresAt:
          Date.now() +
          config.cacheTtlMs,
      };
    }

    return response;
  } finally {
    if (
      state.inFlight ===
      request
    ) {
      state.inFlight =
        null;
    }
  }
}

export async function getMetaSheetHealth():
  Promise<MetaSheetHealthResponse> {
  try {
    const config =
      getMetaSheetConfig();

    const sheets =
      createMetaSheetClient(
        config
      );

    const probe =
      await probeMetaSheet(
        sheets,
        config
      );

    return {
      ok: true,
      source:
        "google_sheet",
      status:
        "ready",

      environment: {
        hasSheetId:
          true,

        hasSheetTab:
          true,

        hasClientEmail:
          true,

        hasPrivateKey:
          true,
      },

      sheet: {
        title:
          probe.sheetTab,

        rowCount:
          probe.dataRowCount,

        columnCount:
          probe.columnCount,

        headerCount:
          probe.headerCount,
      },
    };
  } catch (error) {
    return {
      ok: false,
      source:
        "google_sheet",
      status:
        "error",

      environment: {
        hasSheetId:
          Boolean(
            process.env
              .META_SHEET_ID
          ),

        hasSheetTab:
          Boolean(
            process.env
              .META_SHEET_TAB
          ),

        hasClientEmail:
          Boolean(
            process.env
              .GCP_CLIENT_EMAIL ||
            process.env
              .GOOGLE_CLIENT_EMAIL
          ),

        hasPrivateKey:
          Boolean(
            process.env
              .GCP_PRIVATE_KEY ||
            process.env
              .GOOGLE_PRIVATE_KEY
          ),
      },

      error: {
        code:
          "META_SHEET_HEALTH_FAILED",

        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
    };
  }
}
