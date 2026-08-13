5f74335 fix: handle stale authentication failures
 .../task-5-report.md                               | 10 ++++
 src/features/quiz/__tests__/authRecovery.test.ts   | 58 ++++++++++++++++++++++
 src/utils/request.ts                               | 18 ++++++-
 src/utils/storage.ts                               |  7 +++
 4 files changed, 91 insertions(+), 2 deletions(-)
diff --git a/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-5-report.md b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-5-report.md
index 13b3058..b609319 100644
--- a/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-5-report.md
+++ b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-5-report.md
@@ -24,10 +24,20 @@ Inspected `Backend/app/schemas/user.py` and `Backend/app/services/auth.py`. Both
 - Project typecheck: exits non-zero on existing unrelated diagnostics across legacy components, pages, quiz exports, services, and shared types. The compiler emitted zero diagnostics for Task 5 touched files (`src/app.tsx`, `src/hooks/useAuth.ts`, `src/services/authService.ts`, `src/utils/request.ts`, `src/utils/storage.ts`, and `authRecovery.test.ts`).
 
 ## Commit
 
 Committed with message `fix: make authentication refresh and recovery reliable`; the final hash is reported in the handoff. Unrelated staged docs and `.gitignore` remain preserved and were excluded from the Task 5 commit.
 
 ## Concerns
 
 - The compatibility `setToken` path intentionally stores only the legacy access token for existing non-auth callers; successful login/refresh now use complete `AuthSession` persistence.
 - Self-review found no refresh-token logging, `any`, recursive refresh, second replay, anonymous-request redirect, 403 session clearing, or unrelated auth redesign in the Task 5 diff.
+
+## Fix round 1
+
+- RED: two focused regressions failed against `0bee728`: a late old-token 401 started refresh call 2, and a later auth failure after a successful new session left the modal count at 1 instead of 2.
+- GREEN: focused auth recovery tests pass 12/12.
+- Late-response fix: each request retains the access token it actually sent. If a 401 arrives after the stored session has a different access token, the request replays once with that current token and does not refresh again.
+- Failure-episode fix: successful complete-session establishment emits an internal observable that resets request-module redirect suppression. Concurrent failures within one episode remain suppressed because clearing a session does not emit it.
+- Full tests: PASS, 6 files and 59 tests passed (`npm test -- --run`).
+- Project typecheck: remains non-zero on the same unrelated repository diagnostics; zero diagnostics were emitted for the round's touched files (`src/utils/request.ts`, `src/utils/storage.ts`, and `authRecovery.test.ts`).
+- Diff check and self-review: clean; no new replay path exceeds one replay, and no unrelated files were modified.
diff --git a/src/features/quiz/__tests__/authRecovery.test.ts b/src/features/quiz/__tests__/authRecovery.test.ts
index fdbfcce..1dacef5 100644
--- a/src/features/quiz/__tests__/authRecovery.test.ts
+++ b/src/features/quiz/__tests__/authRecovery.test.ts
@@ -25,20 +25,28 @@ vi.mock('@/components/ErrorBoundary', () => ({
 interface ResponseBody<T = unknown> {
   code: number
   data: T
   message: string
 }
 
 function response<T>(statusCode: number, data: ResponseBody<T>) {
   return Promise.resolve({ statusCode, data, header: {}, cookies: [] })
 }
 
+function deferred<T>() {
+  let resolve!: (value: T) => void
+  const promise = new Promise<T>((settle) => {
+    resolve = settle
+  })
+  return { promise, resolve }
+}
+
 async function loadStorage() {
   return import('@/utils/storage')
 }
 
 async function loadRequest() {
   return import('@/utils/request')
 }
 
 describe('authentication recovery', () => {
   beforeEach(() => {
@@ -121,20 +129,54 @@ describe('authentication recovery', () => {
       'Bearer old-access',
       'Bearer new-access',
       'Bearer new-access',
     ])
     expect((await loadStorage()).getAuthSession()).toMatchObject({
       accessToken: 'new-access',
       refreshToken: 'new-refresh',
     })
   })
 
+  it('replays a late stale 401 with the current token without starting another refresh', async () => {
+    const { setAuthSession } = await loadStorage()
+    setAuthSession({ accessToken: 'old-access', refreshToken: 'old-refresh', expiresAt: Date.now() + 60_000 })
+    const lateResponse = deferred<Awaited<ReturnType<typeof response>>>()
+    let refreshCalls = 0
+    taro.request.mockImplementation(({ url, header }) => {
+      if (url.endsWith('/api/auth/refresh')) {
+        refreshCalls += 1
+        return response(200, {
+          code: 0,
+          data: { access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 7200 },
+          message: 'ok',
+        })
+      }
+      if (url.endsWith('/api/quiz/stats') && header.Authorization === 'Bearer old-access') {
+        return lateResponse.promise
+      }
+      return header.Authorization === 'Bearer new-access'
+        ? response(200, { code: 0, data: { url }, message: 'ok' })
+        : response(401, { code: 40100, data: null, message: 'expired' })
+    })
+    const { request } = await loadRequest()
+
+    const first = request({ url: '/api/quiz/questions', showLoading: false })
+    const second = request({ url: '/api/quiz/stats', showLoading: false })
+    await expect(first).resolves.toMatchObject({ code: 0 })
+    expect(refreshCalls).toBe(1)
+
+    lateResponse.resolve(await response(401, { code: 40100, data: null, message: 'late expired response' }))
+
+    await expect(second).resolves.toMatchObject({ code: 0 })
+    expect(refreshCalls).toBe(1)
+  })
+
   it('clears a failed refresh and opens only one login path without recursive refresh', async () => {
     const { getAuthSession, setAuthSession } = await loadStorage()
     setAuthSession({ accessToken: 'expired-access', refreshToken: 'bad-refresh', expiresAt: Date.now() + 60_000 })
     let refreshCalls = 0
     taro.request.mockImplementation(({ url }) => {
       if (url.endsWith('/api/auth/refresh')) refreshCalls += 1
       return response(401, { code: 40100, data: null, message: 'expired' })
     })
     const { request } = await loadRequest()
 
@@ -143,20 +185,36 @@ describe('authentication recovery', () => {
       request({ url: '/api/quiz/stats', showLoading: false }),
     ])
 
     expect(results.every((result) => result.status === 'rejected')).toBe(true)
     expect(refreshCalls).toBe(1)
     expect(getAuthSession()).toBeNull()
     expect(taro.showModal).toHaveBeenCalledOnce()
     expect(taro.reLaunch).toHaveBeenCalledOnce()
   })
 
+  it('allows one new login redirect after a successful session starts a later failure episode', async () => {
+    const { setAuthSession } = await loadStorage()
+    setAuthSession({ accessToken: 'first-access', refreshToken: 'first-refresh', expiresAt: Date.now() + 60_000 })
+    taro.request.mockReturnValue(response(401, { code: 40100, data: null, message: 'expired' }))
+    const { request } = await loadRequest()
+
+    await expect(request({ url: '/api/quiz/questions', showLoading: false })).rejects.toThrow('UNAUTHORIZED')
+    expect(taro.showModal).toHaveBeenCalledOnce()
+
+    setAuthSession({ accessToken: 'second-access', refreshToken: 'second-refresh', expiresAt: Date.now() + 60_000 })
+    await expect(request({ url: '/api/quiz/stats', showLoading: false })).rejects.toThrow('UNAUTHORIZED')
+
+    expect(taro.showModal).toHaveBeenCalledTimes(2)
+    expect(taro.reLaunch).toHaveBeenCalledTimes(2)
+  })
+
   it('does not refresh a replayed request a second time when the replay also returns 401', async () => {
     const { setAuthSession } = await loadStorage()
     setAuthSession({ accessToken: 'old-access', refreshToken: 'old-refresh', expiresAt: Date.now() + 60_000 })
     let refreshCalls = 0
     taro.request.mockImplementation(({ url }) => {
       if (url.endsWith('/api/auth/refresh')) {
         refreshCalls += 1
         return response(200, {
           code: 0,
           data: { access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 7200 },
diff --git a/src/utils/request.ts b/src/utils/request.ts
index 3897b32..6ffef0c 100644
--- a/src/utils/request.ts
+++ b/src/utils/request.ts
@@ -1,12 +1,18 @@
 import Taro from '@tarojs/taro'
-import { clearAuthSession, getAccessToken, getAuthSession, setAuthToken } from '@/utils/storage'
+import {
+  clearAuthSession,
+  getAccessToken,
+  getAuthSession,
+  setAuthToken,
+  subscribeAuthSessionEstablished,
+} from '@/utils/storage'
 
 const BASE_URL = (process.env.TARO_APP_API_BASE || '').replace(/\/+$/, '')
 
 export function resolveUrl(path: string | null | undefined): string {
   if (!path) return ''
   if (/^https?:\/\//i.test(path)) return path
   if (!BASE_URL) return path
   return `${BASE_URL}${path}`
 }
 
@@ -45,20 +51,24 @@ export interface RequestOptions {
   method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
   data?: Record<string, unknown>
   header?: Record<string, string>
   showLoading?: boolean
   authRecovery?: boolean
 }
 
 let refreshPromise: Promise<void> | null = null
 let loginRedirectStarted = false
 
+subscribeAuthSessionEstablished(() => {
+  loginRedirectStarted = false
+})
+
 function isUnauthorized<T>(statusCode: number, result: ApiResponse<T>): boolean {
   return statusCode === 401 || (result.code >= 40100 && result.code <= 40199)
 }
 
 function showLoginPath(message: string): void {
   if (loginRedirectStarted) return
   loginRedirectStarted = true
   Taro.showModal({
     title: '提示',
     content: message || '登录已过期，请重新登录',
@@ -103,21 +113,25 @@ async function execute<T>(options: RequestOptions, hasReplayed: boolean): Promis
     header: headers,
     timeout: 15000,
   })
   const result = res.data as ApiResponse<T>
   const hasBusinessCode = result && typeof result.code === 'number'
 
   if (isUnauthorized(res.statusCode, result)) {
     if (!authRecovery) {
       throw new ApiError(result?.message || 'Unauthorized', result?.code ?? 401, 401)
     }
-    if (!hasReplayed && getAuthSession()?.refreshToken) {
+    const currentSession = getAuthSession()
+    if (!hasReplayed && currentSession?.accessToken && currentSession.accessToken !== token) {
+      return execute<T>(options, true)
+    }
+    if (!hasReplayed && currentSession?.refreshToken) {
       await refreshAuthSession()
       return execute<T>(options, true)
     }
     return failAuthentication(result?.message || '登录已过期，请重新登录')
   }
 
   if ((res.statusCode < 200 || res.statusCode >= 300) && !hasBusinessCode) {
     throw new ApiError(result?.message || `服务器异常 (${res.statusCode})`, res.statusCode, res.statusCode)
   }
   if (result && result.code === 0) return result
diff --git a/src/utils/storage.ts b/src/utils/storage.ts
index 8069efd..61ea85e 100644
--- a/src/utils/storage.ts
+++ b/src/utils/storage.ts
@@ -11,20 +11,21 @@ export interface AuthSession {
 
 export interface AuthState {
   initialized: boolean
   isLoggedIn: boolean
 }
 
 type AuthListener = () => void
 
 let authState: AuthState = { initialized: false, isLoggedIn: false }
 const authListeners = new Set<AuthListener>()
+const sessionEstablishedListeners = new Set<AuthListener>()
 
 function isAuthSession(value: unknown): value is AuthSession {
   if (!value || typeof value !== 'object') return false
   const candidate = value as Record<string, unknown>
   return typeof candidate.accessToken === 'string'
     && candidate.accessToken.length > 0
     && typeof candidate.refreshToken === 'string'
     && candidate.refreshToken.length > 0
     && typeof candidate.expiresAt === 'number'
     && Number.isFinite(candidate.expiresAt)
@@ -38,20 +39,21 @@ function updateAuthState(next: AuthState): void {
 
 export function getAuthSession(): AuthSession | null {
   const value: unknown = Taro.getStorageSync(AUTH_SESSION_KEY)
   return isAuthSession(value) ? value : null
 }
 
 export function setAuthSession(session: AuthSession): void {
   Taro.setStorageSync(AUTH_SESSION_KEY, session)
   Taro.setStorageSync(LEGACY_TOKEN_KEY, session.accessToken)
   updateAuthState({ ...authState, isLoggedIn: session.expiresAt > Date.now() })
+  sessionEstablishedListeners.forEach((listener) => listener())
 }
 
 export function clearAuthSession(): void {
   Taro.removeStorageSync(AUTH_SESSION_KEY)
   Taro.removeStorageSync(LEGACY_TOKEN_KEY)
   updateAuthState({ ...authState, isLoggedIn: false })
 }
 
 export function getAccessToken(): string {
   return getAuthSession()?.accessToken || Taro.getStorageSync(LEGACY_TOKEN_KEY) || ''
@@ -79,10 +81,15 @@ export function getAuthState(): AuthState {
 }
 
 export function setAuthInitialized(): void {
   updateAuthState({ initialized: true, isLoggedIn: isLoggedIn() })
 }
 
 export function subscribeAuth(listener: AuthListener): () => void {
   authListeners.add(listener)
   return () => authListeners.delete(listener)
 }
+
+export function subscribeAuthSessionEstablished(listener: AuthListener): () => void {
+  sessionEstablishedListeners.add(listener)
+  return () => sessionEstablishedListeners.delete(listener)
+}

