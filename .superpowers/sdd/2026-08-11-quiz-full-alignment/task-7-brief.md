# Task 7: 重写服务端练习会话与幂等提交

## Files
- Create: `src/features/quiz/idempotency.ts`
- Modify: `src/pages/quiz/practice.tsx`, `practice.module.scss`
- Create: `src/features/quiz/__tests__/idempotency.test.ts`
- Create: `src/pages/quiz/__tests__/practice.test.tsx`

## Requirements
1. TDD first. Tests exercise real idempotency module/page; mock quizApi, auth and Taro boundaries only.
2. `getOrCreateAttemptKey(sessionId, sessionQuestionId, localAttemptId)` persists a stable 8–64 char key. Same attempt/retry returns same key. Clear only after confirmed success. Explicit re-answer/new localAttemptId yields a new key.
3. Page waits for auth initialization. On entry query current session; restore if active. If none, show normal/wrong setup with category where relevant and fixed 10/20/50/100 counts.
4. Create normal session with category_id/question_count; wrong with mode wrong and optional count. Use returned session snapshots only, never `/questions`.
5. Submit exact session_question_id/idempotency_key/user_answer. Network/API failure preserves selection/key and gives explicit retry. Success renders server is_correct/correct_answer/explanation and refreshes session state as required.
6. No local grading. Three types supported, multi answer normalized, explicit submit only. Free navigation allowed.
7. Re-answer creates a new logical attempt key and keeps all server attempt results represented by latest_result/attempt_count.
8. Completed session read-only and offers next session. Active session supports continue or confirmed abandon. Abandon keeps history.
9. Remove all manual wrong-book UI/calls and old submit functions. Collection remains by question_id if retained.
10. Loading/empty/error/retry states; no silent catch. Preserve server session ID and pending answer on retry.
11. Run focused/full tests and touched typecheck zero. Commit only task files: `feat: implement resumable quiz practice sessions`.

## Report
Write task-7-report.md with RED/GREEN, idempotency lifecycle, restore/create/submit/retry/reanswer/complete/abandon evidence, full tests/typecheck, commit, concerns.
