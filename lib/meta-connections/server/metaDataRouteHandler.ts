import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  loadMetaRowsFromGateway,
} from "@/lib/meta-connections/server/metaDataGateway";

export async function handleMetaDataGet(
  request: NextRequest
) {
  const startedAt =
    Date.now();

  try {
    const requestedLimit =
      Number(
        request.nextUrl
          .searchParams
          .get("limit") ||
        "1000000"
      );

    const result =
      await loadMetaRowsFromGateway(
        requestedLimit
      );

    return NextResponse.json(
      {
        ok:
          true,

        ...result,

        returnedRowCount:
          result.rowCount,

        timingMs:
          Date.now() -
          startedAt,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok:
          false,

        source:
          "bigquery",

        error:
          error instanceof Error
            ? error.message
            : String(error),

        timingMs:
          Date.now() -
          startedAt,
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  }
}
