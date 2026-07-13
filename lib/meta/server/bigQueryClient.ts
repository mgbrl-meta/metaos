import { BigQuery } from "@google-cloud/bigquery";

let cachedClient: BigQuery | null = null;

function stripOuterQuotes(value: string): string {
  const trimmed = value.trim();

  if (
    trimmed.length >= 2 &&
    (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    )
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function normalizePrivateKey(value: string): string {
  return stripOuterQuotes(value)
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}

function requireEnvironmentValue(name: string): string {
  const value = stripOuterQuotes(process.env[name] || "");

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getBigQueryClient(): BigQuery {
  if (cachedClient) {
    return cachedClient;
  }

  const projectId = requireEnvironmentValue("GCP_PROJECT_ID");
  const clientEmail = requireEnvironmentValue("GCP_CLIENT_EMAIL");

  const privateKey = normalizePrivateKey(
    requireEnvironmentValue("GCP_PRIVATE_KEY")
  );

  if (
    !privateKey.includes("-----BEGIN PRIVATE KEY-----") ||
    !privateKey.includes("-----END PRIVATE KEY-----")
  ) {
    throw new Error(
      "GCP_PRIVATE_KEY does not contain a valid private-key envelope."
    );
  }

  cachedClient = new BigQuery({
    projectId,

    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });

  return cachedClient;
}

export function getMetaBigQueryTable(): string {
  const tableRef = requireEnvironmentValue("BQ_META_TABLE");

  if (tableRef.split(".").length !== 3) {
    throw new Error(
      "BQ_META_TABLE must use project.dataset.table format."
    );
  }

  return tableRef;
}

export function getBigQueryLocation(): string | undefined {
  const value = stripOuterQuotes(process.env.BQ_LOCATION || "");

  return value || undefined;
}
