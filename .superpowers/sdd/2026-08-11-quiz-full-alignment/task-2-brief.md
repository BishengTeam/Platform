# Task 2: 用严格类型覆盖 22 个用户端接口

## Context

Replace the legacy quiz page types with the exact current Backend public contract. This task defines types only; do not change API services or pages. Backend source of truth is `../Backend/app/schemas/quiz_contract.py` plus enums in `../Backend/app/domain/community/src/rule/quiz.py`.

## Files

- Modify: `src/types/quiz.ts`
- Create: `src/features/quiz/__tests__/quizTypes.test-d.ts`
- If required for an executable isolated type gate, create: `tsconfig.quiz-types.json`
- Modify: `package.json` only if adding a focused `typecheck:quiz-types` command.

## Required interfaces

Export exact types for all 22 operations, including:

- `QuizQuestionType = 'single_choice' | 'multiple_choice' | 'judge'`
- `QuizAnswer = string | string[]`
- category tree and public question
- practice create/query/session/question state/attempt request/result/abandon/history
- wrong-book item, collection item/mutation, check-in status/calendar day
- `QuizStatsResponse { practice, exam }`
- exam create/list item, in-progress/abandoned/settled detail, answer save/result and action result
- `QuizExamDetail` as a discriminated union on `status`
- generic pagination shape used by Backend API responses

Keep DTO keys snake_case. Do not include `correct_answer` or `explanation` in public question, wrong-book question, collection question, in-progress exam question, or abandoned exam question. Only practice attempt/history and settled exam results may expose them.

## TDD requirements

1. First create executable compile-time contract tests using complete hand-written literals with `satisfies`, not `as` casts.
2. Include negative `@ts-expect-error` cases for at least unsupported `essay` question type, invalid answer shape, and answer leakage onto an in-progress exam question.
3. Run the focused type gate and observe expected failures because the new exports/shapes do not exist.
4. Implement the minimum exact types by transcribing Backend fields and enums.
5. Run the focused gate GREEN. Because project-wide `npm run typecheck` has documented unrelated legacy errors, the focused config must include only `src/types/quiz.ts` and the `.test-d.ts` contract file plus required ambient types; do not weaken the main `tsconfig.json`.
6. Run project-wide `npm run typecheck` and confirm no new diagnostics originate from the changed type/test files. Existing page/service diagnostics are expected for later migration tasks.
7. No `any`, broad `unknown`, index signatures, or forced assertions to make tests pass.
8. Self-review for exact field names, optionality, numeric bounds represented by comments where TypeScript cannot encode them, and answer visibility.
9. Commit only Task 2 files with `git -c core.hooksPath=NUL commit -m "refactor: define strict quiz API contracts"`.

## Global constraints

- Backend 22 user operations are the only scope.
- No old endpoint compatibility or old camelCase view model in the contract file.
- Question types are exactly single choice, multiple choice, and judge.
- Service-side session/exam status and answer visibility are authoritative.

## Report contract

Write `.superpowers/sdd/2026-08-11-quiz-full-alignment/task-2-report.md` with status, files, RED/GREEN command and output, project typecheck delta, commit, self-review, concerns. Return only status, commits, one-line test summary, concerns.
