# 001 — Move floating service drag to transforms

- **Status**: TODO
- **Commit**: 9a3bc2a
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 2 files, small

## Problem

`src/components/FloatingService/index.tsx` updates React state on every touch move and positions the fixed button with layout properties:

```tsx
/* src/components/FloatingService/index.tsx:37 — current */
const handleTouchMove = useCallback((e: any) => {
  const touch = e.touches[0]
  const newY = touch.clientY - startRef.current.y
  const dy = Math.abs(newY - dragY.current)
  startRef.current.moved += dy
  startRef.current.lastTouchX = touch.clientX
  dragY.current = newY

  const maxY = windowHeight - btnPx * 3
  setY(Math.max(0, Math.min(newY, maxY)))
}, [btnPx, windowHeight])

/* src/components/FloatingService/index.tsx:61 — current */
style={{
  left: `${x}px`,
  top: `${y}px`,
}}
```

`src/components/FloatingService/index.module.scss` promotes layout work and transitions `left`:

```scss
/* src/components/FloatingService/index.module.scss:14 — current */
touch-action: none;
will-change: top;
transition: left 0.15s ease;
```

This triggers layout on every drag frame and can drop frames on low-end devices.

## Target

Position the button at `left: 0; top: 0` and move it with one composited transform. Disable transition during dragging; enable it only for the post-release horizontal edge snap.

```tsx
/* target */
const [isDragging, setIsDragging] = useState(false)

// On touch start:
setIsDragging(true)

// On touch end, after choosing the side:
setIsDragging(false)

style={{
  transform: `translate3d(${x}px, ${y}px, 0)`,
}}
```

The class must include `.dragging` when `isDragging` is true.

```scss
/* target */
.btn {
  position: fixed;
  left: 0;
  top: 0;
  touch-action: none;
  will-change: transform;
  transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

.dragging {
  transition: none;
}
```

## Repo conventions to follow

- SCSS modules use `@use '../../styles/variables' as *;`.
- Fixed components keep positioning local to their module.
- No JS animation dependency should be added.

## Steps

1. Add `isDragging` state to `FloatingService`.
2. Set it true in `handleTouchStart`; set false in `handleTouchEnd` after the side decision and tap branch.
3. Replace inline `left/top` with `translate3d(x, y, 0)`.
4. Change SCSS to `left: 0`, `top: 0`, `will-change: transform`, and transition `transform` only.
5. Add `.dragging { transition: none; }` and apply it conditionally.

## Boundaries

- Do not change press behavior or the 6px drag threshold.
- Do not alter `useWindowSize`.
- Do not add a motion dependency.
- Do not animate `left`, `top`, `width`, or `height`.

## Verification

- **Mechanical**: `npm run typecheck && npm test && npm run build:weapp`.
- **Feel check** on a real device:
  - Drag continuously; the button should track the finger without layout jank.
  - Release near either edge; only the snap animates, using 200ms strong ease-out.
  - Tap without moving; navigation/action still works.
  - Interrupt the snap by touching it again; it must stop immediately rather than finish the old animation.
- **Done when**: computed style uses `transform`, no inline `left/top` remains, and dragging has no transition.
