/**
 * 格式化工具函数
 *
 * 后端所有 price 字段单位为「分」（int），前端展示需转为「元」。
 * 统一通过 formatPrice 处理，避免各页面各自做 /100 计算。
 */

/**
 * 将分单位的金额转为元的展示字符串
 * @param priceInFen - 后端返回的价格（分）
 * @param prefix - 货币符号前缀，默认 '¥'
 * @returns 格式化后的价格字符串，如 '¥3800.00'
 */
export function formatPrice(priceInFen: number, prefix = '¥'): string {
  return `${prefix}${(priceInFen / 100).toFixed(2)}`
}

// ---- Category 中文映射 ----

/** 后端英文 category → 前端中文标签 */
export const CATEGORY_DISPLAY_MAP: Record<string, string> = {
  basic: '基础课程',
  advanced: '进阶课程',
  practical: '实战课程',
  certification: '认证课程',
}

/** 中文标签 → 英文 category 反向映射 */
export const CATEGORY_LABEL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_DISPLAY_MAP).map(([k, v]) => [v, k]),
)

/**
 * 将英文 category 转为中文展示标签。
 * 大小写不敏感匹配，未知值原样返回。
 */
export function formatCategory(category: string | null | undefined): string {
  if (!category) return ''
  const lower = category.toLowerCase()
  // 大小写不敏感查找
  const key = Object.keys(CATEGORY_DISPLAY_MAP).find(k => k.toLowerCase() === lower)
  return key ? CATEGORY_DISPLAY_MAP[key] : category
}
