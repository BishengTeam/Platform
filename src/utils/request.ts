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

import { getToken, getRefreshToken, setAuthTokens, clearAuthTokens, getAuthSessionId, accessTokenExpired } from './authState.ts'
export { getToken, getRefreshToken, setAuthTokens, clearAuthTokens } from './authState.ts'

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
  /** Background progress refreshes report failures inline instead of interrupting with a toast. */
  showError?: boolean
  /** public不带令牌；optional支持匿名回退；required在本地检查登录。 */
  auth?: 'public' | 'optional' | 'required'
}

// ---- 核心请求函数 ----

let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const session = getAuthSessionId()
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
    if (getAuthSessionId() !== session || getRefreshToken() !== refreshToken) return false
    setAuthTokens(values.access_token, values.refresh_token, false)
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
  if (getToken() && !accessTokenExpired()) return true
  if (!getRefreshToken()) { if (getToken()) clearAuthTokens(); return false }
  const session = getAuthSessionId()
  const restored = await runSingleFlightRefresh()
  if (!restored && getAuthSessionId() === session) clearAuthTokens()
  return restored || Boolean(getToken())
}

export async function request<T = unknown>(options: RequestOptions, allowRefresh = true): Promise<ApiResponse<T>> {
  const { url, method = 'GET', data, header = {}, showLoading = true, showError = true, auth = 'required' } = options

  if (auth === 'required' && (!getToken() || accessTokenExpired()) && !(await restoreAuthSession())) {
    throw new ApiError('请先登录后继续操作', 40100, 401)
  }
  const token = auth === 'public' ? '' : getToken()
  const session = getAuthSessionId()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...header,
  }
  if (auth === 'public') {
    for (const key of Object.keys(headers)) if (key.toLowerCase() === 'authorization') delete headers[key]
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

    const hasBusinessCode = result && typeof result.code === 'number'
    if (res.statusCode === 401 || result?.code === 40100) {
      const isAuthEndpoint = url === '/api/auth/login' || url === '/api/auth/refresh'
      if (auth !== 'public' && !isAuthEndpoint) {
        if (getAuthSessionId() !== session) throw new ApiError('登录状态已变化，请重新操作', 40100, 401)
        if (allowRefresh && getRefreshToken()) {
          const tokenWasRefreshed = Boolean(getToken()) && getToken() !== token
          if (tokenWasRefreshed || await runSingleFlightRefresh()) {
            return request<T>({ ...options, showLoading: false }, false)
          }
        }
        if (getAuthSessionId() === session && (getToken() || getRefreshToken())) clearAuthTokens()
        if (auth === 'optional') return request<T>({ ...options, auth: 'public', showLoading: false }, false)
      }
      throw new ApiError(result?.message || '登录已过期，请重新登录', 40100, 401)
    }
    if ((res.statusCode < 200 || res.statusCode >= 300) && !hasBusinessCode) {
      throw new ApiError(result?.message || '服务器开小差了，请稍后重试', res.statusCode, res.statusCode)
    }
    if (result && result.code === 0) return result

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
    if (showError) Taro.showToast({ title: msg, icon: 'none' })
    throw err
  }
}

/** Test-only reset for module-level single-flight state. */
export function resetRequestStateForTest(): void {
  refreshPromise = null
}

// ---- 便捷方法 ----

export function get<T = unknown>(url: string, data?: Record<string, unknown>, showLoading?: boolean, showError?: boolean) {
  return request<T>({ url, method: 'GET', data, showLoading, showError })
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

/** 公开读取不发送令牌，不刷新会话，也不触发登录导航。 */
export function getPublic<T = unknown>(url: string, data?: Record<string, unknown>, showLoading?: boolean) {
  return request<T>({ url, method: 'GET', data, showLoading, auth: 'public' })
}
export function getOptional<T = unknown>(url: string, data?: Record<string, unknown>, showLoading?: boolean) {
  return request<T>({ url, method: 'GET', data, showLoading, auth: 'optional' })
}
