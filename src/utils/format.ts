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
