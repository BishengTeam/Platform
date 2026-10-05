import type { Order, OrderBackendItem, OrderDetail } from '@/types/orders'

function stringExtra(item: OrderBackendItem, key: string): string | undefined {
  const value = item.extra_data?.[key]
  return typeof value === 'string' && value ? value : undefined
}

/** 手机号脱敏：前 3 位、后 4 位。 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 7) return phone || ''
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

export function orderTitle(item: OrderBackendItem): string {
  if (item.order_kind === 'course') {
    return stringExtra(item, 'course_title') || '在线课程'
  }
  if (item.order_kind === 'quiz_order') return '题库商品'
  if (item.product_type === 'NISP-1') return 'NISP一级认证'
  if (item.product_type === 'NISP-2') return 'NISP二级认证'
  if (item.product_type === 'RS-ZY') return '人社认证报名'
  return item.product_type || '订单'
}

export function orderDescription(item: OrderBackendItem): string {
  const name = item.candidate_name || ''
  const phone = maskPhone(item.candidate_phone)
  if (name && phone) return `${name} · ${phone}`
  if (item.order_kind === 'course') return '在线课程'
  if (item.order_kind === 'quiz_order') return '题库单独购买'
  if (item.product_type === 'NISP-1') return 'NISP一级认证报名'
  if (item.product_type === 'NISP-2') return 'NISP二级认证报名'
  if (item.product_type === 'RS-ZY') return '人社专项职业能力考核'
  if (name || phone) return name || phone
  if (item.order_kind === 'certification') return '认证报名'
  return '商品订单'
}

export function orderAmount(price: number | null | undefined): string {
  if (price == null) return '-'
  if (price === 0) return '免费'
  return `¥${(price / 100).toFixed(2)}`
}

export function orderKindLabel(orderKind: string): string {
  if (orderKind === 'certification') return '认证报名'
  if (orderKind === 'course') return '课程购买'
  if (orderKind === 'quiz_order') return '题库购买'
  return '商品订单'
}

/** 后端 ISO UTC 时间 → 本地时区可读时间（yyyy-MM-dd HH:mm:ss）。 */
export function formatOrderTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

export function toOrder(item: OrderBackendItem): Order {
  return {
    id: String(item.id),
    title: orderTitle(item),
    description: orderDescription(item),
    status: item.status,
    date: item.created_at?.slice(0, 10) || '',
    amount: orderAmount(item.price),
  }
}

export function toOrderDetail(item: OrderBackendItem): OrderDetail {
  const originalPrice = item.original_price ?? item.price
  const discountAmount = item.discount_amount ?? Math.max(originalPrice - item.price, 0)
  return {
    orderId: String(item.id),
    numericId: item.id,
    orderKind: item.order_kind,
    productType: item.product_type,
    status: item.status,
    expiresAt: item.expires_at || null,
    outTradeNo: item.out_trade_no || String(item.id),
    transactionId: item.transaction_id || null,
    productTitle: orderTitle(item),
    productDescription: orderDescription(item),
    originalAmount: (originalPrice / 100).toFixed(2),
    discountAmount: (discountAmount / 100).toFixed(2),
    amountPaid: item.price != null ? (item.price / 100).toFixed(2) : '0.00',
    couponCode: item.coupon_code || null,
    paymentMethod: item.paid_at ? '微信支付' : item.price === 0 ? '免费开通' : '未支付',
    paymentTime: item.paid_at ? formatOrderTime(item.paid_at) : '未支付',
    orderTime: formatOrderTime(item.created_at),
    closedAt: item.closed_at ? formatOrderTime(item.closed_at) : '',
    closeReason: item.close_reason || null,
  }
}
