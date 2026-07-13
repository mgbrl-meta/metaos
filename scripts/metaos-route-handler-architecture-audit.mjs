import fs from "node:fs";

const files = {
  handler:
    "lib/meta-connections/server/metaDataRouteHandler.ts",

  primaryRoute:
    "app/api/meta-data/route.ts",

  compatibilityRoute:
    "app/api/meta-bq/route.ts",
};

function fail(message) {
  console.error(
    `❌ ${message}`
  );

  process.exitCode = 1;
}

function read(filename) {
  if (!fs.existsSync(filename)) {
    fail(
      `Missing route architecture file: ${filename}`
    );

    return "";
  }

  return fs.readFileSync(
    filename,
    "utf8"
  );
}

const source =
  Object.fromEntries(
    Object.entries(files).map(
      ([key, filename]) => [
        key,
        read(filename),
      ]
    )
  );

for (const token of [
  "handleMetaDataGet",
  "loadMetaRowsFromGateway",
  "NextResponse.json",
]) {
  if (
    !source.handler.includes(
      token
    )
  ) {
    fail(
      `Shared route handler lost: ${token}`
    );
  }
}

for (const forbidden of [
  "export const runtime",
  "export const dynamic",
  "export const revalidate",
]) {
  if (
    source.handler.includes(
      forbidden
    )
  ) {
    fail(
      `Route configuration exists inside shared handler: ${forbidden}`
    );
  }
}

for (const routeName of [
  "primaryRoute",
  "compatibilityRoute",
]) {
  const route =
    source[routeName];

  for (const token of [
    'export const runtime = "nodejs";',
    'export const dynamic = "force-dynamic";',
    "export const revalidate = 0;",
    "handleMetaDataGet",
    "return handleMetaDataGet",
  ]) {
    if (!route.includes(token)) {
      fail(
        `${routeName} lost direct route contract: ${token}`
      );
    }
  }

  if (
    /export\s*\{[\s\S]*?(runtime|dynamic|revalidate)/m.test(
      route
    )
  ) {
    fail(
      `${routeName} re-exports route configuration.`
    );
  }

  if (
    route.includes(
      "loadMetaRowsFromGateway"
    )
  ) {
    fail(
      `${routeName} duplicates gateway logic instead of using the shared handler.`
    );
  }
}

if (process.exitCode) {
  console.error("");
  console.error(
    "MetaOS route-handler architecture audit failed."
  );

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Route Handler Architecture Audit"
);
console.log(
  "======================================="
);
console.log(
  "✅ One shared Meta data request handler."
);
console.log(
  "✅ /api/meta-data owns direct static route configuration."
);
console.log(
  "✅ /api/meta-bq owns direct static route configuration."
);
console.log(
  "✅ Route configuration is not re-exported."
);
console.log(
  "✅ Gateway and response logic are not duplicated."
);
console.log(
  "✅ Compatibility route remains available."
);
console.log(
  "✅ Route-handler architecture: PASS"
);
