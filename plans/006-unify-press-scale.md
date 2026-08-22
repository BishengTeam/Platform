# 006 — Unify exaggerated press scales

- **Status**: TODO
- **Commit**: 9a3bc2a
- **Severity**: MEDIUM
- **Category**: Physicality
- **Estimated scope**: 2 files, tiny

## Problem

Two high-frequency controls compress to `0.92`, noticeably more than the rest of the app and outside the subtle press range:

```scss
/* src/components/ChatInput/index.module.scss:80 — current */
&:active {
  transform: scale(0.92);
  box-shadow: 0 1px 4px rgba(22, 119, 255, 0.2);
}

/* src/pages/ai-consult/index.module.scss:63 — current */
&:active {
  transform: scale(0.92);
  opacity: 0.85;
}
```

## Target

Use `scale(0.97)` and 160ms strong ease-out:

```scss
transform: scale(0.97);
```

Keep the resting transition on `.sendBtn` and `.backBtn`.

## Repo conventions to follow

- Most existing cards use `0.95–0.98`.
- No transform-origin is needed for whole-element press feedback.

## Steps

1. Change ChatInput send button scale from `0.92` to `0.97`.
2. Change AI consultation back button scale from `0.92` to `0.97`.
3. Use 160ms ease-out if these transitions are touched.

## Boundaries

- Do not change icon size or layout.
- Do not add bounce.

## Verification

- **Mechanical**: `npm run typecheck && npm test && npm run build:weapp`.
- **Feel check**: both controls feel like a light press, not a collapse; repeated taps retarget smoothly.
- **Done when**: no active scale is smaller than `0.95` in these two files.
