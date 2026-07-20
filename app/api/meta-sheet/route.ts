import {
  NextResponse,
} from "next/server";

import {
  getMetaSheetData,
  getMetaSheetHealth,
} from "@/lib/meta-sheet/service";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  300;

function json(
  body: unknown,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "private, no-store, max-age=0",

        "X-Content-Type-Options":
          "nosniff",
      },
    }
  );
}

export async function GET(
  request: Request
) {
  const url =
    new URL(request.url);

  const mode =
    url.searchParams.get(
      "mode"
    ) || "data";

  if (mode === "health") {
    const response =
      await getMetaSheetHealth();

    return json(
      response,
      response.ok
        ? 200
        : 500
    );
  }

  if (mode !== "data") {
    return json(
      {
        ok: false,
        source:
          "google_sheet",
        status:
          "error",

        error: {
          code:
            "INVALID_META_SHEET_MODE",

          message:
            'Use mode="health" or mode="data".',
        },
      },

      400
    );
  }

  const forceRefresh =
    url.searchParams.get(
      "refresh"
    ) === "1";

  const response =
    await getMetaSheetData(
      forceRefresh
    );

  return json(
    response,
    response.ok
      ? 200
      : 500
  );
}
