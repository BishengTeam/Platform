# 005 — Replace transition: all

- **Status**: DONE
- **Commit**: 9a3bc2a
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 10 SCSS files, mechanical

## Problem

The repository contains 15 `transition: all` declarations in high-frequency components. Example:

```scss
/* src/components/TagFilter/index.module.scss:19 — current */
.tag {
  transition: all 0.2s;
}
```

`all` can animate unintended layout, paint, and text properties.

## Target

Transition only properties that visibly change. Use 150–200ms and the strong ease-out curve.

Target mappings:

- `src/pages/activity-zone/index.module.scss:24`, `.mainTab`: `background-color, color`
- same file `:44`, `.action`: `opacity, transform`
- `src/pages/orders/index.module.scss:31`, `.tab`: `transform`
- same file `:79`, `.card`: `transform, opacity`
- `src/pages/ai-consult/index.module.scss:61`, `.backBtn`: `transform, opacity`
- `src/components/PageHeader/index.module.scss:37`, `.backBtn`: `transform, opacity`
- `src/pages/registration/form.module.scss:105`, `.identityOption`: `background-color, color`
- `src/pages/registration/index.module.scss:44`, `.categoryCard`: `transform, background-color`
- `src/pages/training/index.module.scss:48`, `.courseCard`: `transform, background-color`
- same file `:149`, `.studyBtn`: `background-color`
- `src/components/ZonesBanner/index.module.scss:47`, `.btn`: `transform`
- `src/components/TagFilter/index.module.scss:19`, `.tag`: `background-color, color`
- same file `:31`, `.underlineTab`: `transform`
- `src/components/ChatRichCard/index.module.scss:13`, `.card`: `transform, opacity`
- `src/components/ZoneCard/index.module.scss:9`, `.card`: `transform, opacity`

If plan 008's tokens are already present, use:

```scss
transition: transform 160ms $motion-ease-out;
```

or:

```scss
transition:
  transform 160ms $motion-ease-out,
  opacity 160ms $motion-ease-out;
```

## Repo conventions to follow

- Transition declarations live on the resting selector, not only inside `:active`.
- Use SCSS variables from `src/styles/_variables.scss`.

## Steps

1. Replace all 15 declarations using the property mappings above.
2. Confirm `rg "transition:\\s*all" src --glob '*.scss'` returns no matches.
3. Do not add replacement transitions for properties that do not change.

## Boundaries

- Do not change component structure.
- Do not add dependencies.
- Do not animate layout properties.

## Verification

- **Mechanical**: `rg "transition:\\s*all" src --glob '*.scss'` exits with no matches; `npm run typecheck && npm test && npm run build:weapp`.
- **Feel check**: tabs, cards, filters, and back buttons still animate their visible state without unintended text/layout side effects.
- **Done when**: every transition names explicit properties.

## Completion note

High-frequency background, border, and text-color state changes were made instant during review. This is stricter than the original target and follows the remedial preference to remove unnecessary paint transitions; retained transitions animate only `transform` and `opacity`.
