import type {
  BigQueryConnectionInput,
  BigQueryConnectionTestResult,
  BigQueryRuntimeConfig,
  PublicBigQueryStatus,
} from "@/lib/meta-connections/contracts";

import {
  createBigQueryClient,
  createGoogleSheetsClient,
} from "@/lib/meta-connections/server/bigQueryClients";

import {
  getRuntimeConnectionConfig,
  validateConnectionInput,
} from "@/lib/meta-connections/server/runtimeEnvironmentManager";

function toRuntimeConfig(
  input: BigQueryConnectionInput
): BigQueryRuntimeConfig {
  const validated =
    validateConnectionInput(
      input
    );

  return {
    projectId:
      validated.projectId,

    datasetId:
      validated.datasetId,

    location:
      validated.location,

    rawTable:
      validated.rawTable,

    currentTable:
      validated.currentTable,

    syncTable:
      validated.syncTable,

    sheetId:
      validated.sheetId,

    sheetTab:
      validated.sheetTab,

    serviceAccountEmail:
      validated
        .serviceAccountEmail,

    privateKey:
      validated.privateKey,

    autoSyncEnabled:
      validated.autoSyncEnabled,
  };
}

export function runtimeConfigFromInput(
  input: BigQueryConnectionInput
): BigQueryRuntimeConfig {
  return toRuntimeConfig(input);
}

export async function testBigQueryConnection(
  input: BigQueryConnectionInput
): Promise<BigQueryConnectionTestResult> {
  const config =
    toRuntimeConfig(input);

  const sheets =
    createGoogleSheetsClient(
      config
    );

  const bigquery =
    createBigQueryClient(
      config
    );

  const escapedTab =
    config.sheetTab.replace(
      /'/g,
      "''"
    );

  const sheetResponse =
    await sheets.spreadsheets.values.get(
      {
        spreadsheetId:
          config.sheetId,

        range:
          `'${escapedTab}'!A1:ZZ6`,
      }
    );

  const values =
    sheetResponse.data.values ||
    [];

  if (!values.length) {
    throw new Error(
      "The configured Sheet tab contains no header row."
    );
  }

  await bigquery.query({
    query:
      "SELECT 1 AS connection_test",

    location:
      config.location,
  });

  const dataset =
    bigquery.dataset(
      config.datasetId
    );

  const [
    datasetExists,
  ] =
    await dataset.exists();

  return {
    ok:
      true,

    sheetHeaderCount:
      values[0]?.length ||
      0,

    sheetSampleRows:
      Math.max(
        0,
        values.length - 1
      ),

    datasetExists,

    location:
      config.location,

    projectId:
      config.projectId,

    datasetId:
      config.datasetId,
  };
}

export async function provisionMetaTables(
  config: BigQueryRuntimeConfig
): Promise<void> {
  const bigquery =
    createBigQueryClient(
      config
    );

  const dataset =
    bigquery.dataset(
      config.datasetId
    );

  const [
    datasetExists,
  ] =
    await dataset.exists();

  if (!datasetExists) {
    await dataset.create({
      location:
        config.location,

      description:
        "MetaOS paid-media ingestion and operating data",

      defaultTableExpirationMs:
        null,
    });
  }

  const projectDataset =
    `${config.projectId}.${config.datasetId}`;

  await bigquery.query({
    location:
      config.location,

    query: `
      CREATE TABLE IF NOT EXISTS
        \`${projectDataset}.${config.rawTable}\`
      (
        batch_id STRING NOT NULL,
        ingested_at TIMESTAMP NOT NULL,
        source_row_number INT64 NOT NULL,
        row_key STRING NOT NULL,
        row_hash STRING NOT NULL,
        reporting_date DATE,
        payload_json STRING NOT NULL
      )
      PARTITION BY DATE(ingested_at)
      CLUSTER BY row_key, row_hash
      OPTIONS (
        description =
          'Immutable append-only Meta source history'
      );

      CREATE TABLE IF NOT EXISTS
        \`${projectDataset}.${config.currentTable}\`
      (
        row_key STRING NOT NULL,
        row_hash STRING NOT NULL,
        reporting_date DATE,
        payload_json STRING NOT NULL,
        first_seen_at TIMESTAMP NOT NULL,
        last_seen_at TIMESTAMP NOT NULL,
        last_batch_id STRING NOT NULL
      )
      PARTITION BY reporting_date
      CLUSTER BY row_key
      OPTIONS (
        description =
          'Deduplicated MetaOS operating rows'
      );

      CREATE TABLE IF NOT EXISTS
        \`${projectDataset}.${config.syncTable}\`
      (
        batch_id STRING NOT NULL,
        started_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP,
        status STRING NOT NULL,
        source_row_count INT64,
        current_row_count INT64,
        latest_reporting_date DATE,
        error_message STRING
      )
      PARTITION BY DATE(started_at)
      CLUSTER BY status, batch_id
      OPTIONS (
        description =
          'MetaOS ingestion and sync audit trail'
      );
    `,
  });
}

function bigQueryScalarString(
  value: unknown
): string {
  if (
    value !== null &&
    typeof value === "object" &&
    "value" in value
  ) {
    return String(
      (
        value as {
          value?: unknown;
        }
      ).value ??
      ""
    );
  }

  return String(
    value ??
    ""
  );
}

export async function getPublicConnectionStatus():
  Promise<PublicBigQueryStatus> {
  const config =
    getRuntimeConnectionConfig();

  if (!config) {
    return {
      configured:
        false,

      credentialsConfigured:
        false,

      dataSource:
        "not_configured",

      projectId:
        "",

      datasetId:
        "",

      location:
        "",

      rawTable:
        "",

      currentTable:
        "",

      syncTable:
        "",

      sheetTab:
        "",

      autoSyncEnabled:
        false,

      lastSync:
        null,
    };
  }

  const status:
    PublicBigQueryStatus = {
      configured:
        true,

      credentialsConfigured:
        Boolean(
          config.privateKey &&
          config
            .serviceAccountEmail
        ),

      dataSource:
        "bigquery",

      projectId:
        config.projectId,

      datasetId:
        config.datasetId,

      location:
        config.location,

      rawTable:
        config.rawTable,

      currentTable:
        config.currentTable,

      syncTable:
        config.syncTable,

      sheetTab:
        config.sheetTab,

      autoSyncEnabled:
        config.autoSyncEnabled,

      lastSync:
        null,
    };

  try {
    const bigquery =
      createBigQueryClient(
        config
      );

    const table =
      `${config.projectId}.${config.datasetId}.${config.syncTable}`;

    const [
      rows,
    ] =
      await bigquery.query({
        location:
          config.location,

        query: `
          SELECT
            batch_id,
            status,
            source_row_count,
            current_row_count,
            latest_reporting_date,
            completed_at,
            error_message
          FROM \`${table}\`
          ORDER BY started_at DESC
          LIMIT 1
        `,
      });

    const row =
      rows[0] as
        | Record<
            string,
            unknown
          >
        | undefined;

    if (row) {
      status.lastSync = {
        batchId:
          String(
            row.batch_id ||
            ""
          ),

        status:
          String(
            row.status ||
            ""
          ),

        sourceRowCount:
          Number(
            row.source_row_count ||
            0
          ),

        currentRowCount:
          Number(
            row.current_row_count ||
            0
          ),

        latestReportingDate:
          bigQueryScalarString(
            row.latest_reporting_date
          ),

        completedAt:
          bigQueryScalarString(
            row.completed_at
          ),

        errorMessage:
          String(
            row.error_message ||
            ""
          ),
      };
    }
  } catch {
    // Status remains configured even if the
    // sync table is not provisioned yet.
  }

  return status;
}
