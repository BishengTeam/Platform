import assert from 'node:assert/strict'
import test from 'node:test'
import {
  COUPON_CATEGORY_TABS,
  formatMinimumSpend,
  getCouponCategory,
} from '../src/pages/points/mallUtils.ts'

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
