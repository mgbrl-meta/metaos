import {
  NextResponse,
} from "next/server";

import {
  assertConnectionAdmin,
} from "@/lib/meta-connections/server/connectionAdmin";

import {
  testBigQueryConnection,
} from "@/lib/meta-connections/server/bigQueryConnectionManager";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export async function POST(
  request: Request
) {
  try {
    assertConnectionAdmin(
      request
    );

    const input =
      await request.json();

    const result =
      await testBigQueryConnection(
        input
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
