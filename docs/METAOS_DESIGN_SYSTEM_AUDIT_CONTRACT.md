# MetaOS Canonical Design-System Audit Contract

## Canonical component names

The permanent primitive names are:

- `Button`
- `IconButton`
- `Badge`
- `Card`
- `MetricCard`
- `PageHeader`
- `FilterBar`
- `SegmentedControl`
- `StatePanel`

The obsolete names `MetaOSButton` and `MetaOSIconButton` are no longer part of the frontend architecture.

## Accessibility requirements

### Button

- Defaults to `type="button"`
- Preserves native button attributes
- Forwards its ref
- Exposes loading through `aria-busy`
- Disables interaction during loading

### IconButton

- Requires a text `label`
- Maps the label to `aria-label`
- Uses the label as the default hover title
- Defaults to `type="button"`
- Forwards its ref

## Visual requirements

- Neutral black, white and grey foundations
- Green for positive performance
- Red for negative performance
- Amber for warnings
- Compact dimensions
- Restrained radii
- Light and dark token parity
- No gradients
- No blue accent dependency
- No `!important`
- No broad class-selector overrides

## Independence requirement

UI primitives cannot import:

- Meta calculations
- Meta engines
- Meta performance stores
- Business thresholds

Screens and adapters supply data to primitives.
