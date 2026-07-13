import {
  NextResponse,
} from "next/server";

import {
  assertConnectionAdmin,
} from "@/lib/meta-connections/server/connectionAdmin";

import {
  provisionMetaTables,
  runtimeConfigFromInput,
  testBigQueryConnection,
} from "@/lib/meta-connections/server/bigQueryConnectionManager";

import {
  syncMetaSheetToBigQuery,
} from "@/lib/meta-connections/server/bigQueryIngestionEngine";

import {
  saveConnectionEnvironment,
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

    const input =
      await request.json();

    const test =
      await testBigQueryConnection(
        input
      );

    const runtimeConfig =
      runtimeConfigFromInput(
        input
      );

    await provisionMetaTables(
      runtimeConfig
    );

    const save =
      await saveConnectionEnvironment(
        input
      );

    const sync =
      input.syncAfterSave
        ? await syncMetaSheetToBigQuery(
            runtimeConfig
          )
        : null;

    return NextResponse.json({
      ok:
        true,
      test,
      save,
      sync,
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
