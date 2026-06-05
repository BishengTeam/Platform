/**
 * 认证服务 — 登录 / 刷新 / 退出 / 实名认证 / 注销 / 解绑
 */

import { get, post, del } from '@/utils/request'

/** 全局开关：true=mock，false=真实API */
const USE_MOCK = false

// ================================================================
// 认证模块 — 登录 / 刷新 / 退出
// ================================================================

/** POST /api/auth/login — 微信 code 登录，返回 token */
export async function wxLogin(code: string): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  if (USE_MOCK) return { access_token: 'mock_token_' + Date.now() }
  const res = await post<{ access_token: string; refresh_token?: string; expires_in?: number }>('/api/auth/login', { code })
  return res.data
}

/** POST /api/auth/refresh — 刷新 token */
export async function refreshToken(): Promise<{ token: string }> {
  if (USE_MOCK) return { token: 'mock_refreshed_' + Date.now() }
  const res = await post<{ token: string }>('/api/auth/refresh')
  return res.data
}

/** POST /api/auth/logout — 退出登录 */
export async function logout(): Promise<void> {
  if (USE_MOCK) return
  await post('/api/auth/logout')
}

// ================================================================
// 用户扩展 — 注销 / 手机号解密 / 实名认证 / 解绑
// ================================================================

/** DELETE /api/user/account — 注销账号 */
export async function deleteAccount(): Promise<void> {
  if (USE_MOCK) return
  await del('/api/user/account')
}

/** POST /api/user/phone/decrypt — 解密微信手机号 */
export async function decryptPhone(data: { encrypted_data: string; iv: string }): Promise<{ phone: string }> {
  if (USE_MOCK) return { phone: '138****8888' }
  const res = await post<{ phone: string }>('/api/user/phone/decrypt', data as unknown as Record<string, unknown>)
  return res.data
}

/** POST /api/user/identity — 提交实名认证 */
export async function submitIdentity(data: { real_name: string; id_card: string }): Promise<void> {
  if (USE_MOCK) return
  await post('/api/user/identity', data as unknown as Record<string, unknown>)
}

/** GET /api/user/identity — 查询实名认证状态 */
export async function getIdentityStatus(): Promise<{ status: string; real_name?: string; id_card?: string }> {
  if (USE_MOCK) return { status: 'verified', real_name: '王小明', id_card: '330106****1234' }
  const res = await get<{ status: string; real_name?: string; id_card?: string }>('/api/user/identity')
  return res.data
}

/** POST /api/user/unbind — 解绑手机号/微信 */
export async function unbindAccount(type: 'phone' | 'wechat'): Promise<void> {
  if (USE_MOCK) return
  await post('/api/user/unbind', { type })
}
