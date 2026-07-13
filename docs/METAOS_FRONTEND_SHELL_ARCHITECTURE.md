# MetaOS Frontend Shell Architecture

## Route isolation

### Legacy routes

- `/`
- `/v2`

Legacy routes remain under `app/(legacy)` and retain their current CSS and compatibility layers.

### New route

- `/workspace`

The new route has an independent token system and application shell.

## Shell ownership

### `MetaOSWorkspaceShell`

Owns:

- Structural application composition
- Sidebar state application
- Mobile-navigation overlay
- Active module rendering
- Theme attribute

### `MetaOSSidebar`

Consumes only:

- Canonical module registry
- Canonical UI state

It does not scan or click DOM elements.

### `MetaOSHeader`

Owns:

- Active module identity
- Data status placement
- Theme control
- Settings access
- Mobile-navigation trigger

### `MetaDataStatus`

Owns:

- Meta Sheet refresh
- Loading state
- Error state
- Row count
- Latest date
- Actual fetched time
- Store hydration

### `MetaOSModuleRenderer`

Owns exhaustive registered-module rendering.

## Visual principles

- Black, white and neutral-grey foundations
- Compact typography
- Restrained borders and shadows
- Red for negative performance
- Green for positive performance
- Amber for genuine warnings
- No gradients
- No glass effects
- No broad CSS overrides
- No `!important`
