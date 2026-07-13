import {
  BigQuery,
} from "@google-cloud/bigquery";

import {
  google,
} from "googleapis";

import type {
  BigQueryRuntimeConfig,
} from "@/lib/meta-connections/contracts";

export function createBigQueryClient(
  config: BigQueryRuntimeConfig
): BigQuery {
  return new BigQuery({
    projectId:
      config.projectId,

    credentials: {
      client_email:
        config.serviceAccountEmail,

      private_key:
        config.privateKey,
    },
  });
}

export function createGoogleSheetsClient(
  config: BigQueryRuntimeConfig
) {
  const auth =
    new google.auth.JWT({
      email:
        config.serviceAccountEmail,

      key:
        config.privateKey,

      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
      ],
    });

  return google.sheets({
    version:
      "v4",

    auth,
  });
}
