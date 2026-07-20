import type {
  MetaSheetResponse,
  MetaSheetSuccessResponse,
} from "./schema";

let initialRequest:
  Promise<MetaSheetSuccessResponse>
  | null = null;

function isSuccessResponse(
  response: MetaSheetResponse
): response is MetaSheetSuccessResponse {
  return response.ok === true;
}

async function parseResponse(
  response: Response
): Promise<MetaSheetSuccessResponse> {
  const payload =
    (await response.json()) as MetaSheetResponse;

  if (
    !response.ok ||
    !isSuccessResponse(payload)
  ) {
    const message =
      payload.ok === false
        ? payload.error.message
        : `Meta Sheet request failed with HTTP ${response.status}.`;

    throw new Error(message);
  }

  return payload;
}

async function requestMetaSheet(
  forceRefresh: boolean,
  signal?: AbortSignal
): Promise<MetaSheetSuccessResponse> {
  const searchParams =
    new URLSearchParams({
      mode: "data",
    });

  if (forceRefresh) {
    searchParams.set(
      "refresh",
      "1"
    );
  }

  const response =
    await fetch(
      `/api/meta-sheet?${searchParams.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        signal,
        headers: {
          Accept:
            "application/json",

          "Cache-Control":
            forceRefresh
              ? "no-cache"
              : "no-store",

          Pragma:
            "no-cache",
        },
      }
    );

  return parseResponse(
    response
  );
}

export async function loadMetaSheetData(
  options?: {
    forceRefresh?: boolean;
    signal?: AbortSignal;
  }
): Promise<MetaSheetSuccessResponse> {
  const forceRefresh =
    Boolean(
      options?.forceRefresh
    );

  if (forceRefresh) {
    return requestMetaSheet(
      true,
      options?.signal
    );
  }

  if (initialRequest) {
    return initialRequest;
  }

  const request =
    requestMetaSheet(
      false,
      options?.signal
    );

  initialRequest =
    request;

  try {
    return await request;
  } finally {
    if (
      initialRequest === request
    ) {
      initialRequest =
        null;
    }
  }
}

export async function loadMetaSheetHealth(
  signal?: AbortSignal
) {
  const response =
    await fetch(
      "/api/meta-sheet?mode=health",
      {
        cache:
          "no-store",

        signal,

        headers: {
          Accept:
            "application/json",

          "Cache-Control":
            "no-store",
        },
      }
    );

  const payload =
    await response.json();

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
      `Meta Sheet health check failed with HTTP ${response.status}.`
    );
  }

  return payload;
}
