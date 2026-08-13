# Task 4: 建立题库适配器、错误模型和答案隔离测试

## Files
- Create: `src/features/quiz/adapters.ts`
- Create: `src/features/quiz/errors.ts`
- Create: `src/features/quiz/__tests__/adapters.test.ts`
- Create: `src/features/quiz/__tests__/errors.test.ts`

## Interfaces and requirements

- Export `formatQuizAnswer(answer: QuizAnswer): QuizAnswer`: strings unchanged; arrays deduplicated and sorted without mutating input.
- Export `toQuestionViewModel(question: QuizPublicQuestion)` with exact three-type preservation, option array for rendering, no answer/analysis fields.
- Add only focused view models needed by upcoming pages; no page/network state.
- Export `toQuizErrorState(error: unknown): QuizErrorState` where union kinds are unauthorized, forbidden, not_found, conflict, validation, rate_limited, network; preserve safe message.
- Map `ApiError.statusCode/code` deterministically: 401,403,404,409,422,429; other ApiError/network becomes network. Do not clear auth here.
- Answer isolation tests must serialize public question, wrong-book, collection, in-progress exam, abandoned exam and prove no `correct_answer`/`explanation`; use real typed fixtures and adapter behavior, not source grep.
- TDD: write focused failing tests first and observe expected failure; minimal implementation; GREEN; project typecheck delta has no new touched-file diagnostics.
- No `any`, broad casts, local grading, API calls, React, or Taro dependencies.
- Commit only task files: `git -c core.hooksPath=NUL commit -m "feat: add quiz adapters and error states"`.

## Report
Write `.superpowers/sdd/2026-08-11-quiz-full-alignment/task-4-report.md` with RED/GREEN, files, typecheck delta, commit, self-review, concerns.
