# Task 4 report: quiz adapters and error states

## RED/GREEN

- RED: Ran the isolated Node runtime against the new focused suites before implementation:
  `./.superpowers/tools/node/node.exe ./node_modules/vitest/vitest.mjs run src/features/quiz/__tests__/adapters.test.ts src/features/quiz/__tests__/errors.test.ts`.
  It failed as expected because `../adapters` and `../errors` did not exist.
- GREEN: The same isolated runtime command passed after the minimal pure implementations: 2 test files, 22 tests passed.

## Files

- `src/features/quiz/adapters.ts`
- `src/features/quiz/errors.ts`
- `src/features/quiz/__tests__/adapters.test.ts`
- `src/features/quiz/__tests__/errors.test.ts`

## Typecheck delta

- The full project typecheck still reports existing diagnostics outside this task, primarily legacy quiz-page references removed by prior contract work and unrelated application modules.
- Filtering the full typecheck output for the four Task 4 paths produced `TOUCHED_DIAGNOSTICS=0`.

## Commit

- `ff0ed61 feat: add quiz adapters and error states`

## Self-review

- `formatQuizAnswer` returns strings untouched and returns a sorted, deduplicated copy for arrays.
- Question view models preserve all three question types and expose only display data with render-ready option arrays.
- Public question, wrong-book, collection, in-progress exam, and abandoned exam fixtures are serialized through the real adapter with no grading fields.
- Error mapping is framework-free; it deterministically prioritizes `statusCode` over `code` and does not mutate authentication state.
- No `any`, React, Taro, API calls, local grading, or unrelated production changes.

## Concerns

- `vitest run` across the repository exits non-zero because the pre-existing `quizTypes.contract.test.ts` is a compile-time-only contract file with no Vitest suite. Focused Task 4 suites pass.

## Fix round 1/5: error precedence

- Root cause: `errorKindForCode(statusCode) ?? errorKindForCode(code)` conflated an available-but-unmapped nonzero HTTP status with an unavailable status. An `ApiError` with `statusCode: 500` and `code: 404` was therefore exposed as `not_found`.
- RED: Added the focused regression for `500 + 404 => network`; isolated Node Vitest failed with received `not_found`, as expected.
- GREEN: Status mapping now uses every nonzero `statusCode` as authoritative. Only `statusCode: 0` falls back to `code`. Existing mapped-disagreement and zero-status fallback tests remain green.
- Verification: isolated Node Vitest passed 2 files / 23 tests; touched-file typecheck filter returned `TOUCHED_DIAGNOSTICS=0`.
- Commit: `bc7aa0b fix: respect quiz error status precedence` (only `errors.ts` and `errors.test.ts`).
