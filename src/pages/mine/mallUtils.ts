import type { PointsMallItem } from '@/services/pointsMallService'

export const COUPON_CATEGORY_TABS = [
  { key: 'all', label: '全部' },
  { key: 'fixed', label: '满减券' },
  { key: 'percent', label: '折扣券' },
  { key: 'course', label: '专项课程券' },
] as const

export type CouponCategoryKey = (typeof COUPON_CATEGORY_TABS)[number]['key']

export function getCouponCategory(
  item: Pick<PointsMallItem, 'discount_type' | 'scope_label'>,
): Exclude<CouponCategoryKey, 'all'> {
  if (item.scope_label.includes('课程')) return 'course'
  return item.discount_type
}

export function formatMinimumSpend(cents: number): string {
  const yuan = cents / 100
  return Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2).replace(/\.?0+$/, '')
}
