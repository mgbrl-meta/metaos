# MetaOS Header Typography Architecture

## Actual restored component structure

The protected frontend baseline uses:

- `.mos-status-chip` for data condition, latest date, row count and sync state
- `.mos-header-action` for Refresh and Light/Dark
- `.mos-icon-button` for Settings and compact icon actions

It does not use a `HeaderStatus` React primitive.

## Hierarchy

1. Display
2. Title
3. Body
4. Control
5. Meta

All header status and action labels consume the **Control** level.

## Ownership

`styles/metaos-ui/tokens.css` owns:

- Font size
- Font weight
- Line height
- Control height
- Horizontal padding
- Control gap
- Icon size

`styles/metaos-ui/shell.css` applies those tokens to the real shared header classes.

React components do not own font sizes.
