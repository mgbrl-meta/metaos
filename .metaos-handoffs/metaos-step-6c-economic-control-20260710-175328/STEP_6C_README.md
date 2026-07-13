# MetaOS Step 6C Economic-Control Handoff

Created: 2026-07-10T12:23:33.936Z

## Entry screens

- `components/meta/HighCpaTab.tsx`
- `components/meta/GptTab.tsx`
- `components/meta/HighRoasTab.tsx`

## Dependency closure

- Files collected: 97
- Latest migration report: 2026-07-10T10-24-07-900Z
- Unresolved local imports: 0

## Screen facts

### `components/meta/HighCpaTab.tsx`

- Lines: 957
- State hooks: 3
- Memo hooks: 1
- Effect hooks: 0
- Clipboard signals: 1
- CSV signals: 0
- Download signals: 0
- Fetch targets: none detected
- Local-storage signals: 0
- Details rows: 1
- Buttons: 3
- Inputs: 2
- Selects: 0
- Charts: LineChart, ResponsiveContainer
- Threshold values: 2, 7, 3000
- CPA formulas: 0
- ROAS formulas: 0
- AOV formulas: 0
- GPT formulas: 0

### `components/meta/GptTab.tsx`

- Lines: 568
- State hooks: 2
- Memo hooks: 1
- Effect hooks: 0
- Clipboard signals: 1
- CSV signals: 0
- Download signals: 0
- Fetch targets: none detected
- Local-storage signals: 0
- Details rows: 1
- Buttons: 3
- Inputs: 1
- Selects: 0
- Charts: none detected
- Threshold values: 2
- CPA formulas: 0
- ROAS formulas: 0
- AOV formulas: 0
- GPT formulas: 1

### `components/meta/HighRoasTab.tsx`

- Lines: 706
- State hooks: 2
- Memo hooks: 1
- Effect hooks: 0
- Clipboard signals: 0
- CSV signals: 0
- Download signals: 0
- Fetch targets: none detected
- Local-storage signals: 0
- Details rows: 1
- Buttons: 1
- Inputs: 2
- Selects: 0
- Charts: LineChart, ResponsiveContainer
- Threshold values: 1, 1.2, 2
- CPA formulas: 0
- ROAS formulas: 0
- AOV formulas: 0
- GPT formulas: 0


## Architecture requirement

Before migrating these screens, the following must be extracted:

1. High-CPA lifetime and active-window qualification
2. GPT calculation and profitability tiers
3. High-ROAS eligibility and scale-protection rules
4. Shared daily and weekly trend output
5. Clipboard and action-only export behavior
6. Any API-backed threshold or view contract

The visual modules may only consume prepared engine output.
