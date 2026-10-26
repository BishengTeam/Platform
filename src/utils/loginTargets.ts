import { ROUTES, TAB_BAR_CONFIG } from '../constants/routes.ts'

export const PUBLIC_PAGES = new Set([
  ROUTES.INDEX, 'pages/training/index', ROUTES.PROFILE, ROUTES.REGISTRATION_INDEX,
  ROUTES.REGISTRATION_CATEGORY, ROUTES.H3C_INDEX, ROUTES.NISP_INDEX, ROUTES.RENSHE_INDEX,
  ROUTES.SANGFOR_INDEX,
  ROUTES.ACTIVITY, 'pages/activity-zone/detail', 'pages/competition/detail', 'pages/employment-zone/detail',
  ROUTES.QUIZ_INDEX, ROUTES.MINE_POINTS, ROUTES.MINE_ABOUT, ROUTES.AGREEMENT_VIEW, ROUTES.WEBVIEW,
  'pages/competition/attachment',
])
const SUPPORTED_PAGES = new Set<string>([...Object.values(ROUTES), ...PUBLIC_PAGES,
  'pages/classroom/join', 'pages/classroom/detail', 'pages/classroom/quiz', 'pages/classroom/result',
  'pages/mine/contact-teachers',
])
const NUMERIC_PARAMS = new Set(['id', 'plan_id', 'certId', 'batch_id', 'project_id', 'order_id', 'registration_id', 'cert_id',
  'libraryId', 'library_id', 'scopeId', 'scope_id', 'exam_id', 'session_id', 'classroom_id'])
const ENUM_PARAMS: Record<string, readonly string[]> = {
  level: ['1', '2'], vendor: ['H3C', 'NISP', '人社', '深信服'],
  scopeType: ['library', 'module', 'knowledge_point'], scope_type: ['library', 'module', 'knowledge_point'],
  type: ['h3c', 'nisp', 'renshe', 'competition', 'user_terms', 'privacy', 'identity_auth', 'cert_registration'],
  kind: ['h3c', 'nisp', 'renshe', 'competition'], tab: ['activity', 'competition', 'employment', 'mall', 'virtual', 'orders', 'coupons'],
  mode: ['full', 'wrong_only', 'practice', 'mock'], requireSign: ['0', '1'],
}

/** 只保存业务路由和受控参数，不接收任意返回URL或个人表单数据。 */
export function safeLoginTarget(raw: string, partial = false): string | null {
  if (typeof raw !== 'string' || raw.length > 1024 || /[\s\\#]/.test(raw)) return null
  const [route, query = '', extra] = raw.replace(/^\//, '').split('?')
  if (extra !== undefined || !SUPPORTED_PAGES.has(route) || route === ROUTES.AUTH || route === ROUTES.PAYMENT_RESULT) return null
  const params: string[] = []
  const seen = new Set<string>()
  try {
    for (const pair of query.split('&').filter(Boolean)) {
      const [encodedKey, ...encodedValue] = pair.split('=')
      const key = decodeURIComponent(encodedKey), value = decodeURIComponent(encodedValue.join('='))
      if (seen.has(key)) return null
      seen.add(key)
      const valid = NUMERIC_PARAMS.has(key) ? /^[1-9]\d{0,9}$/.test(value)
        : key === 'cert_code' ? /^[\w.-]{1,64}$/.test(value)
          : Boolean(ENUM_PARAMS[key]?.includes(value))
      if (!valid) return null
      params.push(`${key}=${encodeURIComponent(value)}`)
    }
  } catch { return null }
  const required: Record<string, string[]> = {
    [ROUTES.H3C_FORM]: ['batch_id'], [ROUTES.NISP_FORM]: ['batch_id'], [ROUTES.RENSHE_FORM]: ['plan_id'],
    [ROUTES.ORDER_DETAIL]: ['order_id'], [ROUTES.REGISTRATION_CONFIRM]: ['order_id'],
    [ROUTES.QUIZ_PREPARE]: ['scopeType', 'scopeId'],
  }
  if (!partial && required[route]?.some(key => !seen.has(key))) return null
  if (!partial && route === ROUTES.SANGFOR_FORM && !seen.has('batch_id') && !seen.has('registration_id')) return null
  if (!partial && route === ROUTES.SANGFOR_DETAIL && !seen.has('id')) return null
  return `/${route}${params.length ? '?' + params.join('&') : ''}`
}
export function isPublicPage(url: string): boolean { return PUBLIC_PAGES.has(url.replace(/^\//, '').split('?')[0]) }
export function isLoginTab(url: string): boolean { return TAB_BAR_CONFIG.some(tab => '/' + tab.key === url.split('?')[0]) }
export function loginPurpose(url: string): string {
  if (/\/h3c\/form/.test(url)) return '登录后继续报名H3C认证'
  if (/\/nisp\/form/.test(url)) return url.includes('level=2') ? '登录后继续报名NISP二级' : '登录后继续报名NISP认证'
  if (/\/renshe\/form/.test(url)) return '登录后继续报名人社认证'
  if (/\/sangfor\//.test(url)) return '登录后继续办理深信服认证'
  if (/\/quiz\//.test(url)) return '登录后继续使用个人学习功能'
  if (url.includes('/mine/points')) return '登录后继续使用积分功能'
  if (url.includes('/orders/') || url.includes('/order-detail/')) return '登录后查看我的订单'
  return '登录后继续办理，个人信息仅在登录后读取'
}
