export const OFFLINE_PAYMENT_LABELS: Record<string, string> = {
  awaiting_proof: '待提交转账凭证', under_review: '凭证已提交，等待核账', returned: '待补交转账凭证',
  exception: '转账需人工核实', confirmed: '付款已确认', closed: '订单已关闭', refunded: '款项已退回',
}

/** Parse user-entered yuan without floating-point multiplication. */
export function transferCents(value: string): number | null {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value.trim())) return null
  const [yuan, fraction = ''] = value.trim().split('.')
  const cents = Number(yuan) * 100 + Number(fraction.padEnd(2, '0'))
  return cents > 0 && cents <= 2147483647 ? cents : null
}
