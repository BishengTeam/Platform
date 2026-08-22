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
  return item.product_type || '订单'
}

export function orderDescription(item: OrderBackendItem): string {
  if (item.order_kind === 'course') return '在线课程'
  const name = item.candidate_name || ''
  const phone = maskPhone(item.candidate_phone)
  if (name && phone) return `${name} · ${phone}`
  return name || phone || item.product_type || '认证报名'
}

export function orderAmount(price: number | null | undefined): string {
  if (price == null) return '-'
  if (price === 0) return '免费'
  return `¥${(price / 100).toFixed(2)}`
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
  return {
    orderId: String(item.id),
    outTradeNo: item.out_trade_no || String(item.id),
    courseCover: '',
    courseTitle: orderTitle(item),
    courseSubtitle: orderDescription(item),
    amountPaid: item.price != null ? (item.price / 100).toFixed(2) : '0.00',
    paymentMethod: item.paid_at ? '微信支付' : item.price === 0 ? '免费开通' : '未支付',
    paymentTime: item.paid_at || '未支付',
    orderTime: item.created_at || '',
  }
}
