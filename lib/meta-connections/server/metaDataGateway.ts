import {
  createBigQueryClient,
} from "@/lib/meta-connections/server/bigQueryClients";

import {
  getRuntimeConnectionConfig,
} from "@/lib/meta-connections/server/runtimeEnvironmentManager";

function normalizeScalar(
  value: unknown
): unknown {
  if (
    value &&
    typeof value === "object" &&
    "value" in value
  ) {
    return (
      value as {
        value:
          unknown;
      }
    ).value;
  }

  return value;
}

export async function loadMetaRowsFromGateway(
  requestedLimit:
    number
) {
  const config =
    getRuntimeConnectionConfig();

  if (!config) {
    throw new Error(
      "BigQuery is not configured. Open Settings → Data Connections."
    );
  }

  const limit =
    Number.isFinite(
      requestedLimit
    ) &&
    requestedLimit > 0
      ? Math.min(
          1000000,
          Math.floor(
            requestedLimit
          )
        )
      : 1000000;

  const bigquery =
    createBigQueryClient(
      config
    );

  const table =
    `${config.projectId}.${config.datasetId}.${config.currentTable}`;

  const [
    queryRows,
  ] =
    await bigquery.query({
      location:
        config.location,

      query: `
        SELECT
          reporting_date,
          payload_json
        FROM \`${table}\`
        ORDER BY
          reporting_date DESC,
          row_key
        LIMIT ${limit}
      `,
    });

  const rows =
    queryRows.map(
      (
        row:
          Record<
            string,
            unknown
          >
      ) => {
        const rawPayload =
          String(
            normalizeScalar(
              row.payload_json
            ) ||
            "{}"
          );

        return JSON.parse(
          rawPayload
        ) as
          Record<
            string,
            unknown
          >;
      }
    );

  const latestDate =
    String(
      normalizeScalar(
        (
          queryRows[0] as
            | Record<
                string,
                unknown
              >
            | undefined
        )?.reporting_date
      ) ||
      ""
    );

  return {
    source:
      "bigquery" as const,

    sourceLabel:
      "BigQuery",

    table,
    latestDate,
    rowCount:
      rows.length,
    rows,
    generatedAt:
      new Date()
        .toISOString(),
  };
}
