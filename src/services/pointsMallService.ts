import { getPublic, getOptional } from '../utils/request.ts'
import { get, post } from '../utils/request.ts'

export interface PointsMallItem {
  id: number
  name: string
  description: string | null
  discount_type: 'fixed' | 'percent'
  discount_value: number
  discount_label: string
  scope_label: string
  min_order_amount_cents: number
  points_cost: number
  remaining_stock: number
  per_user_limit: number
  user_redeemed_count: number | null
  can_redeem: boolean
  redeem_blocked_reason: string | null
}

export interface MyCoupon {
  id: number
  coupon_code: string
  name: string
  discount_type: 'fixed' | 'percent'
  discount_value: number
  discount_label: string
  scope_type: 'global' | 'category' | 'product'
  scope_value: string | null
  scope_label: string
  min_order_amount_cents: number
  status: 'unused' | 'used' | 'expired'
  expires_at: string
  used_at: string | null
  order_id: number | null
  created_at: string
}

export interface UsableCoupon extends MyCoupon {
  discounted_price_cents: number
  discount_amount_cents: number
}

export interface VirtualProduct {
  id: number
  product_type: 'course' | 'quiz_library'
  content_key: string
  course_id: number | null
  library_id: number | null
  name: string
  cover_url: string | null
  description: string | null
  points_price: number
  stock_limit: number | null
  remaining_stock: number | null
  total_redeemed: number
  entitlement_days: number | null
  available_from: string | null
  available_to: string | null
  status: 'draft' | 'published' | 'offline'
  version: number
  created_at: string
  updated_at: string
}

export interface VirtualPrecheck {
  product: VirtualProduct
  balance: number
  balance_after: number | null
  points_shortage: number | null
  can_redeem: boolean
  blocked_reason: string | null
  already_owned: boolean
}

export interface VirtualOrder {
  id: number
  order_no: string
  product_id: number
  product_type: 'course' | 'quiz_library'
  product_name: string
  course_id: number | null
  library_id: number | null
  points_cost: number
  entitlement_days: number | null
  starts_at: string
  ends_at: string | null
  status: 'completed' | 'refunded'
  completed_at: string
  refunded_at: string | null
  created_at: string
  updated_at: string
}

export interface VirtualRedeemResult extends VirtualOrder {
  balance: number
  idempotent: boolean
  points_history_id: number | null
}

export const pointsMallService = {
  async listItems(): Promise<PointsMallItem[]> {
    return (await getOptional<PointsMallItem[]>('/api/points-mall/items')).data
  },
  async redeem(itemId: number): Promise<MyCoupon> {
    return (await post<MyCoupon>('/api/points-mall/redeem', { item_id: itemId })).data
  },
  async myCoupons(status?: string): Promise<MyCoupon[]> {
    const query = status ? `?status=${status}` : ''
    return (await get<MyCoupon[]>(`/api/points-mall/my-coupons${query}`)).data
  },
  async usableCoupons(payload: {
    order_amount_cents: number
    product_type: string
    product_category?: string
  }): Promise<UsableCoupon[]> {
    return (await post<UsableCoupon[]>('/api/points-mall/usable-coupons', payload as Record<string, unknown>)).data
  },
  async listVirtualProducts(): Promise<VirtualProduct[]> {
    const response = await getOptional<{ items?: VirtualProduct[] }>('/api/points/virtual-products')
    return response.data?.items ?? []
  },
  async precheckVirtualProduct(
    productId: number,
    idempotencyKey?: string,
  ): Promise<VirtualPrecheck> {
    const response = await post<VirtualPrecheck>(
      '/api/points/virtual-orders/precheck',
      { product_id: productId, idempotency_key: idempotencyKey },
    )
    return response.data
  },
  async redeemVirtualProduct(payload: {
    product_id: number
    product_version: number
    idempotency_key: string
  }): Promise<VirtualRedeemResult> {
    const response = await post<VirtualRedeemResult>(
      '/api/points/virtual-orders',
      payload,
    )
    return response.data
  },
  async listVirtualOrders(): Promise<VirtualOrder[]> {
    const response = await get<{ items?: VirtualOrder[] }>('/api/points/virtual-orders')
    return response.data?.items ?? []
  },
}

export async function applyCouponToOrder(
  orderId: number,
  couponCode: string,
): Promise<{
  order_id: number
  original_price: number
  discount_amount: number
  final_price: number
  coupon_code: string | null
}> {
  return (
    await post<{
      order_id: number
      original_price: number
      discount_amount: number
      final_price: number
      coupon_code: string | null
    }>(`/api/orders/${orderId}/apply-coupon`, { coupon_code: couponCode })
  ).data
}
