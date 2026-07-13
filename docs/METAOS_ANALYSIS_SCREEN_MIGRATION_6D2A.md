# MetaOS Step 6D2A

## Migrated modules

- Spend Analysis
- Creative Fatigue

## Spend Analysis data path

`performanceRows → normalizeMetaV2Rows → buildMetaV2SpendAnalysis → SpendAnalysisModule`

Preserved:

- Live ads only
- 7D, 14D, 30D, 60D, 90D, all-time and custom ranges
- Daily spend, revenue, CPA and ROAS
- Equal-period comparisons
- Campaign, ad-set and ad allocation
- Spend and revenue concentration
- Search, sorting, density and pagination

## Creative Fatigue data path

`performanceRows → normalizeMetaV2Rows → buildMetaV2CreativeFatigue → CreativeFatigueModule`

Preserved:

- CPM inflation
- CTR decline
- Thumbstop weakness
- Frequency pressure
- 1–4 signal qualification
- Refresh-priority and watch states
- Creative-handle clipboard
- Full-name clipboard
- Search, sorting, density, pagination and expansion

## Still frozen

- Creative Ageing
- Monthly Summary
