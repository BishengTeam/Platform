import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { maskPhone, toOrder, toOrderDetail } from '../src/services/orderMapper.ts'

function backendOrder(overrides = {}) {
  return {
    id: 12,
    order_kind: 'course',
    product_type: 'course:1',
    candidate_name: null,
    candidate_phone: null,
    candidate_idcard: null,
    price: 19900,
    status: 'completed',
    out_trade_no: 'CRS123',
    transaction_id: null,
    inventory_id: null,
    original_price: null,
    discount_amount: null,
    coupon_code: null,
    expires_at: null,
    closed_at: null,
    close_reason: null,
    created_at: '2026-08-22T10:00:00Z',
    updated_at: '2026-08-22T10:00:00Z',
    paid_at: '2026-08-22T10:01:00Z',
    extra_data: { course_id: 1, course_title: '网络工程师入门' },
    attachments: null,
    ...overrides,
  }
}

test('course order display uses course metadata instead of product code', () => {
  const order = toOrder(backendOrder())

  assert.equal(order.id, '12')
  assert.equal(order.title, '网络工程师入门')
  assert.equal(order.description, '在线课程')
  assert.equal(order.amount, '¥199.00')
  assert.equal(order.status, 'completed')
  assert.equal(order.date, '2026-08-22')
})

test('certification order display uses product and masked candidate information', () => {
  const order = toOrder(backendOrder({
    order_kind: 'certification',
    product_type: 'RS-ZY',
    candidate_name: '张三',
    candidate_phone: '13800138000',
    price: 0,
    status: 'pending',
    extra_data: null,
  }))

  assert.equal(order.title, '人社认证报名')
  assert.equal(order.description, '张三 · 138****8000')
  assert.equal(order.amount, '免费')
  assert.equal(order.status, 'pending')
  assert.equal(maskPhone('13800138000'), '138****8000')
})

test('order detail keeps internal id separate from merchant order number', () => {
  const detail = toOrderDetail(backendOrder())

  assert.equal(detail.orderId, '12')
  assert.equal(detail.outTradeNo, 'CRS123')
  assert.equal(detail.productTitle, '网络工程师入门')
  assert.equal(detail.orderKind, 'course')
  assert.equal(detail.productType, 'course:1')
  assert.equal(detail.paymentMethod, '微信支付')
})

test('order detail maps every current transaction kind to one payment surface', () => {
  const h3c = toOrderDetail(backendOrder({
    order_kind: 'certification',
    product_type: 'GB0-404',
    price: 9900,
  }))
  const nisp = toOrderDetail(backendOrder({
    order_kind: 'certification',
    product_type: 'NISP-1',
    price: 12800,
  }))
  const quiz = toOrderDetail(backendOrder({
    order_kind: 'quiz_order',
    product_type: 'quiz_library:8',
    original_price: 19900,
    discount_amount: 2000,
    coupon_code: 'PM-TEST',
    price: 17900,
  }))

  assert.equal(h3c.productTitle, 'GB0-404')
  assert.equal(h3c.productDescription, '认证报名')
  assert.equal(nisp.productTitle, 'NISP一级认证')
  assert.equal(nisp.productDescription, 'NISP一级认证报名')
  assert.equal(quiz.productTitle, '题库商品')
  assert.equal(quiz.originalAmount, '199.00')
  assert.equal(quiz.discountAmount, '20.00')
  assert.equal(quiz.amountPaid, '179.00')
  assert.equal(quiz.couponCode, 'PM-TEST')
})

test('pending order detail page is transaction generic and calls unified cancel api', async () => {
  const source = await readFile('src/pages/order-detail/index.tsx', 'utf8')

  assert.match(source, /等待付款/)
  assert.match(source, /订单自动取消/)
  assert.match(source, /商品信息/)
  assert.match(source, /商品总价/)
  assert.match(source, /订单信息/)
  assert.match(source, /cancelOrder\(detail\.numericId\)/)
  assert.match(source, /orderKindLabel\(detail\.orderKind\)/)
  assert.doesNotMatch(source, /TODO: 调用取消订单 API/)
})

test('orders page navigates with the internal order id', async () => {
  const source = await readFile('src/pages/orders/index.tsx', 'utf8')

  assert.match(source, /ROUTES\.ORDER_DETAIL\}\?order_id=\$\{order\.id\}/)
})
