# 004 — Add reduced motion support

- **Status**: TODO
- **Commit**: 9a3bc2a
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: global animation file plus motion-bearing modules

## Problem

The repository has entrance movement, shake, infinite bounce, drag motion, and many transform press effects, but no `prefers-reduced-motion` handling:

```bash
rg "prefers-reduced-motion" src
# no matches
```

Representative movement includes:

```scss
/* src/styles/_animations.scss:42 — current */
.fade-in-up {
  animation: fadeInUp 0.3s ease-out both;
}

.shake {
  animation: shake 0.5s ease-in-out;
}
```

## Target

Reduced motion means remove movement and infinite motion while retaining opacity/color feedback.

Add this to `src/styles/_animations.scss`:

```scss
@media (prefers-reduced-motion: reduce) {
  .fade-in-up,
  .fade-in-up-sm,
  .fade-in {
    animation: fadeIn 200ms ease-out both;
  }

  .shake {
    animation: fadeIn 200ms ease-out both;
  }

  .bounce-dot {
    animation: none;
  }
}
```

For motion-bearing SCSS modules, add targeted rules:

```scss
/* target pattern inside each module */
@media (prefers-reduced-motion: reduce) {
  .element {
    transition-property: opacity, background-color, color;
  }

  .element:active {
    transform: none;
  }
}
```

Cover at least these classes/files:

- `src/components/FloatingService/index.module.scss`: `.btn` and `.dragging`
- `src/components/ChatArea/index.module.scss`: `.typingDot`
- Press-transform modules found by `rg "transform:\\s*scale" src --glob '*.scss'`

For `FloatingService`, reduced motion must not disable dragging; it should only remove the post-release transform transition:

```scss
@media (prefers-reduced-motion: reduce) {
  .btn {
    transition: none;
  }
}
```

## Repo conventions to follow

- Global utility animations belong in `src/styles/_animations.scss`.
- Component-specific overrides belong in the component's SCSS module.

## Steps

1. Add the global reduced-motion block.
2. Add component-specific overrides for transform and infinite animations.
3. Retain opacity/color feedback where it already exists.

## Boundaries

- Do not globally disable all animation with `* { animation: none; }`.
- Do not remove opacity/color state feedback.
- Do not prevent dragging or other interaction.

## Verification

- **Mechanical**: `rg "prefers-reduced-motion" src` must return matches; `npm run typecheck && npm test && npm run build:weapp`.
- **Feel check** in DevTools/rendering settings:
  - Enable reduced motion; entrances fade without vertical movement.
  - Shake error feedback becomes a fade or steady visible error, without horizontal movement.
  - Typing dots stop bouncing but remain visible as a static loading state.
  - Buttons still show opacity/background feedback; press transforms are absent.
  - Floating service still drags and snaps without a transition.
- **Done when**: movement is suppressed but comprehension feedback remains.
