# Animation Improvement Plans

Status legend: `TODO`, `IN REVIEW`, `DONE`, `RETIRED`.

| Plan | Title | Severity | Status | Order / dependency |
|---|---|---:|---|---|
| [001](001-floating-service-transform-drag.md) | Move floating service drag to transforms | HIGH | DONE | Complete |
| [002](002-cap-chat-message-stagger.md) | Cap chat message entrance stagger | HIGH | DONE | Complete |
| [003](003-fix-active-release-transitions.md) | Fix press release snap | HIGH | DONE | Complete |
| [004](004-add-reduced-motion.md) | Add reduced motion support | MEDIUM | DONE | Complete |
| [005](005-replace-transition-all.md) | Replace transition: all | MEDIUM | DONE | Complete |
| [006](006-unify-press-scale.md) | Unify exaggerated press scales | MEDIUM | DONE | Complete |
| [007](007-reduce-paint-transitions.md) | Reduce paint-heavy transitions | MEDIUM | DONE | Complete |
| [008](008-create-motion-tokens.md) | Create shared motion tokens | MEDIUM | DONE | Complete |
| [009](009-shorten-empty-state-entrance.md) | Shorten empty-state entrance | LOW | DONE | Complete |
| [010](010-persistent-tab-indicators.md) | Use persistent sliding tab indicators | MEDIUM | DONE | Complete |

## Recommended execution order

1. 001, 002, 003, 006 — high-leverage correctness and feel fixes.
2. 005, 007 — narrow transition properties.
3. 008 — consolidate values into tokens.
4. 004, 009 — accessibility and final polish. Reduced motion is easiest to add after the final motion properties are known.

## Global requirement

All executors must run:

```bash
npm run typecheck
npm test
npm run build:weapp
```
