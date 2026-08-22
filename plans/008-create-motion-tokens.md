# 008 — Create shared motion tokens

- **Status**: TODO
- **Commit**: 9a3bc2a
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens
- **Estimated scope**: global SCSS plus mechanical replacements

## Problem

`src/styles/_variables.scss` has only animation offsets:

```scss
/* src/styles/_variables.scss:127 — current */
// Animation offsets
$anim-offset-sm: 10px;
$anim-offset-md: 16px;
$anim-offset-lg: 20px;
```

Durations and easings are hand-written across more than 20 SCSS files.

## Target

Add tokens to `src/styles/_variables.scss`:

```scss
// Motion
$motion-duration-press: 160ms;
$motion-duration-state: 200ms;
$motion-duration-entrance: 250ms;
$motion-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
$motion-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
```

Then replace existing motion values consistently:

- Press/control feedback: `160ms $motion-ease-out`
- Tabs and state colors: `200ms $motion-ease-out`
- Entrances: `250ms $motion-ease-out`
- Error shake: `300ms $motion-ease-in-out`

Update `src/styles/_animations.scss`:

```scss
.fade-in-up,
.fade-in-up-sm,
.fade-in {
  animation-duration: $motion-duration-entrance;
  animation-timing-function: $motion-ease-out;
}

.shake {
  animation-duration: 300ms;
  animation-timing-function: $motion-ease-in-out;
}
```

Keep loading bounce at its current purposeful cycle; do not make it faster for style alone.

## Repo conventions to follow

- SCSS tokens live in `src/styles/_variables.scss`.
- Existing SCSS modules already `@use '../../styles/variables' as *;`.

## Steps

1. Add the five tokens.
2. Update global animation utilities.
3. Replace hand-written durations/easings in files touched by plans 003–007.
4. Leave genuinely unrelated CSS values untouched.

## Boundaries

- Do not add CSS custom properties unless needed at runtime; SCSS tokens are sufficient.
- Do not create parallel token systems.
- Do not introduce a JavaScript motion hook.

## Verification

- **Mechanical**: `npm run typecheck && npm test && npm run build:weapp`.
- **Feel check**: home cards, filters, back buttons, and login entrance use the same responsive rhythm; no control exceeds 300ms.
- **Done when**: touched motion declarations use shared tokens rather than raw values.
