import type {
  NextRequest,
} from "next/server";

import {
  handleMetaDataGet,
} from "@/lib/meta-connections/server/metaDataRouteHandler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest
) {
  return handleMetaDataGet(
    request
  );
}
