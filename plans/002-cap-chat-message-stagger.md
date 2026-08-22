# 002 — Cap chat message entrance stagger

- **Status**: DONE
- **Commit**: 9a3bc2a
- **Severity**: HIGH
- **Category**: Interruptibility
- **Estimated scope**: 1 file, tiny

## Problem

`src/components/ChatArea/index.tsx:23` calculates delay from the absolute message index:

```tsx
style={{ animationDelay: `${i * 0.05}s` }}
```

With `animation-fill-mode: both`, message 20 stays invisible for one second and message 40 stays invisible for two seconds. The delay is unbounded as the conversation grows.

## Target

Use a 30ms stagger and cap it at 80ms:

```tsx
style={{ animationDelay: `${Math.min(i * 0.03, 0.08)}s` }}
```

This preserves a small initial conversation rhythm while preventing long conversations from suppressing newly rendered messages.

## Repo conventions to follow

- Entrance motion is supplied by the global `fade-in-up-sm` utility in `src/styles/_animations.scss`.
- Do not introduce per-message JS animation state.

## Steps

1. Replace the expression at `src/components/ChatArea/index.tsx:23` with the capped expression above.
2. Leave the existing key, class, and animation utility unchanged.

## Boundaries

- Do not change message rendering order.
- Do not add animation libraries.
- Do not remove the entrance animation.

## Verification

- **Mechanical**: `npm run typecheck && npm test && npm run build:weapp`.
- **Feel check**:
  - Load a conversation with 30+ messages; no message waits more than 80ms before entering.
  - Append a new message; it appears immediately enough to feel connected to the send action.
  - Repeated sends remain interruptible and never queue a long stagger.
- **Done when**: computed animation delay never exceeds `0.08s`.
