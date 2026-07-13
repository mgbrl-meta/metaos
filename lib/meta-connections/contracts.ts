export interface BigQueryConnectionInput {
  projectId: string;
  datasetId: string;
  location: string;

  rawTable: string;
  currentTable: string;
  syncTable: string;

  sheetId: string;
  sheetTab: string;

  serviceAccountEmail: string;
  privateKey: string;

  autoSyncEnabled: boolean;
  syncAfterSave: boolean;

  adminKey?: string;

  vercelProjectId?: string;
  vercelTeamId?: string;
  vercelAccessToken?: string;
  deploymentHookUrl?: string;
}

export interface BigQueryRuntimeConfig {
  projectId: string;
  datasetId: string;
  location: string;

  rawTable: string;
  currentTable: string;
  syncTable: string;

  sheetId: string;
  sheetTab: string;

  serviceAccountEmail: string;
  privateKey: string;

  autoSyncEnabled: boolean;
}

export interface BigQueryConnectionTestResult {
  ok: true;
  sheetHeaderCount: number;
  sheetSampleRows: number;
  datasetExists: boolean;
  location: string;
  projectId: string;
  datasetId: string;
}

export interface BigQuerySyncResult {
  ok: true;
  status: "success" | "skipped";
  batchId: string;
  sourceRows: number;
  currentRows: number;
  latestReportingDate: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface PublicBigQueryStatus {
  configured: boolean;
  credentialsConfigured: boolean;
  dataSource: "bigquery" | "not_configured";

  projectId: string;
  datasetId: string;
  location: string;

  rawTable: string;
  currentTable: string;
  syncTable: string;

  sheetTab: string;
  autoSyncEnabled: boolean;

  lastSync: {
    status: string;
    batchId: string;
    sourceRowCount: number;
    currentRowCount: number;
    latestReportingDate: string;
    completedAt: string;
    errorMessage: string;
  } | null;
}
