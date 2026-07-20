# MetaOS Interaction Architecture

## Sidebar state

The UI store owns only durable navigation state:

- Active module
- Pinned sidebar collapsed/expanded state
- Mobile navigation
- Search and command-palette state

The default desktop sidebar state is collapsed.

## Hover preview

Hover and keyboard-focus expansion are transient shell interactions.

They:

- Do not alter the active module
- Do not write to localStorage
- Do not change the pinned collapsed state
- Stay open while the pointer or keyboard focus remains inside
- Close when the pointer and focus leave

## Motion tokens

Motion duration, easing, card elevation and hover shadows are owned by:

`styles/metaos-ui/tokens.css`

Components do not invent their own animation timing.

## Shared surfaces

Hover elevation is owned by canonical primitives:

- `.mos-card`
- `.mos-metric-card`

Individual modules do not add their own card-hover CSS.

## Accessibility

`prefers-reduced-motion` disables non-essential transforms and transitions.

Mobile navigation continues to use the existing drawer architecture rather than desktop hover behaviour.
