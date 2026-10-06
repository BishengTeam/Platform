import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  COUPON_CATEGORY_TABS,
  formatMinimumSpend,
  getCouponCategory,
} from '../src/pages/mine/mallUtils.ts'

test('coupon categories prioritize course scope before discount type', () => {
  assert.deepEqual(COUPON_CATEGORY_TABS.map(tab => tab.key), ['all', 'fixed', 'percent', 'course'])
  assert.equal(getCouponCategory({ discount_type: 'fixed', scope_label: '课程' }), 'course')
  assert.equal(getCouponCategory({ discount_type: 'percent', scope_label: '课程' }), 'course')
  assert.equal(getCouponCategory({ discount_type: 'fixed', scope_label: '全部商品' }), 'fixed')
  assert.equal(getCouponCategory({ discount_type: 'percent', scope_label: '认证报名' }), 'percent')
})

test('minimum spend keeps whole-yuan labels concise', () => {
  assert.equal(formatMinimumSpend(0), '0')
  assert.equal(formatMinimumSpend(10000), '100')
  assert.equal(formatMinimumSpend(50), '0.5')
  assert.equal(formatMinimumSpend(1055), '10.55')
})

test('payment confirm page loads usable coupons after order detail', async () => {
  const source = await readFile(new URL('../src/pages/registration/confirm.tsx', import.meta.url), 'utf8')

  assert.match(source, /pointsMallService\.usableCoupons\(\{/)
  assert.match(source, /order_amount_cents: Math\.round\(initialOriginalPrice \* 100\)/)
  assert.match(source, /product_type: order\?\.productType \|\| ''/)
  assert.match(source, /product_category: 'certification'/)
  assert.match(source, /setUsableCoupons\(/)
  assert.match(source, /applyCouponToOrder\(Number\(orderId\), coupon\?\.coupon_code \|\| ''\)/)
})
