import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type {
  BigQueryRuntimeConfig,
  BigQuerySyncResult,
} from "@/lib/meta-connections/contracts";

import {
  createBigQueryClient,
  createGoogleSheetsClient,
} from "@/lib/meta-connections/server/bigQueryClients";

import {
  provisionMetaTables,
} from "@/lib/meta-connections/server/bigQueryConnectionManager";

function stableJson(
  value: Record<string, unknown>
): string {
  const ordered =
    Object.keys(value)
      .sort()
      .reduce<
        Record<string, unknown>
      >(
        (
          output,
          key
        ) => {
          output[key] =
            value[key];

          return output;
        },
        {}
      );

  return JSON.stringify(
    ordered
  );
}

function sha256(
  value: string
): string {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function firstValue(
  row: Record<string, unknown>,
  keys: string[]
): string {
  for (const key of keys) {
    const value =
      String(
        row[key] || ""
      ).trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function normalizeDate(
  value: string
): string {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(0, 10);
}

function getReportingDate(
  row: Record<string, unknown>
): string {
  return normalizeDate(
    firstValue(
      row,
      [
        "Day",
        "day",
        "Date",
        "date",
        "Reporting starts",
        "Reporting Starts",
        "reporting starts",
      ]
    )
  );
}

function buildRowKey(
  row: Record<string, unknown>,
  reportingDate: string,
  rowHash: string
): string {
  const account =
    firstValue(
      row,
      [
        "Account ID",
        "Account id",
        "account_id",
        "Account name",
        "Account Name",
      ]
    );

  const campaign =
    firstValue(
      row,
      [
        "Campaign ID",
        "Campaign id",
        "campaign_id",
        "Campaign name",
        "Campaign Name",
      ]
    );

  const adSet =
    firstValue(
      row,
      [
        "Ad set ID",
        "Ad Set ID",
        "adset_id",
        "Ad set name",
        "Ad Set Name",
      ]
    );

  const ad =
    firstValue(
      row,
      [
        "Ad ID",
        "Ad id",
        "ad_id",
        "Ad name",
        "Ad Name",
      ]
    );

  const identity =
    [
      reportingDate,
      account,
      campaign,
      adSet,
      ad,
    ]
      .map(
        (value) =>
          value
            .trim()
            .toLowerCase()
      )
      .join("|");

  return sha256(
    identity.replace(
      /\|/g,
      ""
    )
      ? identity
      : rowHash
  );
}

async function fetchSheetRows(
  config: BigQueryRuntimeConfig
) {
  const sheets =
    createGoogleSheetsClient(
      config
    );

  const escapedTab =
    config.sheetTab.replace(
      /'/g,
      "''"
    );

  const response =
    await sheets.spreadsheets.values.get(
      {
        spreadsheetId:
          config.sheetId,

        range:
          `'${escapedTab}'!A:ZZ`,

        valueRenderOption:
          "FORMATTED_VALUE",

        dateTimeRenderOption:
          "FORMATTED_STRING",
      }
    );

  const values =
    response.data.values ||
    [];

  const [
    rawHeaders = [],
    ...bodyRows
  ] = values;

  const headers =
    rawHeaders.map(
      (
        header,
        index
      ) =>
        String(
          header ||
          `Column ${index + 1}`
        ).trim()
    );

  if (!headers.length) {
    throw new Error(
      "The Sheet has no header row."
    );
  }

  const rows =
    bodyRows
      .filter(
        (row) =>
          row.some(
            (cell) =>
              String(
                cell ||
                ""
              ).trim()
          )
      )
      .map(
        (row) => {
          const output:
            Record<
              string,
              unknown
            > = {};

          headers.forEach(
            (
              header,
              index
            ) => {
              output[header] =
                row[index] ??
                "";
            }
          );

          return output;
        }
      );

  return {
    headers,
    rows,
  };
}

export async function syncMetaSheetToBigQuery(
  config: BigQueryRuntimeConfig
): Promise<BigQuerySyncResult> {
  const startedAt =
    new Date();

  await provisionMetaTables(
    config
  );

  const {
    rows,
  } =
    await fetchSheetRows(
      config
    );

  if (!rows.length) {
    throw new Error(
      "The source Sheet returned zero data rows."
    );
  }

  const prepared =
    rows.map(
      (
        row,
        index
      ) => {
        const payloadJson =
          stableJson(row);

        const rowHash =
          sha256(
            payloadJson
          );

        const reportingDate =
          getReportingDate(
            row
          );

        return {
          source_row_number:
            index + 2,

          row_key:
            buildRowKey(
              row,
              reportingDate,
              rowHash
            ),

          row_hash:
            rowHash,

          reporting_date:
            reportingDate ||
            null,

          payload_json:
            payloadJson,
        };
      }
    );

  const contentHash =
    sha256(
      prepared
        .map(
          (row) =>
            row.row_hash
        )
        .sort()
        .join("|")
    );

  const batchId =
    `sheet_${contentHash.slice(
      0,
      24
    )}`;

  const bigquery =
    createBigQueryClient(
      config
    );

  const projectDataset =
    `${config.projectId}.${config.datasetId}`;

  const syncTable =
    `${projectDataset}.${config.syncTable}`;

  const [
    priorRuns,
  ] =
    await bigquery.query({
      location:
        config.location,

      query: `
        SELECT status
        FROM \`${syncTable}\`
        WHERE batch_id = @batchId
        ORDER BY started_at DESC
        LIMIT 1
      `,

      params: {
        batchId,
      },
    });

  if (
    String(
      (
        priorRuns[0] as
          | Record<
              string,
              unknown
            >
          | undefined
      )?.status ||
      ""
    ) === "success"
  ) {
    const [
      countRows,
    ] =
      await bigquery.query({
        location:
          config.location,

        query: `
          SELECT COUNT(*) AS row_count
          FROM \`${projectDataset}.${config.currentTable}\`
        `,
      });

    const currentRows =
      Number(
        (
          countRows[0] as
            | Record<
                string,
                unknown
              >
            | undefined
        )?.row_count ||
        0
      );

    const latestReportingDate =
      prepared
        .map(
          (row) =>
            row.reporting_date ||
            ""
        )
        .sort()
        .at(-1) ||
      "";

    return {
      ok:
        true,

      status:
        "skipped",

      batchId,
      sourceRows:
        prepared.length,
      currentRows,
      latestReportingDate,

      startedAt:
        startedAt.toISOString(),

      completedAt:
        new Date()
          .toISOString(),

      durationMs:
        Date.now() -
        startedAt.getTime(),
    };
  }

  const stageName =
    `meta_ads_stage_${contentHash.slice(
      0,
      16
    )}`;

  const stageTable =
    bigquery
      .dataset(
        config.datasetId
      )
      .table(stageName);

  const temporaryFile =
    path.join(
      os.tmpdir(),
      `${stageName}.ndjson`
    );

  const ndjson =
    prepared
      .map(
        (row) =>
          JSON.stringify(row)
      )
      .join("\n")
      .concat("\n");

  await fs.writeFile(
    temporaryFile,
    ndjson,
    "utf8"
  );

  try {
    const [
      stageExists,
    ] =
      await stageTable.exists();

    if (stageExists) {
      await stageTable.delete({
        ignoreNotFound:
          true,
      });
    }

    await stageTable.load(
      temporaryFile,
      {
        sourceFormat:
          "NEWLINE_DELIMITED_JSON",

        writeDisposition:
          "WRITE_TRUNCATE",

        location:
          config.location,

        schema: {
          fields: [
            {
              name:
                "source_row_number",
              type:
                "INTEGER",
              mode:
                "REQUIRED",
            },
            {
              name:
                "row_key",
              type:
                "STRING",
              mode:
                "REQUIRED",
            },
            {
              name:
                "row_hash",
              type:
                "STRING",
              mode:
                "REQUIRED",
            },
            {
              name:
                "reporting_date",
              type:
                "DATE",
              mode:
                "NULLABLE",
            },
            {
              name:
                "payload_json",
              type:
                "STRING",
              mode:
                "REQUIRED",
            },
          ],
        },
      }
    );

    await stageTable.setMetadata({
      expirationTime:
        String(
          Date.now() +
          2 *
            60 *
            60 *
            1000
        ),
    });

    const latestReportingDate =
      prepared
        .map(
          (row) =>
            row.reporting_date ||
            ""
        )
        .sort()
        .at(-1) ||
      "";

    await bigquery.query({
      location:
        config.location,

      params: {
        batchId,
        sourceRowCount:
          prepared.length,
        latestReportingDate:
          latestReportingDate ||
          null,
      },

      query: `
        BEGIN TRANSACTION;

        INSERT INTO
          \`${projectDataset}.${config.rawTable}\`
        (
          batch_id,
          ingested_at,
          source_row_number,
          row_key,
          row_hash,
          reporting_date,
          payload_json
        )
        SELECT
          @batchId,
          CURRENT_TIMESTAMP(),
          source_row_number,
          row_key,
          row_hash,
          reporting_date,
          payload_json
        FROM
          \`${projectDataset}.${stageName}\`
        WHERE NOT EXISTS (
          SELECT 1
          FROM
            \`${projectDataset}.${config.rawTable}\`
          WHERE batch_id = @batchId
        );

        MERGE
          \`${projectDataset}.${config.currentTable}\` AS target
        USING
          \`${projectDataset}.${stageName}\` AS source
        ON
          target.row_key =
          source.row_key

        WHEN MATCHED THEN
          UPDATE SET
            row_hash =
              source.row_hash,
            reporting_date =
              source.reporting_date,
            payload_json =
              source.payload_json,
            last_seen_at =
              CURRENT_TIMESTAMP(),
            last_batch_id =
              @batchId

        WHEN NOT MATCHED THEN
          INSERT
          (
            row_key,
            row_hash,
            reporting_date,
            payload_json,
            first_seen_at,
            last_seen_at,
            last_batch_id
          )
          VALUES
          (
            source.row_key,
            source.row_hash,
            source.reporting_date,
            source.payload_json,
            CURRENT_TIMESTAMP(),
            CURRENT_TIMESTAMP(),
            @batchId
          );

        DELETE FROM
          \`${projectDataset}.${config.syncTable}\`
        WHERE batch_id = @batchId;

        INSERT INTO
          \`${projectDataset}.${config.syncTable}\`
        (
          batch_id,
          started_at,
          completed_at,
          status,
          source_row_count,
          current_row_count,
          latest_reporting_date,
          error_message
        )
        SELECT
          @batchId,
          TIMESTAMP(
            '${startedAt.toISOString()}'
          ),
          CURRENT_TIMESTAMP(),
          'success',
          @sourceRowCount,
          (
            SELECT COUNT(*)
            FROM
              \`${projectDataset}.${config.currentTable}\`
          ),
          @latestReportingDate,
          '';

        COMMIT TRANSACTION;
      `,
    });

    const [
      countRows,
    ] =
      await bigquery.query({
        location:
          config.location,

        query: `
          SELECT COUNT(*) AS row_count
          FROM \`${projectDataset}.${config.currentTable}\`
        `,
      });

    const currentRows =
      Number(
        (
          countRows[0] as
            | Record<
                string,
                unknown
              >
            | undefined
        )?.row_count ||
        0
      );

    const completedAt =
      new Date();

    return {
      ok:
        true,

      status:
        "success",

      batchId,
      sourceRows:
        prepared.length,
      currentRows,
      latestReportingDate,

      startedAt:
        startedAt.toISOString(),

      completedAt:
        completedAt
          .toISOString(),

      durationMs:
        completedAt.getTime() -
        startedAt.getTime(),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    try {
      await bigquery.query({
        location:
          config.location,

        params: {
          batchId,
          sourceRowCount:
            prepared.length,
          errorMessage:
            message.slice(
              0,
              4000
            ),
        },

        query: `
          DELETE FROM
            \`${projectDataset}.${config.syncTable}\`
          WHERE batch_id = @batchId;

          INSERT INTO
            \`${projectDataset}.${config.syncTable}\`
          (
            batch_id,
            started_at,
            completed_at,
            status,
            source_row_count,
            current_row_count,
            latest_reporting_date,
            error_message
          )
          VALUES
          (
            @batchId,
            TIMESTAMP(
              '${startedAt.toISOString()}'
            ),
            CURRENT_TIMESTAMP(),
            'failed',
            @sourceRowCount,
            NULL,
            NULL,
            @errorMessage
          );
        `,
      });
    } catch {
      // Preserve the original ingestion error.
    }

    throw error;
  } finally {
    await fs.rm(
      temporaryFile,
      {
        force:
          true,
      }
    );

    try {
      await stageTable.delete({
        ignoreNotFound:
          true,
      });
    } catch {
      // The stage table also has expiration protection.
    }
  }
}
