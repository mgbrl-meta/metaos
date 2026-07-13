# MetaOS Analysis-Layer Engine Architecture

## Scope

Step 6D1 extracts the business logic behind:

- Spend Analysis
- Creative Fatigue
- Creative Ageing
- Monthly Summary

Visible workspace modules remain unchanged until Step 6D2.

## Clean data extension

`MetaV2CleanRow` now preserves `video3s`.

Supported aliases include:

- Video plays at 3 seconds
- 3-second video plays
- Video 3s plays
- ThruPlays

This enables thumbstop analysis without allowing the frontend or engines to read raw export columns.

## Shared analysis totals

`calculateMetaV2AnalysisTotals` extends centralized Meta totals with:

- Video 3-second plays
- Thumbstop rate
- Visitors
- Purchase CVR
- Cost per visitor
- Revenue per visitor

Visitor fallback is evaluated per row:

1. Landing-page views
2. Link or outbound clicks
3. All clicks

## Spend Analysis

Data path:

`performanceRows → normalizeMetaV2Rows → filterMetaV2LiveRows → buildMetaV2SpendAnalysis`

Preserved:

- Live ads only
- 7D / 14D / 30D / 60D / 90D / all presets
- Custom start and end dates
- Daily spend, revenue, CPA and ROAS
- Top campaigns, ad sets and ads by spend
- Spend and revenue concentration shares
- Last 28 daily detail rows
- Last 7D, 14D and 28D versus previous equal period

The comparison windows intentionally operate inside the selected date range to retain the legacy screen behavior.

## Creative Fatigue

Data path:

`performanceRows → normalizeMetaV2Rows → filterMetaV2LiveRows → buildMetaV2CreativeFatigue`

Qualification:

- Ad is active with spend on the latest date
- Current window is latest inclusive seven days
- Baseline window is the immediately preceding seven days

Signals:

- CPM increase of at least 20%
- CTR decline of at least 15%
- Thumbstop below 25%
- Frequency above 3.0

Controls:

- Minimum signals can be 1, 2, 3 or 4
- Three or more signals = Refresh Priority
- Copy handle is the ad-name prefix before ` - `
- Full ad names remain available

## Creative Ageing

Data path:

`performanceRows → normalizeMetaV2Rows → buildMetaV2CreativeAgeing`

Preserved:

- All valid historical rows
- First-seen date by ad
- Latest 12 calendar months
- New creative = first seen in that month
- Old active creative = first seen before the month and spending in that month
- New-cohort spend share
- New versus old CPA, ROAS, CTR, CVR, AOV and GPT
- Latest 30-day age distribution

Age buckets:

- ≤7D
- 8–14D
- 15–30D
- 31–45D
- 46–60D
- 61–90D
- 91–120D
- 121–180D
- 181–240D
- 241–360D
- 360D+

Ageing remains row-level inside the latest 30-day window. A creative may therefore contribute to more than one bucket when it crosses a boundary during that window.

## Monthly Summary

Data path:

`performanceRows → normalizeMetaV2Rows → buildMetaV2MonthlyAnalysis`

Preserved:

- Calendar-month aggregation
- Monday-start weekly aggregation
- Current month versus prior month
- Incremental spend amount and percentage
- Incremental CPA amount and percentage
- Revenue, ROAS and purchase changes
- Weekly spend and CPA
- Weekly visitor economics
- Weekly spend-versus-CPA scatter contract
- Month-selection-compatible output

Spend outcome states:

- Efficient growth
- Inefficient growth
- Contraction decline
- Neutral

CPA outcome states:

- Improving
- Worsening
- Stable

## Ownership

Frontend modules may own:

- Date-control interaction
- Search
- Sorting
- Pagination
- Chart rendering
- Month selection
- Clipboard and export interaction

Engines own:

- Live-ad qualification
- UTC date windows
- Period comparison
- Aggregation
- Fatigue signals
- First-seen cohorts
- Age buckets
- Monthly and weekly rollups
- Visitor economics
- Movement interpretation
