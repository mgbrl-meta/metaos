# MetaOS Remaining Meta Screen Migration Contract

## Scope

Eleven Meta modules remain after completion of the protected engine-screen migration:

- Summary
- Top De-scaling Priorities
- Top Scaling Priorities
- Influencer Ads
- High CPA
- GPT
- High ROAS
- Spend
- Creative
- Creative Ageing
- Monthly

These modules currently occupy ten source files because the scaling and de-scaling modules share `PrioritySplitTabs.tsx`.

## Why this contract exists

Several remaining screens contain combinations of:

- Raw store-row access
- Local metric calculation
- Local lifetime aggregation
- Local seven-day aggregation
- Date-key helpers
- Threshold qualification
- Clipboard actions
- CSV or file exports
- Screen-specific filters
- Expandable detail logic

A visual rewrite without first identifying these responsibilities would recreate the patch system inside new components.

## Migration gate

A remaining screen may migrate only when:

1. Its existing renderer and functionality are frozen.
2. Its local calculations have been identified.
3. Calculation and qualification logic is moved into an engine or prepared adapter.
4. Clipboard and export behavior is explicitly preserved.
5. Filters and thresholds remain controlled.
6. The new module uses shared primitives and tables.
7. No raw Meta export columns are read by the screen.
8. No business formula is implemented inside the screen.
9. TypeScript, build and all blocking QC pass.

## Planned groups

### Step 6B — Action and executive layer

- Summary
- Top De-scaling
- Top Scaling
- Influencer Ads

### Step 6C — Economic control layer

- High CPA
- GPT
- High ROAS

### Step 6D — Reporting and creative layer

- Spend
- Creative
- Creative Ageing
- Monthly
