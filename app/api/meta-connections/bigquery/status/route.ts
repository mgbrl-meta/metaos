import {
  NextResponse,
} from "next/server";

import {
  getPublicConnectionStatus,
} from "@/lib/meta-connections/server/bigQueryConnectionManager";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const status =
      await getPublicConnectionStatus();

    return NextResponse.json({
      ok:
        true,
      status,
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
