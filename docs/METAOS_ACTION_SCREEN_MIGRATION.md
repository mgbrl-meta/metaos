# MetaOS Action Screen Migration

## Migrated workspace modules

- Summary
- Top De-scaling Priorities
- Top Scaling Priorities
- Influencer Ads

## Summary

Data path:

`performanceRows → normalizeMetaV2Rows → buildMetaV2ExecutiveSummary → SummaryModule`

Preserved:

- Current 30-day period
- Prior 30-day period
- Last seven days
- Metric movement
- Critical issues
- Campaign performance
- Campaign fatigue
- Operator direction

## Priority queues

Data path:

`performanceRows → normalizeMetaV2Rows → buildMetaV2PriorityMatrix → PriorityModule`

Preserved:

- De-scaling ranking
- Scaling ranking
- Risk score
- Scale score
- Bad Scale
- Scale Fatigue
- CPA Decay
- ROAS Decay
- Attention Decay
- Efficient Scale
- Underfed Winner
- Protected decision-rule output
- Search
- Sorting
- Pagination
- Expandable daily trend
- Selectable trend metrics

## Influencer Ads

Data path:

`performanceRows → normalizeMetaV2Rows → buildMetaV2InfluencerQueue → InfluencerModule`

Preserved:

- Influencer and creator intent
- Latest active date
- ₹5K approval threshold
- ₹25K top-spender threshold
- Custom threshold
- Search
- Sorting
- Pagination
- Yesterday metrics
- Last-seven-day metrics
- Last-14-day metrics
- Last-30-day metrics
- Excel export
- Campaign, ad-set and ad-name detail

## Ownership

Frontend modules own:

- Presentation
- Search
- Sorting
- Pagination
- Expansion
- Export formatting

Backend engines own:

- Date windows
- Aggregation
- Qualification
- Scores
- Business metrics
- Decision rules
