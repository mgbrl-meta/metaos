# MetaOS Economic-Control Engine Architecture

Step 6C1 extracts the logic behind High CPA, GPT Risk, and High ROAS without changing the visible workspace screens.

## Data flow

`performanceRows → normalizeMetaV2Rows → economic-control engine → future UI module`

## High CPA

Qualification:
- Spend on latest date
- Lifetime purchases above zero
- Lifetime CPA at or above threshold

States:
- Persistent
- Improving
- No recent purchase
- Threshold match

## GPT Risk

Qualification:
- Delivery-live ad
- Latest-day spend above zero
- Lifetime purchases above zero
- CPA above active-campaign average
- GPT below active-campaign average
- GPT below selected target

GPT remains calculated centrally as AOV minus CPA.

## High ROAS

Qualification:
- Spend on latest date
- Lifetime purchases above zero
- Lifetime ROAS at or above threshold

Protection signals compare L7D CPA and ROAS against lifetime performance.

## Ownership

Engines own date windows, qualification, campaign benchmarks, aggregation, states, reasons, and actions.

Frontend modules will own search, sorting, pagination, expansion, clipboard actions, and chart rendering.
