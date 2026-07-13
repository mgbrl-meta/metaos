# MetaOS Canonical Frontend Module Architecture

## Canonical layers

### `config/metaos-module-registry.json`

Machine-readable source of truth for:

- 22 registered modules
- Navigation sections
- Platforms
- Labels and descriptions
- Icon keys
- Component paths
- Preferred V2 implementations
- Google component variants
- Search keywords
- Navigation order
- Implementation status

### `lib/metaos-ui/contracts.ts`

Owns TypeScript contracts for:

- Module IDs
- Platform IDs
- Section IDs
- Icon keys
- Registry definitions
- Navigation sections

### `lib/metaos-ui/moduleRegistry.ts`

Loads the JSON registry and resolves icon keys into React icon components.

It does not render modules or own navigation state.

### `lib/metaos-ui/moduleQueries.ts`

Owns registry queries:

- Module lookup
- Platform filtering
- Navigation-section assembly
- Search
- Default module resolution
- Adjacent-module navigation

### `store/metaOSUiStore.ts`

Owns canonical frontend navigation state:

- Active module
- Last-used module by platform
- Recent modules
- Sidebar collapse
- Mobile navigation
- Command palette
- Navigation search
- Persisted user navigation preferences

### `components/metaos-ui/MetaOSModuleRenderer.tsx`

Owns exhaustive module-to-component rendering.

It does not own navigation, layout, theme or backend calculations.

### `components/metaos-ui/modules/CommandCenterModule.tsx`

Adapts the protected V2 data flow to the Command Center:

`performanceRows → normalizeMetaV2Rows → commandCenterEngine → CommandCenter`

No formulas or thresholds are owned by this frontend adapter.

## Functional contract

- 21 existing production modules remain available.
- The protected V2 Command Center becomes the 22nd canonical module.
- No module is activated through DOM queries or programmatic clicks.
- No independent navigation list may be maintained inside a shell component.
- Every module must be registered, searchable and exhaustively rendered.
