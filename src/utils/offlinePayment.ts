export const OFFLINE_PAYMENT_LABELS: Record<string, string> = {
  awaiting_proof: '待提交转账凭证', under_review: '凭证已提交，等待核账', returned: '待补交转账凭证',
  exception: '转账需人工核实', confirmed: '付款已确认', closed: '订单已关闭', refunded: '款项已退回',
}

/** Payment deadlines are always displayed in Beijing time, independently of device timezone. */
export function beijingTransferParts(value: string | number) {
  const date = new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000)
  if (!Number.isFinite(date.getTime())) return null
  const pad = (part: number) => String(part).padStart(2, '0')
  return {
    date: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    time: `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`,
  }
}

export function formatTransferTime(value: string | number) {
  const parts = beijingTransferParts(value)
  return parts ? `${parts.date} ${parts.time}（北京时间）` : '时间待核实'
}

export function transferDeadline(value: string | null, status: string, now = Date.now()) {
  if (!value || !['awaiting_proof', 'returned'].includes(status)) return null
  const end = new Date(value).getTime()
  if (!Number.isFinite(end)) return null
  const remaining = end - now
  const minutes = Math.max(0, Math.ceil(remaining / 60000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor(minutes / 60) % 24
  const duration = minutes > 1440
    ? `${days}天${hours ? `${hours}小时` : ''}`
    : minutes >= 60 ? `${Math.floor(minutes / 60)}小时${minutes % 60 ? `${minutes % 60}分钟` : ''}` : `${minutes}分钟`
  return {
    expired: remaining <= 0,
    tone: remaining <= 3600000 ? 'urgent' : remaining <= 86400000 ? 'warning' : 'normal',
    title: remaining <= 0 ? (status === 'returned' ? '补交凭证时间已截止' : '凭证提交时间已截止')
      : status === 'returned' ? `请在${duration}内补交凭证`
        : remaining < 3600000 ? `即将截止，还剩${duration}` : `请在${duration}内提交转账凭证`,
    exact: `截止至 ${formatTransferTime(value)}`,
  }
}

/** Parse user-entered yuan without floating-point multiplication. */
export function transferCents(value: string): number | null {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value.trim())) return null
  const [yuan, fraction = ''] = value.trim().split('.')
  const cents = Number(yuan) * 100 + Number(fraction.padEnd(2, '0'))
  return cents > 0 && cents <= 2147483647 ? cents : null
}
