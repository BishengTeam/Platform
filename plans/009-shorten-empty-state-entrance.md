# 009 — Shorten empty-state entrance

- **Status**: DONE
- **Commit**: 9a3bc2a
- **Severity**: LOW
- **Category**: Easing & duration
- **Estimated scope**: 1 file, tiny

## Problem

```scss
/* src/components/EmptyState/index.module.scss:10 — current */
animation: fadeInUp 0.4s ease-out both;
```

This is a UI state, not marketing/explanatory motion, and exceeds the 300ms UI budget.

## Target

Use 250ms and the shared strong ease-out token:

```scss
animation: fadeInUp $motion-duration-entrance $motion-ease-out both;
```

If token changes from plan 008 are absent, use:

```scss
animation: fadeInUp 250ms cubic-bezier(0.23, 1, 0.32, 1) both;
```

## Repo conventions to follow

- `EmptyState` already imports global animations:

```scss
@use '../../styles/animations' as *;
```

## Steps

1. Change duration from `0.4s` to the shared entrance duration.
2. Change timing function to the shared ease-out.
3. Preserve `both` and `fadeInUp`.

## Boundaries

- Do not add a spring or bounce.
- Do not delay empty states.

## Verification

- **Mechanical**: `npm run typecheck && npm test && npm run build:weapp`.
- **Feel check**: switching a filter to an empty tab communicates emptiness without making the user wait.
- **Done when**: duration is at or below 300ms.
