# 003 — Fix press release snap

- **Status**: DONE
- **Commit**: 9a3bc2a
- **Severity**: HIGH
- **Category**: Physicality & origin
- **Estimated scope**: 4 files, small

## Problem

Several components declare transition only inside `:active`. When the finger lifts, `:active` and its transition disappear together, so the release snaps instead of easing back.

```scss
/* src/pages/auth/index.module.scss:81 — current */
&:active {
  transform: scale(0.95);
  transition: transform 0.1s;
}

/* src/pages/orders/index.module.scss:76 — current */
&:active {
  transform: scale(0.98);
  opacity: 0.9;
  transition: all 0.15s ease-out;
}

/* src/components/ZonesContent/index.module.scss:37 — current */
&:active {
  transform: scale(0.95);
  transition: transform 0.1s;
}

/* src/components/ChatRichCard/index.module.scss:10 — current */
&:active {
  transform: scale(0.98);
  opacity: 0.95;
  transition: all 0.1s;
}
```

## Target

Move transitions to the resting selector and animate only the properties changed by press:

```scss
/* target pattern */
.element {
  transition:
    transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
    opacity 160ms cubic-bezier(0.23, 1, 0.32, 1);

  &:active {
    transform: scale(0.97);
    opacity: 0.9;
  }
}
```

For `src/pages/auth/index.module.scss`, keep scale at `0.95` if desired, but move the transition to `.wechatBtn`. For `ChatRichCard` and order cards, use `scale(0.98)`. For `ZonesContent`, use `scale(0.96)`.

## Repo conventions to follow

- Existing SCSS modules use nested `&:active`.
- Press feedback is subtle and transform-based.

## Steps

1. In auth, move transition from `&:active` to `.wechatBtn`.
2. In order card, move transition from `&:active` to `.card`.
3. In zones grid item, move transition from `&:active` to `.gridItem`.
4. In chat rich card, move transition from `&:active` to `.card`.
5. Replace `transition: all` with explicit `transform` and `opacity` where both change.

## Boundaries

- Do not alter markup or click handlers.
- Do not add hover motion.
- Do not change component layout.

## Verification

- **Mechanical**: `npm run typecheck && npm test && npm run build:weapp`.
- **Feel check**:
  - Press each element and hold: it moves to active state smoothly.
  - Release: it returns smoothly rather than snapping.
  - Re-press during return: transition retargets from the current scale.
- **Done when**: no transition declaration exists only inside these `:active` blocks.
