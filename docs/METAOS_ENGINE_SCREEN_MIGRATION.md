# MetaOS Protected Engine Screen Migration

## Completed architecture-owned screens

The `/workspace` route now owns all four protected V2 screens:

- Command Center
- Data QC
- Zero Purchase
- Funnel

Legacy routes remain available for rollback and comparison.

## Canonical data paths

### Command Center

`performanceRows → normalizeMetaV2Rows → buildMetaV2CommandCenter → CommandCenterModule`

### Data QC

`performanceRows → normalizeMetaV2Rows → buildMetaV2DataQc → DataQcModule`

The module also consumes:

`metaStore.metaQcSummary → suspiciousRows → source-row inspection`

This preserves:

- Source QC flags
- Shifted-row correction visibility
- Critical and warning rows
- CSV export

### Zero Purchase

`performanceRows → normalizeMetaV2Rows → buildMetaV2ZeroPurchase → ZeroPurchaseModule`

This preserves:

- Configurable spend threshold
- Latest-date activity qualification
- Last-seven-day activity qualification
- Severity
- Operator reason and action
- Copy handles
- Copy full names
- Search and filtering
- Sorting and pagination
- Expandable daily trend

### Funnel

`performanceRows → normalizeMetaV2Rows → buildMetaV2Funnel → FunnelModule`

This preserves:

- Account funnel totals
- Month grouping
- Week grouping
- Strongest month
- Weakest month
- Month expansion
- Click, LPV, ATC, checkout, payment and purchase metrics
- LPV, ATC, checkout, payment and purchase conversion rates
- CPA, ROAS and GPT
- Settings-aware semantic performance tones

## Ownership rules

1. Screens never read raw Meta export columns.
2. Screens never calculate ROAS, CPA, GPT or funnel rates.
3. Engines remain the owner of grouping and business calculations.
4. Frontend modules own only presentation and controlled interaction state.
5. Tables consume prepared engine objects.
6. Styling remains scoped under `.metaos-ui`.
7. Legacy screens are not modified during workspace migration.
