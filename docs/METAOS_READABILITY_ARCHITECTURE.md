# MetaOS Readability Architecture

## Purpose

MetaOS currently operates two frontend generations during the controlled migration.

The readability contract must validate each generation according to its actual architecture instead of requiring legacy CSS in the global root layout.

## Legacy route contract

Routes:

- `/`
- `/v2`

Owned by:

- `app/(legacy)/layout.tsx`

CSS order:

1. `app/globals.css`
2. `app/os-theme-final.css`
3. `app/metaos-readability.css`

These layers remain isolated to legacy routes until every retained screen has been migrated.

## New workspace contract

Route:

- `/workspace`

Owned by:

- `app/workspace/layout.tsx`
- `styles/metaos-ui/index.css`

CSS order:

1. Tailwind utilities
2. Semantic tokens
3. Foundation primitives
4. Shell architecture

## Semantic colors

The new frontend uses tokens instead of hard-coded presentation colors:

- Neutral background and surface tokens
- Neutral text hierarchy
- Green positive-performance tokens
- Red negative-performance tokens
- Amber warning tokens

Light and dark modes implement the same semantic contract.

## Prohibited workspace patterns

The new UI architecture must not contain:

- `!important`
- Broad `[class*=...]` selectors
- Global table-child overrides
- Legacy blue accent styling
- Decorative gradients
- Global CSS loaded through the root layout
- Component-specific readability patches

## Migration principle

Legacy readability compatibility is temporary but protected.

The new workspace readability system is permanent and architecture-owned.

The legacy layers may only be removed after all retained production modules have migrated and passed visual and functional audits.
