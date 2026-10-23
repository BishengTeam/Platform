import Taro from '@tarojs/taro'
import { ROUTES, TAB_BAR_CONFIG } from '../constants/routes.ts'
import { FEATURES } from '../constants/features.ts'
import { resolveWebViewTarget } from './webviewUrl.ts'

export type SafeBackResult = 'back' | 'fallback'

export interface SafeNavigateBackOptions {
  /** 当前页是第一页时使用的兜底页面；tab 页自动使用 switchTab。 */
  fallbackUrl?: string
  /** 仅在真正进入 fallback 前执行，用于传递 switchTab 不支持的参数。 */
  beforeFallback?: () => void
}

export type ActivityZoneTab = 'activity' | 'competition' | 'employment'

const DEFAULT_FALLBACK_URL = `/${ROUTES.INDEX}`
const TAB_ROUTES = new Set(TAB_BAR_CONFIG.map(item => `/${item.key}`))

function normalizeUrl(url: string): string {
  return url.startsWith('/') ? url : `/${url}`
}

export function isTabRoute(url: string): boolean {
  const path = normalizeUrl(url).split('?')[0]
  return TAB_ROUTES.has(path)
}

function navigationNotice(title: string): void {
  void Taro.showToast({ title, icon: 'none' })
}

function queryValue(url: string, name: string): string | undefined {
  const query = url.split('?')[1] || ''
  for (const part of query.split('&')) {
    const [key, ...value] = part.split('=')
    if (key === name) return decodeURIComponent(value.join('='))
  }
}

/** Banner、海报共用：外链走WebView，Tab内部标签沿用首页storage约定。 */
export async function navigateToUrl(url: string): Promise<void> {
  let stagedTab = false
  try {
    const target = url.trim()
    if (/^https?:\/\//i.test(target)) {
      const external = resolveWebViewTarget(target)
      if (!external) {
        navigationNotice('链接不可用，请联系管理员')
        return
      }
      await Taro.navigateTo({ url: `/${ROUTES.WEBVIEW}?url=${encodeURIComponent(external)}` })
      return
    }
    const normalized = normalizeUrl(target)
    const path = normalized.split('?')[0]
    if (['/pages/course/index', '/pages/course/detail', '/pages/mine/courses'].includes(path)) {
      navigationNotice('目标页面已下线，请联系管理员')
      return
    }
    if (!/^\/pages\/[a-z0-9/_-]+$/i.test(path) || /[\s\\]/.test(normalized)) {
      navigationNotice('链接不可用，请联系管理员')
      return
    }
    if (isTabRoute(path)) {
      if (path === `/${ROUTES.ACTIVITY}`) {
        const tab = queryValue(normalized, 'tab')
        if (tab && !['activity', 'competition', 'employment'].includes(tab)) {
          navigationNotice('目标标签不可用，请联系管理员')
          return
        }
        if (tab === 'activity' && !FEATURES.activityTab) {
          navigationNotice('当前版本暂未开放活动')
          return
        }
        if (tab) {
          Taro.setStorageSync('activityZoneTab', tab)
          stagedTab = true
        } else Taro.removeStorageSync('activityZoneTab')
      }
      await Taro.switchTab({ url: path })
    } else {
      await Taro.navigateTo({ url: normalized })
    }
  } catch {
    if (stagedTab) Taro.removeStorageSync('activityZoneTab')
    navigationNotice('页面打开失败，请重试')
  }
}

function currentPageCount(): number {
  const pages = Taro.getCurrentPages()
  return Array.isArray(pages) ? pages.length : 0
}

async function runFallback(options: SafeNavigateBackOptions): Promise<SafeBackResult> {
  const fallbackUrl = normalizeUrl(options.fallbackUrl ?? DEFAULT_FALLBACK_URL)
  options.beforeFallback?.()

  if (isTabRoute(fallbackUrl)) {
    // switchTab 不支持 query；子 tab 参数必须通过 beforeFallback 写 storage。
    const path = fallbackUrl.split('?')[0]
    await Taro.switchTab({ url: path })
  } else {
    await Taro.reLaunch({ url: fallbackUrl })
  }
  return 'fallback'
}

/**
 * Safely leave the current page. Normal navigation keeps navigateBack;
 * direct-entry pages without a previous page fall back to a business route.
 */
export async function safeNavigateBack(
  options: SafeNavigateBackOptions = {},
): Promise<SafeBackResult> {
  if (currentPageCount() > 1) {
    try {
      await Taro.navigateBack()
      return 'back'
    } catch {
      // The page stack can change between reading it and navigating;
      // recover through the explicit fallback route.
    }
  }
  return runFallback(options)
}

export async function goBackToActivityZone(tab: ActivityZoneTab): Promise<SafeBackResult> {
  return safeNavigateBack({
    fallbackUrl: `/${ROUTES.ACTIVITY}`,
    beforeFallback: () => Taro.setStorageSync('activityZoneTab', tab),
  })
}
