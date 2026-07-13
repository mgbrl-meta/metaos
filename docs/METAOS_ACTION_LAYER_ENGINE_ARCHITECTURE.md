# MetaOS Action-Layer Engine Architecture

## Purpose

Step 6B1 removes business logic from the remaining action-layer screen components before their visual migration.

No visible workspace module is switched during this step.

## Clean data extension

`MetaV2CleanRow` now preserves `creativeName` separately from `adName`.

This prevents creator-video and creative-level screens from losing the distinct creative identifier during normalization.

## Shared action-layer utilities

`engineUtils.ts` now owns:

- UTC-safe date movement
- Inclusive rolling date ranges
- Date-range row filtering
- Relative change
- Bounded scoring

These utilities eliminate duplicated date-window implementations across Summary, Priority and Influencer screens.

## Executive Summary engine

Path:

`performanceRows → normalizeMetaV2Rows → buildMetaV2ExecutiveSummary`

Owns:

- Current 30 days
- Prior 30 days
- Last 7 days
- Campaign aggregation
- Snapshot movement
- Metric status
- Structural issue detection
- Budget concentration
- Prospecting share
- Campaign fatigue
- Operator action signals

## Priority engine

Path:

`performanceRows → normalizeMetaV2Rows → buildMetaV2PriorityMatrix`

Owns:

- Latest-active ad qualification
- Lifetime, last-7-day and previous-7-day totals
- CPA, ROAS, CTR, CPM and spend movement
- Bad Scale
- Scale Fatigue
- CPA Decay
- ROAS Decay
- Attention Decay
- Efficient Scale
- Underfed Winner
- De-scaling score
- Scaling score
- Ranked queues
- Daily trend
- Protected decision-rule output

## Influencer engine

Path:

`performanceRows → normalizeMetaV2Rows → buildMetaV2InfluencerQueue`

Owns:

- Influencer/creator intent detection
- Latest active date
- Yesterday
- Last 7 days
- Last 14 days
- Last 30 days
- Spend threshold
- Text search
- Top Spender
- Approval Check
- Monitor

## Ownership rules

1. Engines consume only `MetaV2CleanRow`.
2. Engines use centralized metrics for all primitive calculations.
3. Engines do not import stores or frontend components.
4. Frontend modules will only format, sort, paginate, export and render prepared outputs.
5. Existing UI remains active until Step 6B2 passes all QC.
