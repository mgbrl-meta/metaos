# MetaOS Analytical Table Architecture

## Purpose

The table system provides one controlled and reusable interaction model for every MetaOS analytical screen.

It does not sort, filter, paginate or calculate business data internally. Screens and frontend adapters own those controlled states.

## Core components

### `DataTable`

Supports:

- Typed columns
- Controlled sorting
- Sticky headers
- Sticky left or right columns
- Numeric alignment
- Semantic cell tones
- Semantic row tones
- Compact and comfortable density
- Expandable rows
- Loading skeletons
- Empty states
- Horizontal scrolling
- Stable row IDs

### `TableToolbar`

Supports:

- Controlled search
- Filters
- Result summary
- Screen actions

### `TablePagination`

Supports:

- Controlled page
- Controlled page size
- Total-row summary
- Previous and next navigation

### `TableDensityControl`

Provides a shared compact/comfortable view preference.

## Data ownership

The table system may receive formatted values and prepared rows.

It must not import:

- Backend calculations
- Decision rules
- Meta engines
- Meta performance stores
- Business thresholds

## Performance rule

The table receives only the currently visible page or intentionally bounded result set.

Screens must not pass the complete 78,000-row source dataset directly to the rendered table.

Filtering, sorting, grouping and pagination must occur before rendering.

## Semantic visual rules

- Positive performance: green
- Negative performance: red
- Warning: amber
- Neutral values: black, white and grey
- No decorative blue status system
- No gradients
- No broad CSS patches
- No `!important`
