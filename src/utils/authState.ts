import Taro from '@tarojs/taro'
import { clearQuizCache } from './quizRuntime.ts'

let sessionId = 0
export const getAuthSessionId = () => sessionId
const listeners = new Set<() => void>()
export function subscribeAuth(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener) } }
function notifyAuthChange(): void { for (const listener of listeners) listener() }

const TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'auth_refresh_token'

// ---- Token 管理 ----

export function getToken(): string {
  return Taro.getStorageSync(TOKEN_KEY) || ''
}

/** 仅用于提前识别本地过期；身份真实性始终由服务端校验。 */
export function accessTokenExpired(): boolean {
  const payload = getToken().split('.')[1]
  if (!payload) return false
  try {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    let bits = 0, count = 0, decoded = ''
    for (const char of payload.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')) {
      const value = chars.indexOf(char)
      if (value < 0) return false
      bits = (bits << 6) | value; count += 6
      if (count >= 8) { count -= 8; decoded += String.fromCharCode((bits >> count) & 255) }
    }
    const expiry = JSON.parse(decoded).exp
    return typeof expiry === 'number' && Number.isFinite(expiry) && expiry * 1000 <= Date.now()
  } catch { return false }
}

export function getRefreshToken(): string {
  return Taro.getStorageSync(REFRESH_TOKEN_KEY) || ''
}

export function setAuthTokens(accessToken: string, refreshToken: string, newSession = true): void {
  if (!accessToken || !refreshToken) throw new Error('登录响应缺少令牌')
  Taro.setStorageSync(TOKEN_KEY, accessToken)
  Taro.setStorageSync(REFRESH_TOKEN_KEY, refreshToken)
  if (newSession) sessionId += 1
  notifyAuthChange()
}

export function clearAuthTokens(): void {
  sessionId += 1
  Taro.removeStorageSync(TOKEN_KEY)
  Taro.removeStorageSync(REFRESH_TOKEN_KEY)
  clearQuizCache()
  notifyAuthChange()
}

