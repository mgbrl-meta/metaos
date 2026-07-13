import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  syncMetaSheetToBigQuery,
} from "@/lib/meta-connections/server/bigQueryIngestionEngine";

import {
  getRuntimeConnectionConfig,
} from "@/lib/meta-connections/server/runtimeEnvironmentManager";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  300;

export async function GET(
  request: NextRequest
) {
  const expected =
    process.env.CRON_SECRET ||
    "";

  const supplied =
    request.headers.get(
      "authorization"
    ) ||
    "";

  if (
    !expected ||
    supplied !==
      `Bearer ${expected}`
  ) {
    return NextResponse.json(
      {
        ok:
          false,
        error:
          "Unauthorized",
      },
      {
        status:
          401,
      }
    );
  }

  const config =
    getRuntimeConnectionConfig();

  if (!config) {
    return NextResponse.json(
      {
        ok:
          false,

        error:
          "BigQuery is not configured.",
      },
      {
        status:
          409,
      }
    );
  }

  if (
    !config.autoSyncEnabled
  ) {
    return NextResponse.json({
      ok:
        true,
      skipped:
        true,
      reason:
        "Automatic sync is disabled.",
    });
  }

  try {
    const result =
      await syncMetaSheetToBigQuery(
        config
      );

    return NextResponse.json({
      ok:
        true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok:
          false,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status:
          500,
      }
    );
  }
}
