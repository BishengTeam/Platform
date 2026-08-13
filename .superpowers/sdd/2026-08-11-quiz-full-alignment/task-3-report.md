# Task 3 report

## Status

DONE_WITH_CONCERNS

## Files

- `src/services/quizService.ts` — replaced legacy adapters and mock fallback with the strict 22-operation `quizApi` client.
- `src/services/dataService.ts` — exports only `quizApi` for the quiz domain.
- `src/features/quiz/__tests__/quizService.test.ts` — table-driven HTTP-boundary contract coverage for all 22 operations.

## RED / GREEN evidence

- RED: `npm test -- --run src/features/quiz/__tests__/quizService.test.ts` exited 1 with all 22 cases failing because `quizApi` was undefined and therefore its new methods did not exist.
- GREEN: the same focused command exited 0 with 1 test file and 22 tests passing. Each case asserts the selected HTTP wrapper, literal route, exact query/body when present, and `response.data` identity.
- Focused DTO typecheck: `npm run typecheck:quiz-types` exited 0.

## Exact methods covered

`listCategories`, `listQuestions`, `createPracticeSession`, `getCurrentPracticeSession`, `getPracticeSession`, `submitPracticeAttempt`, `abandonPracticeSession`, `listPracticeHistory`, `listWrongBook`, `listCollections`, `addCollection`, `removeCollection`, `getCheckinStatus`, `getCheckinCalendar`, `getStats`, `createExam`, `getCurrentExam`, `listExams`, `getExam`, `saveExamAnswer`, `submitExam`, `abandonExam`.

The explicit cases enforce the practice attempt body (`session_question_id`, `idempotency_key`, `user_answer`), collection deletion by `question_id`, check-in `date_from`/`date_to`, and the exam-answer `PUT` path with `lock_version`.

## Project typecheck delta

`npm run typecheck` still exits 1. No error remains in `src/services/quizService.ts` after the DTO request objects were copied into request-compatible records. Expected downstream quiz page errors now identify removed legacy exports and legacy view types, including imports of `getQuizCategories`, `getQuizQuestions`, `submitQuizAnswer`, `getQuizProgress`, `addWrongBook`, `removeWrongBook`, collection/check-in adapters, and old quiz DTO names. Numerous pre-existing non-quiz errors remain in components, profile, registration, user, and zone code. Compatibility aliases were intentionally not retained.

## Commit

`35933434f74b5f067677dc1bc74a14a487012736` — contains only the three Task 3 source/test files. The unrelated staged design document was restored to its prior staged state after it was briefly included in the first attempt.

## Self-review

- The object has exactly 22 public operations and no old compatibility exports.
- Routes, methods, snake_case query/body keys, numeric path IDs, and return DTOs match the Backend contract registry.
- No mock fallback, mock imports, local transformations, manual wrong-book changes, manual check-in, or local exam generation remain.
- Only `get`, `post`, `put`, and `del` are mocked in tests; real `quizApi` methods are exercised.

## Concerns

Project typecheck will remain red until the downstream pages are migrated in their assigned task; this task deliberately removed their legacy API surface.
