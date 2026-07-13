# MetaOS Step 6D Analysis-Layer Handoff

Created: 2026-07-10T13:07:36.546Z

## Resolved modules

- **Spend Analysis**: `spend_visuals` → `components/dashboard/SpendVisuals.tsx`
- **Creative Analysis**: `creative` → `components/meta/CreativeTab.tsx`
- **Creative Ageing**: `creative_ageing` → `components/meta/CreativeAgeingTab.tsx`
- **Monthly Summary**: `monthly` → `components/meta/EnhancedMonthlyReport.tsx`

## Dependency closure

- Files collected: 101
- API contracts inspected: 0
- Latest migration report: 2026-07-10T10-24-07-900Z
- Unresolved local imports: 0

## Screen facts

### Spend Analysis

- Module ID: `spend_visuals`
- Source: `components/dashboard/SpendVisuals.tsx`
- Lines: 985
- State hooks: 6
- Memo hooks: 3
- Effect hooks: 0
- Clipboard signals: 0
- CSV signals: 0
- Excel signals: 0
- Download signals: 0
- Fetch targets: none detected
- Local-storage signals: 0
- Charts: AreaChart, BarChart, ComposedChart, LineChart, ResponsiveContainer
- Table signals: 2
- Expansion signals: 0
- Date/age signals: none detected
- Threshold values: none detected
- CPA formulas: 0
- ROAS formulas: 0
- AOV formulas: 0
- CPM formulas: 0
- Frequency formulas: 0

### Creative Analysis

- Module ID: `creative`
- Source: `components/meta/CreativeTab.tsx`
- Lines: 572
- State hooks: 2
- Memo hooks: 1
- Effect hooks: 0
- Clipboard signals: 1
- CSV signals: 0
- Excel signals: 0
- Download signals: 0
- Fetch targets: none detected
- Local-storage signals: 0
- Charts: none detected
- Table signals: 0
- Expansion signals: 0
- Date/age signals: month, yesterday
- Threshold values: 1
- CPA formulas: 0
- ROAS formulas: 0
- AOV formulas: 0
- CPM formulas: 0
- Frequency formulas: 0

### Creative Ageing

- Module ID: `creative_ageing`
- Source: `components/meta/CreativeAgeingTab.tsx`
- Lines: 685
- State hooks: 0
- Memo hooks: 1
- Effect hooks: 0
- Clipboard signals: 0
- CSV signals: 0
- Excel signals: 0
- Download signals: 0
- Fetch targets: none detected
- Local-storage signals: 0
- Charts: ComposedChart, ResponsiveContainer
- Table signals: 1
- Expansion signals: 0
- Date/age signals: Age, Ageing, Month, Monthly, age, ageing, month, monthly
- Threshold values: 1
- CPA formulas: 0
- ROAS formulas: 0
- AOV formulas: 0
- CPM formulas: 0
- Frequency formulas: 0

### Monthly Summary

- Module ID: `monthly`
- Source: `components/meta/EnhancedMonthlyReport.tsx`
- Lines: 983
- State hooks: 1
- Memo hooks: 1
- Effect hooks: 0
- Clipboard signals: 0
- CSV signals: 0
- Excel signals: 0
- Download signals: 0
- Fetch targets: none detected
- Local-storage signals: 0
- Charts: BarChart, LineChart, ResponsiveContainer, ScatterChart
- Table signals: 1
- Expansion signals: 0
- Date/age signals: Month, Monthly, month, monthly
- Threshold values: none detected
- CPA formulas: 0
- ROAS formulas: 0
- AOV formulas: 0
- CPM formulas: 0
- Frequency formulas: 0


## Required next architecture step

Before replacing the visible modules, extract:

1. Spend distribution and concentration logic
2. Creative-level aggregation and qualification
3. First-seen / latest-seen / days-live ageing logic
4. Monthly grouping and month-over-month comparison
5. Shared filters, date windows, trends, exports and campaign rollups
6. Any API-backed view or threshold contract

The frontend modules may only consume prepared engine output.
