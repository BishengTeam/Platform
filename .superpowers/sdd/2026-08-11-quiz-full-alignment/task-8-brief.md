# Task 8: 增加练习历史并修复错题、收藏、自动打卡

## Files
- Create: `src/pages/quiz/practice-history.tsx`, `practice-history.module.scss`
- Modify: `src/pages/quiz/wrong-book.tsx`, `wrong-book.module.scss`
- Modify: `src/pages/quiz/collections.tsx`, `collections.module.scss`
- Modify: `src/pages/quiz/checkin.tsx`, `checkin.module.scss`
- Modify: `src/app.config.ts`, `src/constants/quiz.ts`
- Create: `src/pages/quiz/__tests__/practiceAssets.test.tsx`

## Requirements
1. TDD first; real pages/components where practical, mock quizApi/auth/Taro boundaries only.
2. Practice history: protected, pagination and category/question_type/is_correct/date_from/date_to filters; show frozen question/options, user_answer, correct_answer, explanation, is_correct, attempt_no, submitted_at. Every attempt including reanswers visible.
3. Wrong book: read-only. Remove delete/manual add controls and calls. Map latest_wrong_at, question_status, usable_for_practice. Wrong-special action creates/opens mode=wrong practice, not category normal practice. Disabled items visibly unusable.
4. Collections: remove by question_id (never collection record ID). Display is_active/question_status; disabled items retained but no practice action. Remove collection-special practice; ordinary navigation must be explicit and supported.
5. Check-in: calendar request uses concrete date_from/date_to for last 30 local Asia/Shanghai calendar days. Delete submitCheckin/manual button. Read today status separately and calendar records; display automatic-checkin explanation. Avoid host timezone off-by-one.
6. All pages loading/empty/error/retry; no silent catches. Asset mutations have pending/error feedback and rollback/reload consistency.
7. Register practice-history and entry. No answers shown in wrong/collection pages.
8. No old wrong-book mutation, manual check-in, recordId deletion, `/submit`, `/progress`, mocks.
9. Focused/full tests and touched typecheck zero. Commit only task files: `feat: complete quiz history and user assets`.

## Report
Write task-8-report.md with RED/GREEN and explicit evidence for history filters/reanswers, wrong read-only/mode, collection question ID, Shanghai date range/no manual check-in, error states, full tests/typecheck, commit, concerns.
