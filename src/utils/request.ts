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

const TOKEN_KEY = 'auth_token'

// ---- Token 管理 ----

export function getToken(): string {
  return Taro.getStorageSync(TOKEN_KEY) || ''
}

export function setToken(token: string): void {
  Taro.setStorageSync(TOKEN_KEY, token)
}

export function removeToken(): void {
  Taro.removeStorageSync(TOKEN_KEY)
}

// ---- 类型 ----

export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message: string
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

export async function request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>> {
  const { url, method = 'GET', data, header = {}, showLoading = true } = options

  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...header,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
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

    if (result.code === 0) {
      return result
    }

    // 业务错误：先 toast，再按错误码分流
    if (result.code === 401) {
      removeToken()
      Taro.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
      // 跳转登录页
      Taro.reLaunch({ url: '/pages/auth/index' })
    } else {
      Taro.showToast({ title: result.message || '请求失败', icon: 'none' })
    }

    return result
  } catch (err: unknown) {
    if (showLoading) {
      Taro.hideLoading()
    }

    const msg = err instanceof Error ? err.message : '网络异常，请稍后重试'
    Taro.showToast({ title: msg, icon: 'none' })
    throw err
  }
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