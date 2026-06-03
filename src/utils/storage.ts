import Taro from '@tarojs/taro'
import { getToken } from '@/utils/request'

const TOKEN_KEY = 'auth_token' // 与 request.ts 统一

export function isLoggedIn(): boolean {
  return !!getToken()
}

export function setAuthToken(token?: string): void {
  Taro.setStorageSync(TOKEN_KEY, token || 'mock_token')
}

export function removeAuthToken(): void {
  Taro.removeStorageSync(TOKEN_KEY)
}
