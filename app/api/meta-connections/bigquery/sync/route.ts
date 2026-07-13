import {
  NextResponse,
} from "next/server";

import {
  assertConnectionAdmin,
} from "@/lib/meta-connections/server/connectionAdmin";

import {
  runtimeConfigFromInput,
} from "@/lib/meta-connections/server/bigQueryConnectionManager";

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

export async function POST(
  request: Request
) {
  try {
    assertConnectionAdmin(
      request
    );

    let input:
      Record<
        string,
        unknown
      > = {};

    try {
      input =
        await request.json();
    } catch {
      input = {};
    }

    const config =
      input.privateKey
        ? runtimeConfigFromInput(
            input as never
          )
        : getRuntimeConnectionConfig();

    if (!config) {
      throw new Error(
        "BigQuery is not configured."
      );
    }

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
          400,
      }
    );
  }
}
