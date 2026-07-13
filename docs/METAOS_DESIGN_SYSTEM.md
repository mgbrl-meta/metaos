# MetaOS Design System

## Product character

MetaOS is an operator tool, not a promotional website.

The interface should feel:

- Precise
- Compact
- Calm
- Trustworthy
- Financially rigorous
- Fast to scan
- Easy to operate for long sessions

## Colour contract

The default interface is neutral.

Use:

- White and off-white for light surfaces
- Black, charcoal and restrained grey for typography and structure
- Green only for positive performance, improvement and healthy state
- Red only for negative performance, deterioration, waste and destructive action

Do not use decorative accent colours as a substitute for hierarchy.

Hierarchy must come from:

- Typography
- Weight
- Spacing
- Borders
- Surface contrast
- Alignment

## Typography

The system uses a compact Helvetica-style system stack.

Default body size:

- 13px

Supporting sizes:

- 10px: micro labels
- 11px: compact labels
- 12px: buttons and table support text
- 13px: body and table text
- 15px: section headings
- 18px: key headings
- 22px: page headings
- 28px: exceptional primary headings only

Avoid oversized marketing typography.

## Spacing

Spacing is intentionally compact.

The default rhythm is:

- 4px
- 6px
- 8px
- 12px
- 16px
- 20px
- 24px
- 32px

Do not invent arbitrary screen-specific spacing.

## Shape

Use restrained radii:

- 4px
- 6px
- 8px
- 12px maximum for standard product surfaces

Pills are reserved for:

- Status badges
- Small filters
- Compact categorical controls

Large cards must not use decorative 24px–36px radii.

## Elevation

Borders are preferred over shadows.

Use shadows only when physical layering must be communicated:

- Floating menus
- Drawers
- Raised interactive panels

## Accessibility

- Icon-only buttons require an aria-label.
- Buttons default to type=button.
- Focus states use the foreground colour.
- Red and green must never be the only signal; labels and icons remain mandatory.
- Light and dark modes use the same semantic tokens.

## Ownership

- `styles/metaos-tokens.css` owns design values.
- `styles/metaos-foundation.css` owns primitive styling.
- `lib/metaos-ui/themeContract.ts` owns theme and semantic-tone types.
- `components/metaos-ui/primitives/*` owns reusable visual primitives.
- Screens may compose primitives but must not redefine their own design system.

## Migration rule

These files remain unimported by the production shell until the new application shell is ready.

The legacy dashboard must not be restyled through global overrides.
