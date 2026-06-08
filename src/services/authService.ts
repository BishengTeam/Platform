/**
 * 认证服务 — 登录 / 刷新 / 退出 / 实名认证 / 注销 / 解绑
 */

import { get, post, del } from '@/utils/request'

/** 全局开关：true=mock，false=真实API */
const USE_MOCK = false

// ================================================================
// 类型
// ================================================================

/** 实名认证信息（对齐后端 UserIdentityResponse） */
export interface IdentityInfo {
  user_type: 'student' | 'enterprise'
  real_name: string
  id_card_number: string
  id_card_front_oss: string | null
  id_card_back_oss: string | null
  student_card_oss: string | null
  status: 'pending' | 'verified' | 'rejected'
  verified_at: string | null
  created_at: string
}

// ================================================================
// 认证模块 — 登录 / 刷新 / 退出
// ================================================================

/** POST /api/auth/login — 微信 code 登录，返回 token */
export async function wxLogin(code: string): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  if (USE_MOCK) return { access_token: 'mock_token_' + Date.now() }
  const res = await post<{ access_token: string; refresh_token?: string; expires_in?: number }>('/api/auth/login', { code })
  return res.data
}

/** POST /api/auth/refresh — 刷新 token，需传 refresh_token */
export async function refreshToken(refresh_token: string): Promise<{ access_token: string; refresh_token: string }> {
  if (USE_MOCK) return { access_token: 'mock_refreshed_' + Date.now(), refresh_token: 'mock_refresh_' + Date.now() }
  const res = await post<{ access_token: string; refresh_token: string }>('/api/auth/refresh', { refresh_token })
  return res.data
}

/** POST /api/auth/logout — 退出登录，需传 refresh_token */
export async function logout(refresh_token?: string): Promise<void> {
  if (USE_MOCK) return
  await post('/api/auth/logout', refresh_token ? { refresh_token } : undefined)
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
export async function submitIdentity(data: {
  user_type: 'student' | 'enterprise'
  real_name: string
  id_card_number: string
  id_card_front_oss?: string
  id_card_back_oss?: string
  student_card_oss?: string
}): Promise<IdentityInfo> {
  if (USE_MOCK) {
    return {
      user_type: data.user_type,
      real_name: data.real_name,
      id_card_number: data.id_card_number.slice(0, 4) + '**********' + data.id_card_number.slice(-4),
      id_card_front_oss: data.id_card_front_oss || null,
      id_card_back_oss: data.id_card_back_oss || null,
      student_card_oss: data.student_card_oss || null,
      status: 'verified',
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
  }
  const res = await post<IdentityInfo>('/api/user/identity', data as unknown as Record<string, unknown>)
  return res.data
}

/** GET /api/user/identity — 查询实名认证状态 */
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
      verified_at: '2026-06-01T00:00:00Z',
      created_at: '2026-05-01T00:00:00Z',
    }
  }
  const res = await get<IdentityInfo>('/api/user/identity')
  return res.data
}

/** POST /api/user/unbind — 解绑手机号/微信 */
export async function unbindAccount(type: 'phone' | 'wechat'): Promise<void> {
  if (USE_MOCK) return
  await post('/api/user/unbind', { type })
}
