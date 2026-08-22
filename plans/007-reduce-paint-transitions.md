# 007 — Reduce paint-heavy transitions

- **Status**: DONE
- **Commit**: 9a3bc2a
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 3 files, small

## Problem

High-frequency form/input surfaces transition `box-shadow`, which triggers paint work:

```scss
/* src/components/ChatInput/index.module.scss:58 — current */
transition: border-color 0.2s, box-shadow 0.2s;

/* src/components/FormPicker/index.module.scss:30 — current */
transition: border-color 0.2s, box-shadow 0.2s;

/* src/components/WelcomeCard/index.module.scss:69 — current */
transition: transform 0.15s, box-shadow 0.15s;
```

## Target

Keep transform and small color-state transitions; let expensive shadow changes happen without transitioning:

```scss
/* ChatInput target */
transition: border-color 200ms cubic-bezier(0.23, 1, 0.32, 1);

/* FormPicker target */
transition: border-color 200ms cubic-bezier(0.23, 1, 0.32, 1);

/* WelcomeCard target */
transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
```

If plan 008 tokens exist, use `$motion-duration-state`, `$motion-duration-press`, and `$motion-ease-out`.

## Repo conventions to follow

- Feedback is local and subtle.
- Do not replace visual state with expensive overlays.

## Steps

1. Remove `box-shadow` from transition property lists in the three locations.
2. Keep active/focus shadow values unchanged unless they no longer visually make sense.
3. Ensure active transform feedback remains.

## Boundaries

- Do not remove focus indication.
- Do not animate layout properties.
- Do not add blur.

## Verification

- **Mechanical**: `npm run typecheck && npm test && npm run build:weapp`.
- **Feel check**: focus/press remains clear; no visible shadow tween hesitation; repeated input focus is immediate.
- **Done when**: these three files do not transition `box-shadow`.

## Completion note

The implementation also removed background/border transitions from high-frequency inputs and tabs so all retained transitions use composited `transform`/`opacity` properties.
