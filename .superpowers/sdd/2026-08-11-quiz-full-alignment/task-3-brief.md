# Task 3: 重建题库 API 服务并删除旧路径

## Context

Implement a thin, strict request service for every current Backend public quiz route. Use the types created in Task 2. Do not change pages or add DTO/view adapters in this task.

## Files

- Modify: `src/services/quizService.ts`
- Modify: `src/services/dataService.ts`
- Create: `src/features/quiz/__tests__/quizService.test.ts`

## Interface

Export one `quizApi` object whose methods map one-to-one to the 22 current public operations:

1. `listCategories()`
2. `listQuestions(query)`
3. `createPracticeSession(body)`
4. `getCurrentPracticeSession()`
5. `getPracticeSession(sessionId)`
6. `submitPracticeAttempt(sessionId, body)`
7. `abandonPracticeSession(sessionId)`
8. `listPracticeHistory(query)`
9. `listWrongBook(query)`
10. `listCollections(query)`
11. `addCollection(body)`
12. `removeCollection(questionId)`
13. `getCheckinStatus()`
14. `getCheckinCalendar(query)`
15. `getStats()`
16. `createExam(body)`
17. `getCurrentExam()`
18. `listExams(query)`
19. `getExam(examId)`
20. `saveExamAnswer(examId, examQuestionId, body)`
21. `submitExam(examId)`
22. `abandonExam(examId)`

Use the existing `get/post/put/del` wrapper and return `response.data`, typed with Task 2 DTOs. IDs are numbers. Query and body keys stay snake_case.

## TDD requirements

1. Mock only the external HTTP request boundary in `@/utils/request`; exercise real `quizApi` methods.
2. Before implementation, write behavior tests that fail because `quizApi`/methods do not exist or call the old contract.
3. Each test must assert the observable method/path/payload/query and returned data. At minimum cover all 22 methods using a table or focused groups; a wrong HTTP method, path, or payload must fail a test.
4. Explicitly cover:
   - practice attempt path and exact body containing `session_question_id`, `idempotency_key`, `user_answer`
   - collection delete path using `question_id`
   - calendar query using `date_from/date_to`, never `days`
   - exam answer `PUT` path and `lock_version`
5. Implement the minimum `quizApi` object. Do not transform DTOs.
6. Delete all `USE_MOCK` logic and quiz mock imports from the service.
7. Delete old exports/functions `submitQuizAnswer`, `getQuizProgress`, `addWrongBook`, `removeWrongBook`; update `dataService.ts` so it exports `quizApi` and no removed functions.
8. Do not add a source-grep unit test. The executable whole-tree legacy-path scanner belongs to Task 13.
9. Run focused tests GREEN and focused typecheck if needed. Run project typecheck and report expected downstream page errors caused by removed exports; do not keep aliases for compatibility.
10. Commit only task files with `git -c core.hooksPath=NUL commit -m "refactor: align quiz service with backend contract"`.

## Global constraints

- Exactly 22 public user operations; no old compatibility paths.
- No mock fallback, manual wrong-book mutation, manual check-in, or local exam generation.
- Backend DTOs and service state are authoritative.
- No `any` or broad type escape.

## Report contract

Write `.superpowers/sdd/2026-08-11-quiz-full-alignment/task-3-report.md`: status, files, RED/GREEN evidence, exact methods covered, project typecheck delta, commit, self-review, concerns. Return only status, commit, one-line test summary, concerns.
