/** 前端展示用订单对象（由 getOrders 映射层统一从后端字段转换而来） */
export interface Order {
  id: string
  title: string
  description: string
  status: 'pending' | 'paid' | 'completed' | 'refunded' | 'closed'
  date: string
  amount: string
}

/** 后端 GET /api/orders 返回的单条订单原始结构 */
export interface OrderBackendItem {
  id: number
  order_kind: 'certification' | 'course' | 'quiz_order' | string
  product_type: string
  candidate_name: string | null
  candidate_phone: string | null
  candidate_idcard: string | null
  price: number
  original_price: number | null
  discount_amount: number | null
  coupon_code: string | null
  status: 'pending' | 'paid' | 'completed' | 'refunded' | 'closed'
  out_trade_no: string | null
  transaction_id: string | null
  inventory_id: number | null
  expires_at: string | null
  closed_at: string | null
  close_reason: string | null
  created_at: string
  updated_at: string
  paid_at: string | null
  extra_data: Record<string, unknown> | null
  attachments: string[] | null
}

export interface OrderDetail {
  orderId: string
  numericId: number
  orderKind: string
  productType: string
  status: 'pending' | 'paid' | 'completed' | 'refunded' | 'closed'
  expiresAt: string | null
  outTradeNo: string
  transactionId: string | null
  productTitle: string
  productDescription: string
  originalAmount: string
  discountAmount: string
  amountPaid: string
  couponCode: string | null
  paymentMethod: string
  paymentTime: string
  orderTime: string
  closedAt: string
  closeReason: string | null
}
