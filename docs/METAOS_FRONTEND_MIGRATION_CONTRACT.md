# MetaOS Frontend Migration Contract

## Objective

Rebuild MetaOS as a compact, high-clarity, black-and-white operator interface without modifying its protected backend calculation architecture or removing any existing production module.

## Functional preservation

The migration must retain:

- 14 Meta modules
- 6 Google modules
- Settings
- Existing Meta sheet loading and refresh flow
- Existing row count, latest date, freshness and error states
- The four engine-backed V2 dashboards already implemented
- Existing table actions, filters, exports and expandable rows

The machine-readable source of truth is:

`config/metaos-frontend-contract.json`

## New ownership model

- One typed module registry owns screen identity, navigation labels, descriptions and icons.
- One application shell owns sidebar, header, mobile navigation and workspace composition.
- One data-status controller owns refresh, loading, latest date, row count, actual sync time and source status.
- One token system owns neutral colors, typography, spacing, borders, radii and semantic performance states.
- Shared primitives own cards, tables, buttons, badges, filters, drawers, empty states and errors.
- Screens own only screen-specific composition and consume prepared data.

## Visual direction

- Neutral black, white and restrained grey foundations.
- Compact typography and spacing.
- Red only for negative performance and destructive actions.
- Green only for positive performance and healthy states.
- Amber only for genuine warning states.
- No decorative gradients.
- No glassmorphism.
- No excessive shadows or oversized rounded cards.
- No broad class-contains CSS selectors.
- No DOM observers or programmatic clicks for navigation.
- Light and dark modes use the same semantic token contract.

## Migration sequence

1. Freeze and audit the existing frontend contract.
2. Create the typed module registry and frontend state contract.
3. Create neutral design tokens and foundation primitives.
4. Build the new application shell in parallel.
5. Mount every retained production screen through the registry.
6. Introduce the unified data-status controller.
7. Migrate tables, cards and filters screen by screen.
8. Remove the DOM patch layer and duplicate navigation.
9. Enable strict no-patch and readability audits.
10. Switch production only after functional and visual QC passes.
