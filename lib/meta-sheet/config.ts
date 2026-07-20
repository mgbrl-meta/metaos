export interface MetaSheetConfig {
  spreadsheetId: string;
  sheetTab: string;
  clientEmail: string;
  privateKey: string;

  cacheTtlMs: number;
  requestTimeoutMs: number;
  chunkSize: number;
  batchConcurrency: number;
}

function required(
  names: string[]
) {
  for (const name of names) {
    const value =
      String(
        process.env[name] || ""
      ).trim();

    if (value) {
      return value;
    }
  }

  throw new Error(
    `Missing environment variable: ${names.join(" or ")}`
  );
}

function positiveInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
) {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < minimum
  ) {
    return fallback;
  }

  return Math.min(
    Math.floor(parsed),
    maximum
  );
}

export function normalizePrivateKey(
  rawValue: string
) {
  let value =
    String(rawValue || "")
      .trim();

  if (
    (
      value.startsWith('"') &&
      value.endsWith('"')
    ) ||
    (
      value.startsWith("'") &&
      value.endsWith("'")
    )
  ) {
    try {
      value =
        JSON.parse(value);
    } catch {
      value =
        value.slice(1, -1);
    }
  }

  value = value
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();

  if (
    !value.includes(
      "-----BEGIN PRIVATE KEY-----"
    ) ||
    !value.includes(
      "-----END PRIVATE KEY-----"
    )
  ) {
    throw new Error(
      "Google service-account private key is invalid."
    );
  }

  return `${value}\n`;
}

export function getMetaSheetConfig():
  MetaSheetConfig {
  return {
    spreadsheetId:
      required([
        "META_SHEET_ID",
      ]),

    sheetTab:
      String(
        process.env
          .META_SHEET_TAB ||
        "meta_ads_raw_data"
      ).trim(),

    clientEmail:
      required([
        "GCP_CLIENT_EMAIL",
        "GOOGLE_CLIENT_EMAIL",
      ]),

    privateKey:
      normalizePrivateKey(
        required([
          "GCP_PRIVATE_KEY",
          "GOOGLE_PRIVATE_KEY",
        ])
      ),

    cacheTtlMs:
      positiveInteger(
        process.env
          .META_SHEET_CACHE_TTL_MS,
        5 * 60 * 1000,
        30_000,
        60 * 60 * 1000
      ),

    requestTimeoutMs:
      positiveInteger(
        process.env
          .META_SHEET_REQUEST_TIMEOUT_MS,
        120_000,
        30_000,
        240_000
      ),

    chunkSize:
      positiveInteger(
        process.env
          .META_SHEET_CHUNK_SIZE,
        5_000,
        500,
        10_000
      ),

    batchConcurrency:
      positiveInteger(
        process.env
          .META_SHEET_BATCH_CONCURRENCY,
        3,
        1,
        6
      ),
  };
}

export function getMetaSheetEnvironmentStatus() {
  const privateKey =
    String(
      process.env
        .GCP_PRIVATE_KEY ||
      process.env
        .GOOGLE_PRIVATE_KEY ||
      ""
    );

  return {
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
      Boolean(privateKey),

    privateKeyEnvelopeValid:
      privateKey.includes(
        "BEGIN PRIVATE KEY"
      ) &&
      privateKey.includes(
        "END PRIVATE KEY"
      ),
  };
}
