/** 前端展示用订单对象（由 getOrders 映射层统一从后端字段转换而来） */
export interface Order {
  id: string
  title: string
  description: string
  status: 'pending' | 'enrolled' | 'cancelled'
  date: string
  amount: string
}

/** 后端 GET /api/orders 返回的单条订单原始结构 */
export interface OrderBackendItem {
  id: number
  cert_type: string
  candidate_name: string
  candidate_phone: string
  candidate_idcard: string | null
  price: number
  status: 'pending' | 'paid' | 'completed' | 'refunded' | 'closed'
  out_trade_no: string | null
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
  courseCover: string
  courseTitle: string
  courseSubtitle: string
  amountPaid: string
  paymentMethod: string
  paymentTime: string
  orderTime: string
}