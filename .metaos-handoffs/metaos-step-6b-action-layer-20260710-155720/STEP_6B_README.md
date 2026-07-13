# MetaOS Step 6B Action-Layer Handoff

Created: 2026-07-10T10:27:26.275Z

## Entry screens

- `components/meta/MetaExecutiveSummary.tsx`
- `components/meta/PrioritySplitTabs.tsx`
- `components/meta/InfluencerAdsTab.tsx`

## Dependency closure

- Files collected: 84
- Latest report directory: 2026-07-10T10-24-07-900Z
- Unresolved local imports: 0

## Source facts

### `components/meta/MetaExecutiveSummary.tsx`

- Lines: 709
- useState hooks: 0
- useMemo hooks: 1
- useEffect hooks: 0
- Clipboard signals: 0
- Export signals: 0
- Buttons: 0
- Inputs: 0
- Selects: 0
- Local functions: DirectionCard, ExecutiveBlock, MetaExecutiveSummary, change, dateKey, fatigueRows, formatMetric, getAd, getAdSet, getCampaign, getClicks, getDate, getImpressions, getPurchases, getReach, getRevenue, getSpend, groupByAd, groupByCampaign, issueCards, issueClass, latestDate, metricStatus, parseDate, statusClass, statusTone, summarize, trendText, valueForMetric, windowRows

### `components/meta/PrioritySplitTabs.tsx`

- Lines: 789
- useState hooks: 1
- useMemo hooks: 2
- useEffect hooks: 0
- Clipboard signals: 0
- Export signals: 0
- Buttons: 1
- Inputs: 0
- Selects: 0
- Local functions: CreativeRow, InfoBox, Kpi, Metric, Tag, TopDescalingPrioritiesTab, TopScalingPrioritiesTab, TrendBox, TrendTooltip, addDaysToDateKeyUtc, buildDailyTrend, buildPriorityMatrix, changePct, formatTrendValue, getAdId, getAdName, getAdSet, getCampaign, getClicks, getDate, getImpressions, getPurchases, getRevenue, getSpend, isDateInWindow, normalizeDateKey, summarize, toUtcDateKeyFromParts, toneClass

### `components/meta/InfluencerAdsTab.tsx`

- Lines: 588
- useState hooks: 1
- useMemo hooks: 2
- useEffect hooks: 0
- Clipboard signals: 0
- Export signals: 2
- Buttons: 4
- Inputs: 2
- Selects: 0
- Local functions: InfluencerAdsTab, SortHeader, addDays, addDaysToDateKeyUtc, dateKey, escapeHtml, exportExcel, getAdName, getAdSet, getCampaign, getCreative, getDate, getNestedValue, getPurchases, getRevenue, getSpend, influencerIntent, parseDate, sortRows, summarize, toUtcDateKeyFromParts, toggleSort, windowRows


## Rule

This handoff is read-only. It contains the exact implementation and dependency contract required to design architecture-owned Summary, Priority and Influencer modules without guessing or modifying the frozen backend.
