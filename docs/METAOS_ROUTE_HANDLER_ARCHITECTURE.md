# MetaOS Route Handler Architecture

## Shared handler

`lib/meta-connections/server/metaDataRouteHandler.ts`

Owns:

- Gateway invocation
- Response contract
- Error contract
- Row-limit handling
- Cache-control response headers

## Route wrappers

`app/api/meta-data/route.ts`

Primary architecture-owned Meta data endpoint.

`app/api/meta-bq/route.ts`

Backward-compatible endpoint retained for existing integrations.

Each route declares its own Next.js route configuration as direct,
statically analyzable exports.

Neither route duplicates BigQuery or gateway logic.
