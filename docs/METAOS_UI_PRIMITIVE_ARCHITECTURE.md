# MetaOS UI Primitive Architecture

## Purpose

The primitive layer is the permanent visual and interaction language for every MetaOS screen.

Screens should compose these primitives instead of creating independent cards, buttons, status pills, filters or empty states.

## Components

### Button

Variants:

- Primary
- Secondary
- Ghost
- Positive
- Danger

Sizes:

- Extra small
- Small
- Medium

### IconButton

Requires an accessible label and supports the same semantic variants as Button.

### Badge

Semantic tones:

- Neutral
- Positive
- Negative
- Warning
- Inverse

### Card

Supports:

- Compact and regular density
- Default, subtle, positive, negative and warning states
- Header, title, description, body, action and footer composition

### PageHeader

Owns:

- Eyebrow
- Page title
- Description
- Metadata
- Page-level actions

### MetricCard

Owns:

- Metric label
- Formatted value
- Supporting note
- Semantic performance tone
- Optional icon
- Compact and regular density

### FilterBar

Owns:

- Filter controls
- Selection summary
- Screen-level actions

### SegmentedControl

Owns mutually exclusive local view selection.

### StatePanel

Provides:

- Empty state
- Loading state
- Error state

## Architecture rules

1. Primitives must not import backend calculations.
2. Primitives must not access application stores.
3. Primitive styling must be scoped below `.metaos-ui`.
4. Primitive CSS cannot use `!important`.
5. Primitive CSS cannot use broad class selectors.
6. Positive state is green.
7. Negative state is red.
8. Warning state is amber.
9. Neutral interface controls remain black, white or grey.
10. Screens must not recreate primitives locally.
