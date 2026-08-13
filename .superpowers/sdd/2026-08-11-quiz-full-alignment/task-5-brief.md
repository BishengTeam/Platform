# Task 5: 修复认证生命周期与单例 Token 刷新

## Files
- Modify: `src/utils/storage.ts`
- Modify: `src/utils/request.ts`
- Modify: `src/services/authService.ts`
- Modify: `src/app.tsx`
- Modify: `src/hooks/useAuth.ts`
- Modify: `src/components/AuthGuard/index.tsx` only if needed for initialized/loading behavior
- Create: `src/features/quiz/__tests__/authRecovery.test.ts`

## Interfaces
- `AuthSession { accessToken: string; refreshToken: string; expiresAt: number }`
- `getAuthSession()`, `setAuthSession(session)`, `clearAuthSession()`
- one shared refresh promise for concurrent 401 responses
- original request replayed at most once after refresh
- observable auth initialization state consumed by `useAuth`

## Requirements
1. TDD real behavior tests first. Mock only Taro storage/request/navigation and external auth endpoint boundary where unavoidable.
2. Prove no missing token path writes `mock_token`.
3. Prove two concurrent protected requests receiving 401 trigger exactly one refresh and both replay with the new access token.
4. Prove refresh failure clears session and triggers a single login redirect/modal path; no recursion.
5. Prove a replayed request returning 401 is not refreshed again.
6. Persist access token, refresh token and expiry from WeChat login/refresh. Maintain temporary compatibility reads only if necessary for non-quiz code, but never synthesize credentials.
7. App launch resolves existing unexpired session first; otherwise performs WeChat login. It must expose initialized state regardless of success/failure.
8. `useAuth` must not mark unauthenticated before initialization completes. `AuthGuard` shows loading while checking and redirects only after checked.
9. Preserve public anonymous requests: lack of token does not force redirect until endpoint actually returns 401.
10. 403 must not clear session. Other request errors keep existing behavior unless tests require a narrow improvement.
11. No `any`, refresh-token logging, infinite retry, duplicate modal/navigation, or unrelated auth redesign.
12. Run focused tests, full tests, and project typecheck delta. Existing unrelated diagnostics allowed; touched-file diagnostics must be zero.
13. Commit only task files: `git -c core.hooksPath=NUL commit -m "fix: make authentication refresh and recovery reliable"`.

## Report
Write task-5-report.md with RED/GREEN, concurrency evidence, full test result, typecheck delta, commit, concerns.
