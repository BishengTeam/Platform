/**
 * HTTP 请求封装 — Taro.request 统一层
 *
 * 约定：
 * - 后端统一返回 { code: 0, data: T, message: string }
 * - code === 0 表示成功，其他为业务错误
 * - 401 表示 token 过期 / 未登录
 * - Authorization header 自动注入
 */

import Taro from '@tarojs/taro'
import { clearQuizCache } from './quizRuntime.ts'

// ---- 配置 ----

const BASE_URL = (process.env.TARO_APP_API_BASE || '').replace(/\/+$/, '')

const isDev = process.env.NODE_ENV === 'development'

/**
 * 将后端返回的相对路径（如 /api/media/xxx.webp）转为完整 URL。
 * 如果已经是完整 URL（http(s):// 开头）则原样返回。
 * 如果 BASE_URL 未配置则返回原值。
 */
export function resolveUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  if (!BASE_URL) return path
  return `${BASE_URL}${path}`
}

const TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'auth_refresh_token'

// ---- Token 管理 ----

export function getToken(): string {
  return Taro.getStorageSync(TOKEN_KEY) || ''
}

export function getRefreshToken(): string {
  return Taro.getStorageSync(REFRESH_TOKEN_KEY) || ''
}

export function setAuthTokens(accessToken: string, refreshToken: string): void {
  if (!accessToken || !refreshToken) throw new Error('登录响应缺少令牌')
  Taro.setStorageSync(TOKEN_KEY, accessToken)
  Taro.setStorageSync(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearAuthTokens(): void {
  Taro.removeStorageSync(TOKEN_KEY)
  Taro.removeStorageSync(REFRESH_TOKEN_KEY)
  clearQuizCache()
}

// ---- 类型 ----

export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message: string
}

export class ApiError extends Error {
  code: number
  statusCode: number

  constructor(message: string, code: number, statusCode = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
  }
}

export interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, unknown>
  header?: Record<string, string>
  /** 是否显示 loading，默认 true */
  showLoading?: boolean
}

// ---- 核心请求函数 ----

let refreshPromise: Promise<boolean> | null = null
let reloginPromptVisible = false

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const response = await Taro.request({
      url: `${BASE_URL}/api/auth/refresh`,
      method: 'POST',
      data: { refresh_token: refreshToken },
      header: { 'Content-Type': 'application/json' },
      timeout: 15000,
    })
    const envelope = response.data as ApiResponse<unknown>
    if (response.statusCode < 200 || response.statusCode >= 300 || envelope?.code !== 0) return false
    const data = envelope.data
    if (typeof data !== 'object' || data === null) return false
    const values = data as Record<string, unknown>
    if (typeof values.access_token !== 'string' || typeof values.refresh_token !== 'string') return false
    setAuthTokens(values.access_token, values.refresh_token)
    return true
  } catch {
    return false
  }
}

function runSingleFlightRefresh(): Promise<boolean> {
  refreshPromise ||= refreshAccessToken().finally(() => { refreshPromise = null })
  return refreshPromise
}

/**
 * Restore a locally persisted login before an authentication guard decides
 * whether to redirect. App startup and every mounted guard share the same
 * refresh request, which is important because refresh tokens are rotated.
 */
export async function restoreAuthSession(): Promise<boolean> {
  if (getToken()) return true
  if (!getRefreshToken()) return false
  const restored = await runSingleFlightRefresh()
  if (!restored) clearAuthTokens()
  return restored
}

function requireRelogin(message: string): void {
  clearAuthTokens()
  if (reloginPromptVisible) return
  reloginPromptVisible = true
  Taro.showModal({
    title: '提示',
    content: message,
    showCancel: false,
    success: () => {
      reloginPromptVisible = false
      Taro.reLaunch({ url: '/pages/auth/index' })
    },
    fail: () => { reloginPromptVisible = false },
  })
}

export async function request<T = unknown>(options: RequestOptions, allowRefresh = true): Promise<ApiResponse<T>> {
  const { url, method = 'GET', data, header = {}, showLoading = true } = options

  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...header,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else {
    if (isDev) {
      console.warn(`[Request] ${method} ${url} | NO TOKEN — request may fail with 401`)
    }
  }

  if (showLoading) {
    Taro.showLoading({ title: '加载中...', mask: true })
  }

  try {
    const res = await Taro.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: headers,
      timeout: 15000,
    })

    if (showLoading) {
      Taro.hideLoading()
    }

    const result = res.data as ApiResponse<T>

    // HTTP 层错误（如 502 Bad Gateway）：
    // 如果后端仍返回了带 code 的业务 JSON，优先走下面的业务错误处理；
    // 否则按网络异常抛错。
    const hasBusinessCode = result && typeof result.code === 'number'
    if ((res.statusCode < 200 || res.statusCode >= 300) && !hasBusinessCode) {
      // 保留 HTTP 状态码，调用方可以区分“接口未部署”和业务资源 404。
      throw new ApiError(
        result?.message || '服务器开小差了，请稍后重试',
        res.statusCode,
        res.statusCode,
      )
    }

    if (result && result.code === 0) {
      return result
    }

    // 业务错误：按错误码分流
    // 后端认证错误码: 40100-40199，HTTP 401
    if ((result && result.code === 40100) || res.statusCode === 401) {
      if (isDev) {
        console.warn('[Request] 401 detected — message:', result.message, 'code:', result.code)
      }
      const msg = result.message || '登录已过期，请重新登录'
      const isAuthEndpoint = url === '/api/auth/login' || url === '/api/auth/refresh'
      if (allowRefresh && !isAuthEndpoint && getRefreshToken()) {
        // A startup restore may have rotated the token while this request was
        // in flight. In that case retry with the new access token directly;
        // otherwise join/start the one permitted refresh request.
        const tokenWasRefreshed = Boolean(getToken()) && getToken() !== token
        if (tokenWasRefreshed || await runSingleFlightRefresh()) {
          return request<T>({ ...options, showLoading: false }, false)
        }
      }
      requireRelogin(msg)
      throw new Error('UNAUTHORIZED')
    }

    // 其他业务错误统一抛错，避免调用方读到空 data
    throw new ApiError(
      result?.message || '请求失败',
      result?.code ?? -1,
      res.statusCode,
    )
  } catch (err: unknown) {
    if (showLoading) {
      Taro.hideLoading()
    }

    // 业务错误已由后端返回明确信息，交给上层调用方处理/提示，避免重复 toast
    if (err instanceof ApiError) {
      throw err
    }

    // The re-login modal/guard owns authentication feedback. Showing the
    // sentinel as a toast would produce a second, user-visible error.
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      throw err
    }

    const rawMsg = err instanceof Error ? err.message : ''
    const isNetworkError = /fail|timeout|abort|ssl|dns/i.test(rawMsg)
    const msg = isNetworkError ? '网络连接失败，请检查网络后重试' : (rawMsg || '操作失败，请稍后重试')
    Taro.showToast({ title: msg, icon: 'none' })
    throw err
  }
}

/** Test-only reset for module-level single-flight/prompt state. */
export function resetRequestStateForTest(): void {
  refreshPromise = null
  reloginPromptVisible = false
}

// ---- 便捷方法 ----

export function get<T = unknown>(url: string, data?: Record<string, unknown>, showLoading?: boolean) {
  return request<T>({ url, method: 'GET', data, showLoading })
}

export function post<T = unknown>(url: string, data?: Record<string, unknown>, showLoading?: boolean) {
  return request<T>({ url, method: 'POST', data, showLoading })
}

export function put<T = unknown>(url: string, data?: Record<string, unknown>, showLoading?: boolean) {
  return request<T>({ url, method: 'PUT', data, showLoading })
}

export function del<T = unknown>(url: string, data?: Record<string, unknown>, showLoading?: boolean) {
  return request<T>({ url, method: 'DELETE', data, showLoading })
}
