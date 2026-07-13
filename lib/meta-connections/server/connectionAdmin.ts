import crypto from "node:crypto";

function safeEqual(
  left: string,
  right: string
): boolean {
  const leftBuffer =
    Buffer.from(left);

  const rightBuffer =
    Buffer.from(right);

  if (
    leftBuffer.length !==
    rightBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    leftBuffer,
    rightBuffer
  );
}

export function assertConnectionAdmin(
  request: Request
): void {
  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    return;
  }

  const expected =
    process.env.METAOS_ADMIN_KEY ||
    "";

  const supplied =
    request.headers.get(
      "x-metaos-admin-key"
    ) ||
    "";

  if (
    !expected ||
    !supplied ||
    !safeEqual(
      expected,
      supplied
    )
  ) {
    throw new Error(
      "Unauthorized connection-management request."
    );
  }
}
