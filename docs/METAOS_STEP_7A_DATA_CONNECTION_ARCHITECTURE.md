# MetaOS Step 7A

## Canonical data path

Google Sheet  
→ ingestion engine  
→ append-only raw history  
→ deduplicated current table  
→ `/api/meta-data`  
→ `MetaDataStatus`  
→ `metaStore.performanceRows`  
→ normalization  
→ calculation core  
→ metrics  
→ decision rules  
→ engines  
→ architecture-owned modules

## Connection ownership

All connection configuration is owned by:

`Settings → Data Connections`

No dashboard module owns credentials, BigQuery queries or ingestion.

## Sync ownership

Manual sync and scheduled sync both call:

`syncMetaSheetToBigQuery`

The ingestion is content-addressed and idempotent. Reprocessing the
same Sheet state safely returns a skipped result.

## Navigation

Google Operations remains in the internal canonical registry and
renderer contract but is excluded from workspace navigation, search,
recent modules and persisted active state.

## Security

- Private keys remain server-side.
- Private keys are never returned by status APIs.
- Browser localStorage and sessionStorage are not used.
- Production management endpoints require an admin key.
- Cron requests require CRON_SECRET.
