import Taro from '@tarojs/taro'

const AUTH_KEY = 'h3cne_logged_in'

export function isLoggedIn(): boolean {
  return !!Taro.getStorageSync(AUTH_KEY)
}

export function setAuthToken(): void {
  Taro.setStorageSync(AUTH_KEY, 'true')
}

export function removeAuthToken(): void {
  Taro.removeStorageSync(AUTH_KEY)
}
