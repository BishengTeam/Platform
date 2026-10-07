import Taro from '@tarojs/taro'
import { ROUTES, TAB_BAR_CONFIG } from '../constants/routes.ts'

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
