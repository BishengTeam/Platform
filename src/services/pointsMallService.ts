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
  user_redeemed_count: number
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

export const pointsMallService = {
  async listItems(): Promise<PointsMallItem[]> {
    return (await get<PointsMallItem[]>('/api/points-mall/items')).data
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
