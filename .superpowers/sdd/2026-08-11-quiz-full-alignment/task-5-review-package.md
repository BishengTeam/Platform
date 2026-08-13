0bee728 fix: make authentication refresh and recovery reliable
 .../task-5-report.md                               |  33 +++
 src/app.tsx                                        |  47 ++--
 src/features/quiz/__tests__/authRecovery.test.ts   | 258 +++++++++++++++++++++
 src/hooks/useAuth.ts                               |  16 +-
 src/services/authService.ts                        |  65 +++---
 src/utils/request.ts                               | 209 +++++++----------
 src/utils/storage.ts                               |  82 ++++++-
 7 files changed, 521 insertions(+), 189 deletions(-)
diff --git a/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-5-report.md b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-5-report.md
new file mode 100644
index 0000000..13b3058
--- /dev/null
+++ b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-5-report.md
@@ -0,0 +1,33 @@
+# Task 5 report
+
+## Status
+
+Implementation and verification completed locally.
+
+## RED / GREEN
+
+- RED: `authRecovery.test.ts` initially had 9 failures and 1 pass. Missing session APIs, refresh/replay behavior, startup initialization, and observable auth state were demonstrated.
+- GREEN: focused test result: 1 file passed, 10 tests passed.
+
+## Concurrency evidence
+
+The focused test starts two protected requests that both receive 401 with the old access token. It asserts exactly one `/api/auth/refresh` request and verifies that both original requests replay once with `Bearer new-access`.
+
+## Backend expiry decision
+
+Inspected `Backend/app/schemas/user.py` and `Backend/app/services/auth.py`. Both `LoginResponse` and `RefreshResponse` require `expires_in`, and the service supplies `settings.JWT_EXPIRE_MINUTES * 60`. The client therefore persists `expiresAt = Date.now() + expires_in * 1000` for both login and refresh. No fallback expiry was invented.
+
+## Verification
+
+- Focused: PASS, 10/10.
+- Full tests: PASS, 6 files and 57 tests passed (`npm test -- --run`).
+- Project typecheck: exits non-zero on existing unrelated diagnostics across legacy components, pages, quiz exports, services, and shared types. The compiler emitted zero diagnostics for Task 5 touched files (`src/app.tsx`, `src/hooks/useAuth.ts`, `src/services/authService.ts`, `src/utils/request.ts`, `src/utils/storage.ts`, and `authRecovery.test.ts`).
+
+## Commit
+
+Committed with message `fix: make authentication refresh and recovery reliable`; the final hash is reported in the handoff. Unrelated staged docs and `.gitignore` remain preserved and were excluded from the Task 5 commit.
+
+## Concerns
+
+- The compatibility `setToken` path intentionally stores only the legacy access token for existing non-auth callers; successful login/refresh now use complete `AuthSession` persistence.
+- Self-review found no refresh-token logging, `any`, recursive refresh, second replay, anonymous-request redirect, 403 session clearing, or unrelated auth redesign in the Task 5 diff.
diff --git a/src/app.tsx b/src/app.tsx
index a1d780e..6e63d76 100644
--- a/src/app.tsx
+++ b/src/app.tsx
@@ -1,32 +1,37 @@
-import { useLaunch } from '@tarojs/taro'
-import Taro from '@tarojs/taro'
+import Taro, { useLaunch } from '@tarojs/taro'
 import type { PropsWithChildren } from 'react'
 import { ErrorBoundary } from '@/components/ErrorBoundary'
-import { wxLogin } from '@/services/dataService'
-import { setToken } from '@/utils/request'
+import { wxLogin } from '@/services/authService'
+import { getAuthSession, setAuthInitialized } from '@/utils/storage'
 import '@nutui/nutui-react-taro/dist/style.css'
 import './app.scss'
 
-export default function App({ children }: PropsWithChildren) {
-  useLaunch(() => {
-    // 每次打开小程序自动调用微信登录，获取 token
+function getWechatCode(): Promise<string> {
+  return new Promise((resolve, reject) => {
     Taro.login({
-      success: (loginRes) => {
-        if (loginRes.code) {
-          wxLogin(loginRes.code)
-            .then(({ access_token }) => {
-              setToken(access_token)
-            })
-            .catch(() => {
-              // 后端登录失败不阻塞，用户可手动在 auth 页重试
-            })
-        }
-      },
-      fail: () => {
-        // wx.login 失败静默处理
-      },
+      success: ({ code }) => code ? resolve(code) : reject(new Error('WeChat login returned no code')),
+      fail: reject,
     })
   })
+}
+
+export async function initializeAuth(): Promise<void> {
+  try {
+    const session = getAuthSession()
+    if (session && session.expiresAt > Date.now()) return
+    const code = await getWechatCode()
+    await wxLogin(code)
+  } catch {
+    // Initialization is observable even when WeChat or backend login fails.
+  } finally {
+    setAuthInitialized()
+  }
+}
+
+export default function App({ children }: PropsWithChildren) {
+  useLaunch(() => {
+    void initializeAuth()
+  })
 
   return <ErrorBoundary>{children}</ErrorBoundary>
 }
diff --git a/src/features/quiz/__tests__/authRecovery.test.ts b/src/features/quiz/__tests__/authRecovery.test.ts
new file mode 100644
index 0000000..fdbfcce
--- /dev/null
+++ b/src/features/quiz/__tests__/authRecovery.test.ts
@@ -0,0 +1,258 @@
+import { act, renderHook, waitFor } from '@testing-library/react'
+import { beforeEach, describe, expect, it, vi } from 'vitest'
+
+const storage = new Map<string, unknown>()
+
+const taro = vi.hoisted(() => ({
+  getStorageSync: vi.fn((key: string) => storage.get(key)),
+  setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
+  removeStorageSync: vi.fn((key: string) => storage.delete(key)),
+  request: vi.fn(),
+  login: vi.fn(),
+  showLoading: vi.fn(),
+  hideLoading: vi.fn(),
+  showModal: vi.fn(),
+  showToast: vi.fn(),
+  reLaunch: vi.fn(),
+  useLaunch: vi.fn(),
+}))
+
+vi.mock('@tarojs/taro', () => ({ default: taro, useLaunch: taro.useLaunch }))
+vi.mock('@/components/ErrorBoundary', () => ({
+  ErrorBoundary: ({ children }: { children: unknown }) => children,
+}))
+
+interface ResponseBody<T = unknown> {
+  code: number
+  data: T
+  message: string
+}
+
+function response<T>(statusCode: number, data: ResponseBody<T>) {
+  return Promise.resolve({ statusCode, data, header: {}, cookies: [] })
+}
+
+async function loadStorage() {
+  return import('@/utils/storage')
+}
+
+async function loadRequest() {
+  return import('@/utils/request')
+}
+
+describe('authentication recovery', () => {
+  beforeEach(() => {
+    vi.resetModules()
+    vi.clearAllMocks()
+    vi.useRealTimers()
+    storage.clear()
+    taro.showModal.mockImplementation(({ success }) => {
+      success?.({ confirm: true, cancel: false })
+      return Promise.resolve({ confirm: true, cancel: false })
+    })
+  })
+
+  it('never synthesizes mock credentials when a token is missing', async () => {
+    const { getAuthSession, setAuthToken } = await loadStorage()
+
+    setAuthToken()
+
+    expect(getAuthSession()).toBeNull()
+    expect([...storage.values()]).not.toContain('mock_token')
+  })
+
+  it('persists the complete backend login session using expires_in seconds', async () => {
+    vi.useFakeTimers()
+    vi.setSystemTime(new Date('2026-08-12T00:00:00Z'))
+    taro.request.mockReturnValue(response(200, {
+      code: 0,
+      data: {
+        access_token: 'access-login',
+        refresh_token: 'refresh-login',
+        expires_in: 7200,
+        user: { id: 1, openid: 'openid', nickname: null, phone: null, created_at: '2026-08-12T00:00:00Z' },
+      },
+      message: 'ok',
+    }))
+    const { wxLogin } = await import('@/services/authService')
+    const { getAuthSession } = await loadStorage()
+
+    await wxLogin('wx-code')
+
+    expect(getAuthSession()).toEqual({
+      accessToken: 'access-login',
+      refreshToken: 'refresh-login',
+      expiresAt: Date.parse('2026-08-12T02:00:00Z'),
+    })
+  })
+
+  it('uses one refresh for concurrent 401 responses and replays both with the new access token', async () => {
+    const { setAuthSession } = await loadStorage()
+    setAuthSession({ accessToken: 'old-access', refreshToken: 'old-refresh', expiresAt: Date.now() + 60_000 })
+    const protectedHeaders: Array<Record<string, string>> = []
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
+      protectedHeaders.push(header)
+      const token = header.Authorization
+      return token === 'Bearer new-access'
+        ? response(200, { code: 0, data: { url }, message: 'ok' })
+        : response(401, { code: 40100, data: null, message: 'expired' })
+    })
+    const { request } = await loadRequest()
+
+    const [first, second] = await Promise.all([
+      request<{ url: string }>({ url: '/api/quiz/questions', showLoading: false }),
+      request<{ url: string }>({ url: '/api/quiz/stats', showLoading: false }),
+    ])
+
+    expect(refreshCalls).toBe(1)
+    expect(first.data.url).toContain('/api/quiz/questions')
+    expect(second.data.url).toContain('/api/quiz/stats')
+    expect(protectedHeaders.map((header) => header.Authorization)).toEqual([
+      'Bearer old-access',
+      'Bearer old-access',
+      'Bearer new-access',
+      'Bearer new-access',
+    ])
+    expect((await loadStorage()).getAuthSession()).toMatchObject({
+      accessToken: 'new-access',
+      refreshToken: 'new-refresh',
+    })
+  })
+
+  it('clears a failed refresh and opens only one login path without recursive refresh', async () => {
+    const { getAuthSession, setAuthSession } = await loadStorage()
+    setAuthSession({ accessToken: 'expired-access', refreshToken: 'bad-refresh', expiresAt: Date.now() + 60_000 })
+    let refreshCalls = 0
+    taro.request.mockImplementation(({ url }) => {
+      if (url.endsWith('/api/auth/refresh')) refreshCalls += 1
+      return response(401, { code: 40100, data: null, message: 'expired' })
+    })
+    const { request } = await loadRequest()
+
+    const results = await Promise.allSettled([
+      request({ url: '/api/quiz/questions', showLoading: false }),
+      request({ url: '/api/quiz/stats', showLoading: false }),
+    ])
+
+    expect(results.every((result) => result.status === 'rejected')).toBe(true)
+    expect(refreshCalls).toBe(1)
+    expect(getAuthSession()).toBeNull()
+    expect(taro.showModal).toHaveBeenCalledOnce()
+    expect(taro.reLaunch).toHaveBeenCalledOnce()
+  })
+
+  it('does not refresh a replayed request a second time when the replay also returns 401', async () => {
+    const { setAuthSession } = await loadStorage()
+    setAuthSession({ accessToken: 'old-access', refreshToken: 'old-refresh', expiresAt: Date.now() + 60_000 })
+    let refreshCalls = 0
+    taro.request.mockImplementation(({ url }) => {
+      if (url.endsWith('/api/auth/refresh')) {
+        refreshCalls += 1
+        return response(200, {
+          code: 0,
+          data: { access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 7200 },
+          message: 'ok',
+        })
+      }
+      return response(401, { code: 40100, data: null, message: 'still unauthorized' })
+    })
+    const { request } = await loadRequest()
+
+    await expect(request({ url: '/api/quiz/questions', showLoading: false })).rejects.toThrow('UNAUTHORIZED')
+
+    expect(refreshCalls).toBe(1)
+    expect(taro.showModal).toHaveBeenCalledOnce()
+  })
+
+  it('keeps anonymous public requests anonymous and does not redirect unless the endpoint returns 401', async () => {
+    taro.request.mockImplementation(({ header }) => {
+      expect(header.Authorization).toBeUndefined()
+      return response(200, { code: 0, data: { public: true }, message: 'ok' })
+    })
+    const { request } = await loadRequest()
+
+    await expect(request({ url: '/api/public/content', showLoading: false })).resolves.toMatchObject({ data: { public: true } })
+
+    expect(taro.showModal).not.toHaveBeenCalled()
+    expect(taro.reLaunch).not.toHaveBeenCalled()
+  })
+
+  it('does not clear the session for a 403 response', async () => {
+    const { getAuthSession, setAuthSession } = await loadStorage()
+    const session = { accessToken: 'access', refreshToken: 'refresh', expiresAt: Date.now() + 60_000 }
+    setAuthSession(session)
+    taro.request.mockReturnValue(response(403, { code: 40300, data: null, message: 'forbidden' }))
+    const { request } = await loadRequest()
+
+    await expect(request({ url: '/api/quiz/admin', showLoading: false })).rejects.toMatchObject({ code: 40300 })
+
+    expect(getAuthSession()).toEqual(session)
+    expect(taro.showModal).not.toHaveBeenCalled()
+  })
+
+  it('resolves an unexpired session at startup without calling WeChat login', async () => {
+    const { getAuthState, setAuthSession } = await loadStorage()
+    setAuthSession({ accessToken: 'access', refreshToken: 'refresh', expiresAt: Date.now() + 60_000 })
+    const { initializeAuth } = await import('@/app')
+
+    await initializeAuth()
+
+    expect(taro.login).not.toHaveBeenCalled()
+    expect(getAuthState()).toEqual({ initialized: true, isLoggedIn: true })
+  })
+
+  it('performs WeChat login for an expired session and always exposes initialized state', async () => {
+    vi.useFakeTimers()
+    vi.setSystemTime(new Date('2026-08-12T00:00:00Z'))
+    const { getAuthSession, getAuthState, setAuthSession } = await loadStorage()
+    setAuthSession({ accessToken: 'expired', refreshToken: 'refresh', expiresAt: Date.now() - 1 })
+    taro.login.mockImplementation(({ success }) => success({ code: 'wx-code', errMsg: 'login:ok' }))
+    taro.request.mockReturnValue(response(200, {
+      code: 0,
+      data: {
+        access_token: 'startup-access',
+        refresh_token: 'startup-refresh',
+        expires_in: 3600,
+        user: { id: 1, openid: 'openid', nickname: null, phone: null, created_at: '2026-08-12T00:00:00Z' },
+      },
+      message: 'ok',
+    }))
+    const { initializeAuth } = await import('@/app')
+
+    await initializeAuth()
+
+    expect(getAuthSession()).toEqual({
+      accessToken: 'startup-access',
+      refreshToken: 'startup-refresh',
+      expiresAt: Date.parse('2026-08-12T01:00:00Z'),
+    })
+    expect(getAuthState()).toEqual({ initialized: true, isLoggedIn: true })
+  })
+
+  it('does not report unauthenticated from useAuth until failed initialization completes', async () => {
+    let failLogin: ((error: { errMsg: string }) => void) | undefined
+    taro.login.mockImplementation(({ fail }) => {
+      failLogin = fail
+    })
+    const { initializeAuth } = await import('@/app')
+    const { useAuth } = await import('@/hooks/useAuth')
+    const { result } = renderHook(() => useAuth())
+
+    expect(result.current).toEqual({ isLoggedIn: false, isChecked: false })
+
+    const initialization = initializeAuth()
+    act(() => failLogin?.({ errMsg: 'login failed' }))
+    await act(async () => initialization)
+
+    await waitFor(() => expect(result.current).toEqual({ isLoggedIn: false, isChecked: true }))
+  })
+})
diff --git a/src/hooks/useAuth.ts b/src/hooks/useAuth.ts
index 26901b6..2b56376 100644
--- a/src/hooks/useAuth.ts
+++ b/src/hooks/useAuth.ts
@@ -1,15 +1,7 @@
-import { useEffect, useState } from 'react'
-import { isLoggedIn as checkIsLoggedIn } from '@/utils/storage'
+import { useSyncExternalStore } from 'react'
+import { getAuthState, subscribeAuth } from '@/utils/storage'
 
 export function useAuth() {
-  const [isLoggedIn, setIsLoggedIn] = useState(false)
-  const [isChecked, setIsChecked] = useState(false)
-
-  useEffect(() => {
-    const loggedIn = checkIsLoggedIn()
-    setIsLoggedIn(loggedIn)
-    setIsChecked(true)
-  }, [])
-
-  return { isLoggedIn, isChecked }
+  const auth = useSyncExternalStore(subscribeAuth, getAuthState, getAuthState)
+  return { isLoggedIn: auth.isLoggedIn, isChecked: auth.initialized }
 }
diff --git a/src/services/authService.ts b/src/services/authService.ts
index 93097d9..3fe28f9 100644
--- a/src/services/authService.ts
+++ b/src/services/authService.ts
@@ -1,78 +1,81 @@
-/**
- * 认证服务 — 登录 / 刷新 / 退出 / 实名认证 / 注销 / 解绑
- */
+import { del, get, post } from '@/utils/request'
+import { setAuthSession } from '@/utils/storage'
 
-import { get, post, del } from '@/utils/request'
-
-/** 全局开关：true=mock，false=真实API */
 const USE_MOCK = false
 
-// ================================================================
-// 类型
-// ================================================================
-
-/** 实名认证信息（对齐后端 RealnameResponse） */
 export interface IdentityInfo {
   user_type: 'student' | 'enterprise'
   real_name: string
   id_card_number: string
   id_card_front_oss: string | null
   id_card_back_oss: string | null
   student_card_oss: string | null
   status: 'pending' | 'verified' | 'rejected' | null
   reject_reason: string | null
   verified_at: string | null
 }
 
-// ================================================================
-// 认证模块 — 登录 / 刷新 / 退出
-// ================================================================
+interface AuthTokenResponse {
+  access_token: string
+  refresh_token: string
+  expires_in: number
+}
 
-/** POST /api/auth/login — 微信 code 登录，返回 token */
-export async function wxLogin(code: string): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
-  if (USE_MOCK) return { access_token: 'mock_token_' + Date.now() }
-  const res = await post<{ access_token: string; refresh_token?: string; expires_in?: number }>('/api/auth/login', { code })
+interface LoginResponse extends AuthTokenResponse {
+  user: {
+    id: number
+    openid: string
+    nickname: string | null
+    phone: string | null
+    created_at: string
+  }
+}
+
+function persistAuthResponse(response: AuthTokenResponse): void {
+  setAuthSession({
+    accessToken: response.access_token,
+    refreshToken: response.refresh_token,
+    expiresAt: Date.now() + response.expires_in * 1000,
+  })
+}
+
+export async function wxLogin(code: string): Promise<LoginResponse> {
+  if (USE_MOCK) throw new Error('Mock authentication is disabled')
+  const res = await post<LoginResponse>('/api/auth/login', { code }, false, false)
+  persistAuthResponse(res.data)
   return res.data
 }
 
-/** POST /api/auth/refresh — 刷新 token，需传 refresh_token */
-export async function refreshToken(refresh_token: string): Promise<{ access_token: string; refresh_token: string }> {
-  if (USE_MOCK) return { access_token: 'mock_refreshed_' + Date.now(), refresh_token: 'mock_refresh_' + Date.now() }
-  const res = await post<{ access_token: string; refresh_token: string }>('/api/auth/refresh', { refresh_token })
+export async function refreshToken(refresh_token: string): Promise<AuthTokenResponse> {
+  if (USE_MOCK) throw new Error('Mock authentication is disabled')
+  const res = await post<AuthTokenResponse>('/api/auth/refresh', { refresh_token }, false, false)
+  persistAuthResponse(res.data)
   return res.data
 }
 
-/** POST /api/auth/logout — 退出登录，需传 refresh_token */
 export async function logout(refresh_token?: string): Promise<void> {
   if (USE_MOCK) return
   await post('/api/auth/logout', refresh_token ? { refresh_token } : undefined)
 }
 
-// ================================================================
-// 用户扩展 — 注销 / 手机号解密 / 实名认证 / 解绑
-// ================================================================
-
-/** DELETE /api/user/account — 注销账号 */
 export async function deleteAccount(): Promise<void> {
   if (USE_MOCK) return
   await del('/api/user/account')
 }
 
-/** POST /api/user/phone/decrypt — 解密微信手机号 */
 export async function decryptPhone(data: { encrypted_data: string; iv: string }): Promise<{ phone: string }> {
   if (USE_MOCK) return { phone: '138****8888' }
   const res = await post<{ phone: string }>('/api/user/phone/decrypt', data as unknown as Record<string, unknown>)
   return res.data
 }
 
-/** POST /api/user/identity — 提交实名认证 */
 export async function submitIdentity(data: {
   user_type: 'student' | 'enterprise'
   real_name: string
   id_card_number: string
   id_card_front_oss?: string | null
   id_card_back_oss?: string | null
   student_card_oss?: string | null
 }): Promise<IdentityInfo> {
   if (USE_MOCK) {
     return {
@@ -84,34 +87,32 @@ export async function submitIdentity(data: {
       student_card_oss: data.student_card_oss || null,
       status: 'verified',
       reject_reason: null,
       verified_at: new Date().toISOString(),
     }
   }
   const res = await post<IdentityInfo>('/api/user/identity', data as unknown as Record<string, unknown>)
   return res.data
 }
 
-/** GET /api/user/identity — 查询实名认证状态 */
 export async function getIdentityStatus(): Promise<IdentityInfo> {
   if (USE_MOCK) {
     return {
       user_type: 'student',
       real_name: '王小明',
       id_card_number: '330106********1234',
       id_card_front_oss: null,
       id_card_back_oss: null,
       student_card_oss: null,
       status: 'verified',
       reject_reason: null,
       verified_at: '2026-06-01T00:00:00Z',
     }
   }
   const res = await get<IdentityInfo>('/api/user/identity')
   return res.data
 }
 
-/** POST /api/user/unbind — 解绑手机号/微信 */
 export async function unbindAccount(type: 'phone' | 'wechat'): Promise<void> {
   if (USE_MOCK) return
   await post('/api/user/unbind', { type })
 }
diff --git a/src/utils/request.ts b/src/utils/request.ts
index 7215d9b..3897b32 100644
--- a/src/utils/request.ts
+++ b/src/utils/request.ts
@@ -1,58 +1,34 @@
-/**
- * HTTP 请求封装 — Taro.request 统一层
- *
- * 约定：
- * - 后端统一返回 { code: 0, data: T, message: string }
- * - code === 0 表示成功，其他为业务错误
- * - 401 表示 token 过期 / 未登录
- * - Authorization header 自动注入
- */
-
 import Taro from '@tarojs/taro'
-
-// ---- 配置 ----
+import { clearAuthSession, getAccessToken, getAuthSession, setAuthToken } from '@/utils/storage'
 
 const BASE_URL = (process.env.TARO_APP_API_BASE || '').replace(/\/+$/, '')
 
-const isDev = process.env.NODE_ENV === 'development'
-
-/**
- * 将后端返回的相对路径（如 /api/media/xxx.webp）转为完整 URL。
- * 如果已经是完整 URL（http(s):// 开头）则原样返回。
- * 如果 BASE_URL 未配置则返回原值。
- */
 export function resolveUrl(path: string | null | undefined): string {
   if (!path) return ''
   if (/^https?:\/\//i.test(path)) return path
   if (!BASE_URL) return path
   return `${BASE_URL}${path}`
 }
 
-const TOKEN_KEY = 'auth_token'
-
-// ---- Token 管理 ----
-
 export function getToken(): string {
-  return Taro.getStorageSync(TOKEN_KEY) || ''
+  return getAccessToken()
 }
 
 export function setToken(token: string): void {
-  Taro.setStorageSync(TOKEN_KEY, token)
+  setAuthToken(token)
 }
 
 export function removeToken(): void {
-  Taro.removeStorageSync(TOKEN_KEY)
+  clearAuthSession()
 }
 
-// ---- 类型 ----
-
 export interface ApiResponse<T = unknown> {
   code: number
   data: T
   message: string
 }
 
 export class ApiError extends Error {
   code: number
   statusCode: number
 
@@ -62,124 +38,119 @@ export class ApiError extends Error {
     this.code = code
     this.statusCode = statusCode
   }
 }
 
 export interface RequestOptions {
   url: string
   method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
   data?: Record<string, unknown>
   header?: Record<string, string>
-  /** 是否显示 loading，默认 true */
   showLoading?: boolean
+  authRecovery?: boolean
 }
 
-// ---- 核心请求函数 ----
-
-export async function request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>> {
-  const { url, method = 'GET', data, header = {}, showLoading = true } = options
+let refreshPromise: Promise<void> | null = null
+let loginRedirectStarted = false
 
-  const token = getToken()
-  const headers: Record<string, string> = {
-    'Content-Type': 'application/json',
-    ...header,
-  }
-  if (token) {
-    headers['Authorization'] = `Bearer ${token}`
-  } else {
-    if (isDev) {
-      console.warn(`[Request] ${method} ${url} | NO TOKEN — request may fail with 401`)
-    }
-  }
-
-  if (showLoading) {
-    Taro.showLoading({ title: '加载中...', mask: true })
-  }
-
-  try {
-    const res = await Taro.request({
-      url: `${BASE_URL}${url}`,
-      method,
-      data,
-      header: headers,
-      timeout: 15000,
-    })
+function isUnauthorized<T>(statusCode: number, result: ApiResponse<T>): boolean {
+  return statusCode === 401 || (result.code >= 40100 && result.code <= 40199)
+}
 
-    if (showLoading) {
-      Taro.hideLoading()
-    }
+function showLoginPath(message: string): void {
+  if (loginRedirectStarted) return
+  loginRedirectStarted = true
+  Taro.showModal({
+    title: '提示',
+    content: message || '登录已过期，请重新登录',
+    showCancel: false,
+    success: () => Taro.reLaunch({ url: '/pages/auth/index' }),
+  })
+}
 
-    const result = res.data as ApiResponse<T>
-
-    // HTTP 层错误（如 502 Bad Gateway）：
-    // 如果后端仍返回了带 code 的业务 JSON，优先走下面的业务错误处理；
-    // 否则按网络异常抛错。
-    const hasBusinessCode = result && typeof result.code === 'number'
-    if ((res.statusCode < 200 || res.statusCode >= 300) && !hasBusinessCode) {
-      // 保留 HTTP 状态码，调用方可以区分“接口未部署”和业务资源 404。
-      throw new ApiError(
-        result?.message || `服务器异常 (${res.statusCode})`,
-        res.statusCode,
-        res.statusCode,
-      )
-    }
+function failAuthentication(message: string): never {
+  clearAuthSession()
+  showLoginPath(message)
+  throw new Error('UNAUTHORIZED')
+}
 
-    if (result && result.code === 0) {
-      return result
-    }
+async function refreshAuthSession(): Promise<void> {
+  if (refreshPromise) return refreshPromise
+  const session = getAuthSession()
+  if (!session?.refreshToken) failAuthentication('登录已过期，请重新登录')
 
-    // 业务错误：按错误码分流
-    // 后端认证错误码: 40100-40199，HTTP 401
-    if ((result && result.code === 40100) || res.statusCode === 401) {
-      if (isDev) {
-        console.warn('[Request] 401 detected — message:', result.message, 'code:', result.code)
-      }
-      removeToken()
-      const msg = result.message || '登录已过期，请重新登录'
-      Taro.showModal({
-        title: '提示',
-        content: msg,
-        showCancel: false,
-        success: () => Taro.reLaunch({ url: '/pages/auth/index' }),
-      })
-      throw new Error('UNAUTHORIZED')
-    }
+  refreshPromise = import('@/services/authService')
+    .then(({ refreshToken }) => refreshToken(session.refreshToken))
+    .then(() => {
+      loginRedirectStarted = false
+    })
+    .catch(() => failAuthentication('登录已过期，请重新登录'))
+    .finally(() => {
+      refreshPromise = null
+    })
+  return refreshPromise
+}
 
-    // 其他业务错误统一抛错，避免调用方读到空 data
-    throw new ApiError(
-      result?.message || '请求失败',
-      result?.code ?? -1,
-      res.statusCode,
-    )
-  } catch (err: unknown) {
-    if (showLoading) {
-      Taro.hideLoading()
+async function execute<T>(options: RequestOptions, hasReplayed: boolean): Promise<ApiResponse<T>> {
+  const { url, method = 'GET', data, header = {}, authRecovery = true } = options
+  const token = getToken()
+  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...header }
+  if (token) headers.Authorization = `Bearer ${token}`
+
+  const res = await Taro.request({
+    url: `${BASE_URL}${url}`,
+    method,
+    data,
+    header: headers,
+    timeout: 15000,
+  })
+  const result = res.data as ApiResponse<T>
+  const hasBusinessCode = result && typeof result.code === 'number'
+
+  if (isUnauthorized(res.statusCode, result)) {
+    if (!authRecovery) {
+      throw new ApiError(result?.message || 'Unauthorized', result?.code ?? 401, 401)
     }
-
-    // 业务错误已由后端返回明确信息，交给上层调用方处理/提示，避免重复 toast
-    if (err instanceof ApiError) {
-      throw err
+    if (!hasReplayed && getAuthSession()?.refreshToken) {
+      await refreshAuthSession()
+      return execute<T>(options, true)
     }
+    return failAuthentication(result?.message || '登录已过期，请重新登录')
+  }
 
-    const msg = err instanceof Error ? err.message : '网络异常，请稍后重试'
-    Taro.showToast({ title: msg, icon: 'none' })
-    throw err
+  if ((res.statusCode < 200 || res.statusCode >= 300) && !hasBusinessCode) {
+    throw new ApiError(result?.message || `服务器异常 (${res.statusCode})`, res.statusCode, res.statusCode)
   }
+  if (result && result.code === 0) return result
+  throw new ApiError(result?.message || '请求失败', result?.code ?? -1, res.statusCode)
 }
 
-// ---- 便捷方法 ----
+export async function request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>> {
+  const showLoading = options.showLoading !== false
+  if (showLoading) Taro.showLoading({ title: '加载中...', mask: true })
+  try {
+    return await execute<T>(options, false)
+  } catch (error: unknown) {
+    if (error instanceof ApiError || (error instanceof Error && error.message === 'UNAUTHORIZED')) throw error
+    const message = error instanceof Error ? error.message : '网络异常，请稍后重试'
+    Taro.showToast({ title: message, icon: 'none' })
+    throw error
+  } finally {
+    if (showLoading) Taro.hideLoading()
+  }
+}
 
-export function get<T = unknown>(url: string, data?: Record<string, unknown>, showLoading?: boolean) {
-  return request<T>({ url, method: 'GET', data, showLoading })
+export function get<T = unknown>(url: string, data?: Record<string, unknown>, showLoading?: boolean, authRecovery?: boolean) {
+  return request<T>({ url, method: 'GET', data, showLoading, authRecovery })
 }
 
-export function post<T = unknown>(url: string, data?: Record<string, unknown>, showLoading?: boolean) {
-  return request<T>({ url, method: 'POST', data, showLoading })
+export function post<T = unknown>(url: string, data?: Record<string, unknown>, showLoading?: boolean, authRecovery?: boolean) {
+  return request<T>({ url, method: 'POST', data, showLoading, authRecovery })
 }
 
-export function put<T = unknown>(url: string, data?: Record<string, unknown>, showLoading?: boolean) {
-  return request<T>({ url, method: 'PUT', data, showLoading })
+export function put<T = unknown>(url: string, data?: Record<string, unknown>, showLoading?: boolean, authRecovery?: boolean) {
+  return request<T>({ url, method: 'PUT', data, showLoading, authRecovery })
 }
 
-export function del<T = unknown>(url: string, data?: Record<string, unknown>, showLoading?: boolean) {
-  return request<T>({ url, method: 'DELETE', data, showLoading })
+export function del<T = unknown>(url: string, data?: Record<string, unknown>, showLoading?: boolean, authRecovery?: boolean) {
+  return request<T>({ url, method: 'DELETE', data, showLoading, authRecovery })
 }
diff --git a/src/utils/storage.ts b/src/utils/storage.ts
index 201860e..8069efd 100644
--- a/src/utils/storage.ts
+++ b/src/utils/storage.ts
@@ -1,16 +1,88 @@
 import Taro from '@tarojs/taro'
-import { getToken } from '@/utils/request'
 
-const TOKEN_KEY = 'auth_token' // 与 request.ts 统一
+const AUTH_SESSION_KEY = 'auth_session'
+const LEGACY_TOKEN_KEY = 'auth_token'
+
+export interface AuthSession {
+  accessToken: string
+  refreshToken: string
+  expiresAt: number
+}
+
+export interface AuthState {
+  initialized: boolean
+  isLoggedIn: boolean
+}
+
+type AuthListener = () => void
+
+let authState: AuthState = { initialized: false, isLoggedIn: false }
+const authListeners = new Set<AuthListener>()
+
+function isAuthSession(value: unknown): value is AuthSession {
+  if (!value || typeof value !== 'object') return false
+  const candidate = value as Record<string, unknown>
+  return typeof candidate.accessToken === 'string'
+    && candidate.accessToken.length > 0
+    && typeof candidate.refreshToken === 'string'
+    && candidate.refreshToken.length > 0
+    && typeof candidate.expiresAt === 'number'
+    && Number.isFinite(candidate.expiresAt)
+}
+
+function updateAuthState(next: AuthState): void {
+  if (next.initialized === authState.initialized && next.isLoggedIn === authState.isLoggedIn) return
+  authState = next
+  authListeners.forEach((listener) => listener())
+}
+
+export function getAuthSession(): AuthSession | null {
+  const value: unknown = Taro.getStorageSync(AUTH_SESSION_KEY)
+  return isAuthSession(value) ? value : null
+}
+
+export function setAuthSession(session: AuthSession): void {
+  Taro.setStorageSync(AUTH_SESSION_KEY, session)
+  Taro.setStorageSync(LEGACY_TOKEN_KEY, session.accessToken)
+  updateAuthState({ ...authState, isLoggedIn: session.expiresAt > Date.now() })
+}
+
+export function clearAuthSession(): void {
+  Taro.removeStorageSync(AUTH_SESSION_KEY)
+  Taro.removeStorageSync(LEGACY_TOKEN_KEY)
+  updateAuthState({ ...authState, isLoggedIn: false })
+}
+
+export function getAccessToken(): string {
+  return getAuthSession()?.accessToken || Taro.getStorageSync(LEGACY_TOKEN_KEY) || ''
+}
 
 export function isLoggedIn(): boolean {
-  return !!getToken()
+  const session = getAuthSession()
+  return !!session && session.expiresAt > Date.now()
 }
 
 export function setAuthToken(token?: string): void {
-  Taro.setStorageSync(TOKEN_KEY, token || 'mock_token')
+  if (token) {
+    Taro.setStorageSync(LEGACY_TOKEN_KEY, token)
+  } else {
+    Taro.removeStorageSync(LEGACY_TOKEN_KEY)
+  }
 }
 
 export function removeAuthToken(): void {
-  Taro.removeStorageSync(TOKEN_KEY)
+  clearAuthSession()
+}
+
+export function getAuthState(): AuthState {
+  return authState
+}
+
+export function setAuthInitialized(): void {
+  updateAuthState({ initialized: true, isLoggedIn: isLoggedIn() })
+}
+
+export function subscribeAuth(listener: AuthListener): () => void {
+  authListeners.add(listener)
+  return () => authListeners.delete(listener)
 }

