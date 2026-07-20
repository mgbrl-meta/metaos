export type MetaSheetCacheStatus =
  | "hit"
  | "miss"
  | "refreshed"
  | "shared-in-flight";

export type MetaSheetStatus =
  | "ready"
  | "empty"
  | "error";

export type MetaSheetRow =
  Record<string, unknown>;

export interface MetaSheetDataset {
  rows: MetaSheetRow[];
  headers: string[];
  rowCount: number;
  latestDate: string;
  fetchedAt: string;
}

export interface MetaSheetDiagnostics {
  sheetTab: string;
  range: string;
  chunkCount: number;
  fetchDurationMs: number;
  cacheStatus: MetaSheetCacheStatus;
}

export interface MetaSheetError {
  code: string;
  message: string;
}

export interface MetaSheetSuccessResponse {
  ok: true;
  source: "google_sheet";
  status: "ready" | "empty";
  dataset: MetaSheetDataset;
  diagnostics: MetaSheetDiagnostics;
}

export interface MetaSheetFailureResponse {
  ok: false;
  source: "google_sheet";
  status: "error";
  diagnostics: MetaSheetDiagnostics;
  error: MetaSheetError;
}

export type MetaSheetResponse =
  | MetaSheetSuccessResponse
  | MetaSheetFailureResponse;

export interface MetaSheetHealthResponse {
  ok: boolean;
  source: "google_sheet";
  status: "ready" | "error";

  environment: {
    hasSheetId: boolean;
    hasSheetTab: boolean;
    hasClientEmail: boolean;
    hasPrivateKey: boolean;
  };

  sheet?: {
    title: string;
    rowCount: number;
    columnCount: number;
    headerCount: number;
  };

  error?: MetaSheetError;
}
