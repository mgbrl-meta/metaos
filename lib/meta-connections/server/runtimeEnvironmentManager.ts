import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import type {
  BigQueryConnectionInput,
  BigQueryRuntimeConfig,
} from "@/lib/meta-connections/contracts";

const MANAGED_KEYS = [
  "META_DATA_SOURCE",
  "META_BQ_PROJECT_ID",
  "META_BQ_DATASET",
  "META_BQ_LOCATION",
  "META_BQ_RAW_TABLE",
  "META_BQ_CURRENT_TABLE",
  "META_BQ_SYNC_TABLE",
  "META_SHEET_ID",
  "META_SHEET_TAB",
  "GCP_PROJECT_ID",
  "GCP_CLIENT_EMAIL",
  "GCP_PRIVATE_KEY",
  "META_AUTO_SYNC_ENABLED",
  "METAOS_ADMIN_KEY",
  "CRON_SECRET",
] as const;

function stripOuterQuotes(
  value: string
): string {
  const trimmed = value.trim();

  if (
    trimmed.length >= 2 &&
    (
      (
        trimmed.startsWith('"') &&
        trimmed.endsWith('"')
      ) ||
      (
        trimmed.startsWith("'") &&
        trimmed.endsWith("'")
      )
    )
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function normalizePrivateKey(
  value: string
): string {
  return stripOuterQuotes(value)
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}

function parseEnvironmentFile(
  source: string
): Record<string, string> {
  const output:
    Record<string, string> = {};

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (
      !trimmed ||
      trimmed.startsWith("#")
    ) {
      continue;
    }

    const equalsIndex =
      trimmed.indexOf("=");

    if (equalsIndex <= 0) {
      continue;
    }

    const key =
      trimmed
        .slice(0, equalsIndex)
        .trim();

    let value =
      trimmed
        .slice(equalsIndex + 1)
        .trim();

    if (
      value.startsWith('"') &&
      value.endsWith('"')
    ) {
      try {
        value = JSON.parse(value);
      } catch {
        value = stripOuterQuotes(value);
      }
    } else {
      value = stripOuterQuotes(value);
    }

    output[key] = value;
  }

  return output;
}

function readLocalEnvironment():
  Record<string, string> {
  if (
    process.env.NODE_ENV === "production"
  ) {
    return {};
  }

  const filename =
    path.join(
      process.cwd(),
      ".env.local"
    );

  if (!fs.existsSync(filename)) {
    return {};
  }

  return parseEnvironmentFile(
    fs.readFileSync(
      filename,
      "utf8"
    )
  );
}

function getMergedEnvironment():
  Record<string, string | undefined> {
  return {
    ...process.env,
    ...readLocalEnvironment(),
  };
}

function requiredValue(
  environment:
    Record<string, string | undefined>,
  key: string
): string {
  const value =
    String(
      environment[key] || ""
    ).trim();

  if (!value) {
    throw new Error(
      `Missing required runtime setting: ${key}`
    );
  }

  return value;
}

function identifier(
  value: string,
  label: string
): string {
  const cleaned = value.trim();

  if (
    !/^[A-Za-z0-9_-]+$/.test(cleaned)
  ) {
    throw new Error(
      `${label} contains unsupported characters.`
    );
  }

  return cleaned;
}

export function validateConnectionInput(
  input: BigQueryConnectionInput
): BigQueryConnectionInput {
  const privateKey =
    normalizePrivateKey(
      input.privateKey
    );

  if (
    !privateKey.includes(
      "-----BEGIN PRIVATE KEY-----"
    ) ||
    !privateKey.includes(
      "-----END PRIVATE KEY-----"
    )
  ) {
    throw new Error(
      "The service-account private key is incomplete."
    );
  }

  return {
    ...input,

    projectId:
      identifier(
        input.projectId,
        "Project ID"
      ),

    datasetId:
      identifier(
        input.datasetId,
        "Dataset ID"
      ),

    location:
      input.location.trim(),

    rawTable:
      identifier(
        input.rawTable,
        "Raw table"
      ),

    currentTable:
      identifier(
        input.currentTable,
        "Current table"
      ),

    syncTable:
      identifier(
        input.syncTable,
        "Sync table"
      ),

    sheetId:
      input.sheetId.trim(),

    sheetTab:
      input.sheetTab.trim(),

    serviceAccountEmail:
      input.serviceAccountEmail.trim(),

    privateKey,

    autoSyncEnabled:
      Boolean(
        input.autoSyncEnabled
      ),

    syncAfterSave:
      Boolean(
        input.syncAfterSave
      ),
  };
}

export function getRuntimeConnectionConfig():
  BigQueryRuntimeConfig | null {
  const environment =
    getMergedEnvironment();

  if (
    environment.META_DATA_SOURCE !==
    "bigquery"
  ) {
    return null;
  }

  try {
    return {
      projectId:
        identifier(
          requiredValue(
            environment,
            "META_BQ_PROJECT_ID"
          ),
          "META_BQ_PROJECT_ID"
        ),

      datasetId:
        identifier(
          requiredValue(
            environment,
            "META_BQ_DATASET"
          ),
          "META_BQ_DATASET"
        ),

      location:
        requiredValue(
          environment,
          "META_BQ_LOCATION"
        ),

      rawTable:
        identifier(
          requiredValue(
            environment,
            "META_BQ_RAW_TABLE"
          ),
          "META_BQ_RAW_TABLE"
        ),

      currentTable:
        identifier(
          requiredValue(
            environment,
            "META_BQ_CURRENT_TABLE"
          ),
          "META_BQ_CURRENT_TABLE"
        ),

      syncTable:
        identifier(
          requiredValue(
            environment,
            "META_BQ_SYNC_TABLE"
          ),
          "META_BQ_SYNC_TABLE"
        ),

      sheetId:
        requiredValue(
          environment,
          "META_SHEET_ID"
        ),

      sheetTab:
        requiredValue(
          environment,
          "META_SHEET_TAB"
        ),

      serviceAccountEmail:
        requiredValue(
          environment,
          "GCP_CLIENT_EMAIL"
        ),

      privateKey:
        normalizePrivateKey(
          requiredValue(
            environment,
            "GCP_PRIVATE_KEY"
          )
        ),

      autoSyncEnabled:
        String(
          environment
            .META_AUTO_SYNC_ENABLED ||
          "false"
        ).toLowerCase() ===
        "true",
    };
  } catch {
    return null;
  }
}

function environmentValues(
  input: BigQueryConnectionInput,
  existingAdminKey = "",
  existingCronSecret = ""
): Record<string, string> {
  const adminKey =
    input.adminKey?.trim() ||
    existingAdminKey ||
    crypto
      .randomBytes(24)
      .toString("hex");

  const cronSecret =
    existingCronSecret ||
    crypto
      .randomBytes(32)
      .toString("hex");

  return {
    META_DATA_SOURCE:
      "bigquery",

    META_BQ_PROJECT_ID:
      input.projectId,

    META_BQ_DATASET:
      input.datasetId,

    META_BQ_LOCATION:
      input.location,

    META_BQ_RAW_TABLE:
      input.rawTable,

    META_BQ_CURRENT_TABLE:
      input.currentTable,

    META_BQ_SYNC_TABLE:
      input.syncTable,

    META_SHEET_ID:
      input.sheetId,

    META_SHEET_TAB:
      input.sheetTab,

    GCP_PROJECT_ID:
      input.projectId,

    GCP_CLIENT_EMAIL:
      input.serviceAccountEmail,

    GCP_PRIVATE_KEY:
      input.privateKey,

    META_AUTO_SYNC_ENABLED:
      String(
        input.autoSyncEnabled
      ),

    METAOS_ADMIN_KEY:
      adminKey,

    CRON_SECRET:
      cronSecret,
  };
}

function writeLocalEnvironment(
  values:
    Record<string, string>
): void {
  const filename =
    path.join(
      process.cwd(),
      ".env.local"
    );

  const existing =
    fs.existsSync(filename)
      ? fs
          .readFileSync(
            filename,
            "utf8"
          )
          .split(/\r?\n/)
      : [];

  const managed =
    new Set<string>(
      MANAGED_KEYS
    );

  const preserved =
    existing.filter(
      (line) => {
        const trimmed =
          line.trim();

        if (
          !trimmed ||
          trimmed.startsWith("#")
        ) {
          return true;
        }

        const equalsIndex =
          trimmed.indexOf("=");

        if (equalsIndex <= 0) {
          return true;
        }

        const key =
          trimmed
            .slice(
              0,
              equalsIndex
            )
            .trim();

        return !managed.has(key);
      }
    );

  const newLines = [
    "",
    "# MetaOS managed data connection",
    ...Object.entries(values).map(
      ([key, value]) =>
        `${key}=${JSON.stringify(value)}`
    ),
  ];

  fs.writeFileSync(
    filename,
    [
      ...preserved,
      ...newLines,
    ]
      .join("\n")
      .trim()
      .concat("\n"),
    {
      mode: 0o600,
    }
  );
}

async function writeVercelEnvironment(
  input: BigQueryConnectionInput,
  values: Record<string, string>
): Promise<boolean> {
  const projectId =
    input.vercelProjectId?.trim();

  const accessToken =
    input.vercelAccessToken?.trim();

  if (
    !projectId ||
    !accessToken
  ) {
    return false;
  }

  const teamId =
    input.vercelTeamId?.trim();

  const query =
    new URLSearchParams({
      upsert:
        "true",
    });

  if (teamId) {
    query.set(
      "teamId",
      teamId
    );
  }

  const response =
    await fetch(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(
        projectId
      )}/env?${query.toString()}`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            Object.entries(values).map(
              ([key, value]) => ({
                key,
                value,

                type:
                  key.includes(
                    "PRIVATE_KEY"
                  ) ||
                  key.includes(
                    "SECRET"
                  ) ||
                  key.includes(
                    "ADMIN_KEY"
                  )
                    ? "encrypted"
                    : "plain",

                target: [
                  "production",
                  "preview",
                ],

                comment:
                  "Managed by MetaOS Data Connection Center",
              })
            )
          ),
      }
    );

  const payload =
    await response.json();

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
      payload?.message ||
      "Vercel environment update failed."
    );
  }

  if (
    Array.isArray(
      payload?.failed
    ) &&
    payload.failed.length
  ) {
    throw new Error(
      `Vercel rejected ${payload.failed.length} environment variable(s).`
    );
  }

  return true;
}

async function triggerDeploymentHook(
  url: string
): Promise<boolean> {
  const cleaned =
    url.trim();

  if (!cleaned) {
    return false;
  }

  const response =
    await fetch(
      cleaned,
      {
        method:
          "POST",
      }
    );

  if (!response.ok) {
    throw new Error(
      "The Vercel deployment hook failed."
    );
  }

  return true;
}

export async function saveConnectionEnvironment(
  rawInput: BigQueryConnectionInput
) {
  const input =
    validateConnectionInput(
      rawInput
    );

  const current =
    getMergedEnvironment();

  const values =
    environmentValues(
      input,
      String(
        current.METAOS_ADMIN_KEY ||
        ""
      ),
      String(
        current.CRON_SECRET ||
        ""
      )
    );

  let localSaved = false;

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    writeLocalEnvironment(
      values
    );

    localSaved = true;
  }

  const vercelSaved =
    await writeVercelEnvironment(
      input,
      values
    );

  const deploymentTriggered =
    input.deploymentHookUrl
      ? await triggerDeploymentHook(
          input.deploymentHookUrl
        )
      : false;

  return {
    localSaved,
    vercelSaved,
    deploymentTriggered,

    redeployRequired:
      vercelSaved &&
      !deploymentTriggered,

    generatedAdminKey:
      !input.adminKey &&
      !current.METAOS_ADMIN_KEY
        ? values.METAOS_ADMIN_KEY
        : "",
  };
}
