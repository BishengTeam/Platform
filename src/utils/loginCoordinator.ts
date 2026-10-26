import Taro from '@tarojs/taro'
import { getToken } from './authState.ts'
import { getPublic, restoreAuthSession } from './request.ts'
import { isLoginTab, isPublicPage, loginPurpose, safeLoginTarget } from './loginTargets.ts'

const INTENT_KEY = 'login_intent_v1'
const HOME = '/pages/index/index'
let opening = false
export interface LoginIntent { target: string; purpose: string; returnUrl: string; expiresAt: number; parked: boolean }

export function currentLoginTarget(): string | null {
  const pages = Taro.getCurrentPages()
  const page = pages[pages.length - 1]
  if (!page?.route) return null
  const params = Object.entries(page.options || {}).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .filter(pair => safeLoginTarget(`/${page.route}?${pair}`, true)).join('&')
  return safeLoginTarget(`/${page.route}${params ? '?' + params : ''}`)
}
export function pendingLogin(): LoginIntent | null {
  const value = Taro.getStorageSync(INTENT_KEY) as LoginIntent | undefined
  if (!value || !safeLoginTarget(value.target) || !Number.isFinite(value.expiresAt) || value.expiresAt < Date.now()) {
    Taro.removeStorageSync(INTENT_KEY); return null
  }
  return { ...value, purpose: loginPurpose(value.target), returnUrl: typeof value.returnUrl === 'string' && safeLoginTarget(value.returnUrl) && isPublicPage(value.returnUrl) ? value.returnUrl : HOME }
}
function clearIntent(): void { Taro.removeStorageSync(INTENT_KEY); opening = false }
function saveIntent(target: string, parked: boolean): void {
  const origin = currentLoginTarget()
  Taro.setStorageSync(INTENT_KEY, { target, purpose: loginPurpose(target), returnUrl: origin && isPublicPage(origin) ? origin : HOME,
    expiresAt: Date.now() + 30 * 60 * 1000, parked } satisfies LoginIntent)
}
async function go(url: string, replace = false): Promise<void> {
  if (isLoginTab(url)) {
    const tab = /[?&]tab=([^&]+)/.exec(url)?.[1]
    if (url.startsWith('/pages/activity-zone/index') && tab) Taro.setStorageSync('activityZoneTab', decodeURIComponent(tab))
    await Taro.switchTab({ url: url.split('?')[0] })
  } else if (replace) await Taro.redirectTo({ url })
  else await Taro.navigateTo({ url })
}

/** 由点击事件调用。只打开一个登录页，不承接自动提交业务的回调。 */
export async function requireLogin(target: string): Promise<boolean> {
  if (await restoreAuthSession()) return true
  if (opening) return false
  const safe = safeLoginTarget(target)
  if (!safe) { Taro.showToast({ title: '请返回对应入口重新操作', icon: 'none' }); return false }
  opening = true
  saveIntent(safe, false)
  try { await Taro.navigateTo({ url: '/pages/auth/index' }) }
  catch { opening = false; Taro.showToast({ title: '登录页打开失败，请重试', icon: 'none' }) }
  return false
}
export async function navigateWithLogin(target: string): Promise<void> {
  if (await requireLogin(target)) await go(safeLoginTarget(target) || HOME)
}

/** 分享、扫码或过期会话进入受保护页：先回真实首页，不自动打开登录页。 */
export async function parkProtectedTarget(): Promise<void> {
  const target = currentLoginTarget()
  if (target) saveIntent(target, true)
  else clearIntent()
  try { await Taro.switchTab({ url: HOME }) }
  catch { await Taro.reLaunch({ url: HOME }) }
}
export function loginPageClosed(): void { clearIntent() }
export async function cancelLogin(): Promise<void> {
  const intent = pendingLogin()
  clearIntent()
  if (Taro.getCurrentPages().length > 1) {
    try { await Taro.navigateBack(); return } catch { /* 页面栈变化时回公开入口 */ }
  }
  await go(intent && isPublicPage(intent.returnUrl) && safeLoginTarget(intent.returnUrl) ? intent.returnUrl : HOME, true)
}

async function validResumeTarget(target: string, origin?: string): Promise<string> {
  const [path, query = ''] = target.split('?')
  const id = Number(/(?:^|&)batch_id=(\d+)/.exec(query)?.[1] || /(?:^|&)plan_id=(\d+)/.exec(query)?.[1])
  const api = path === '/pages/h3c/form' ? '/api/h3c/exam-batches'
    : path === '/pages/nisp/form' ? '/api/nisp/batches'
      : path === '/pages/renshe/form' ? '/api/renshe/batches' : ''
  if (!api) return target
  const listPath = path.replace('/form', '/index')
  const level = /(?:^|&)level=([12])(?:&|$)/.exec(query)?.[1]
  const fallback = origin?.split('?')[0] === listPath ? origin
    : listPath + (path === '/pages/nisp/form' && level ? `?level=${level}` : '')
  const rows = (await getPublic<Array<{ id: number; status: string; level?: string; can_apply?: boolean; capacity?: number; enrolled?: number; apply_start?: string | null; apply_end?: string | null; remaining_count?: number }>>(api, undefined, false)).data
  const row = rows.find(item => item.id === id)
  const now = Date.now()
  if (!row || row.status !== 'published' || row.remaining_count === 0 || row.can_apply === false
    || (row.capacity && row.enrolled !== undefined && row.enrolled >= row.capacity)
    || (path === '/pages/nisp/form' && level && row.level && row.level !== level)
    || (row.apply_start && Date.parse(row.apply_start) > now) || (row.apply_end && Date.parse(row.apply_end) < now)) {
    Taro.showToast({ title: '批次已截止、下架或暂不可报名，请重新选择', icon: 'none', duration: 3000 })
    return fallback
  }
  return target
}
export async function completeLogin(): Promise<void> {
  const intent = pendingLogin()
  clearIntent()
  if (!getToken()) return go(HOME, true)
  let target = intent?.target || HOME
  try { target = await validResumeTarget(target, intent?.returnUrl) }
  catch { Taro.showToast({ title: '目标暂不可用，请从首页重新选择', icon: 'none' }); target = HOME }
  try { await go(target, true) }
  catch { Taro.showToast({ title: '页面打开失败，已返回首页', icon: 'none' }); await Taro.switchTab({ url: HOME }) }
}
