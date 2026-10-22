import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import * as runtime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { transferCents } from '../src/utils/offlinePayment.ts'
import { toOrderDetail } from '../src/services/orderMapper.ts'

const host = tag => ({ children, className, id, disabled, value }) => React.createElement(tag, { className, id, disabled, ...(tag === 'input' ? { value, readOnly: true } : {}) }, children)
const classes = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : key })
const button = { Button: host('button') }
function compile(path, require) {
  const source = readFileSync(path, 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(require, module, module.exports)
  return module.exports
}
const baseRequire = name => {
  if (name === 'react') return React
  if (name === 'react/jsx-runtime') return runtime
  if (name === '@tarojs/components') return { View: host('div'), Text: host('span'), Picker: host('div'), Input: host('input') }
  if (name === '@tarojs/taro') return {}
  if (name === '../Button' || name === '@/components/Button') return button
  if (name.endsWith('.scss')) return classes
  throw Error(name)
}
const parts = compile('src/components/RegistrationParts/index.tsx', baseRequire)
const input = compile('src/components/FormInput/index.tsx', baseRequire)
export function renderPayment(overrides = {}) {
  const payment = { order_id: 1, amount_cents: 25000, out_trade_no: 'OF-123', product_type: '测试认证', order_status: 'pending',
    status: 'awaiting_proof', status_label: '请转账并提交凭证', deadline: '2026-12-01T10:00:00Z', current_version: 0,
    can_submit: true, can_cancel: true, can_change_coupon: true, can_report_exception: false,
    account: { account_name: '测试收款公司', bank_name: '测试银行', account_number: '6222000000000000000', transfer_note: '请备注订单号', contact_name: '测试管理员', contact_phone: '13800000000', contact_wechat: 'test_admin', service_hours: '工作日' },
    submissions: [], materials: [], ...overrides }
  let state = 0
  const module = compile('src/components/OfflinePaymentPanel/index.tsx', name => {
    if (name === 'react') return { ...React, useState(initial) { const index = state++; return React.useState(index === 0 ? payment : index === 6 ? false : initial) } }
    if (name === '@/components/RegistrationParts') return parts
    if (name === '@/components/FormInput') return input
    if (name === '@/services/offlinePayment') return { transferCents }
    if (name === '@/services/pointsMallService' || name === '@/services/dataService') return {}
    return baseRequire(name)
  })
  return renderToStaticMarkup(React.createElement(module.OfflinePaymentPanel, { orderId: 1 }))
}

test('money input preserves cents and rejects malformed or unsafe amounts', () => {
  for (const [input, expected] of [['0.01', 1], ['1.10', 110], ['123.45', 12345], [' 99 ', 9900]]) assert.equal(transferCents(input), expected)
  for (const input of ['', '0', '-1', '1.001', 'Infinity', '1e5', '1,000', '21474836.48', '.5']) assert.equal(transferCents(input), null)
})
test('transfer form reuses registration components and shows account, proof and contact actions', () => {
  const html = renderPayment()
  for (const text of ['registrationSummary', 'registrationMaterial', 'registrationSubmitBar', '转账人', '转账日期', '转账时间', '转账金额', '提交转账凭证', '复制银行账号', '13800000000', 'test_admin']) assert.ok(html.includes(text), text)
  assert.doesNotMatch(html, /微信支付|支付成功/)
})
test('waiting for bookkeeping cannot submit proof, change coupons or cancel', () => {
  const html = renderPayment({ status: 'under_review', status_label: '凭证已提交，等待核账', can_submit: false, can_cancel: false, can_change_coupon: false })
  assert.match(html, /等待核账/)
  for (const text of ['提交转账凭证', '尚未转账，取消订单', '查看可用优惠券', 'registrationSubmitBar']) assert.ok(!html.includes(text), text)
})
test('returned proof displays exact rejection reason and resubmission action', () => {
  const html = renderPayment({ status: 'returned', message: '请补全回单收款账号', can_change_coupon: false, can_cancel: false })
  assert.match(html, /请补全回单收款账号/)
  assert.match(html, /重新提交凭证/)
})
test('closed-transfer exception offers reporting without a payment-success claim', () => {
  const html = renderPayment({ order_status: 'closed', status: 'closed', can_report_exception: true, can_submit: false, can_change_coupon: false, can_cancel: false })
  assert.match(html, /申报异常/)
  assert.doesNotMatch(html, /registrationSubmitBar|付款已确认/)
})
test('mapper uses explicit server channels, including refunded transfers and ambiguous legacy orders', () => {
  const base = { id: 1, price: 10000, order_kind: 'certification', product_type: 'NISP-1', status: 'pending' }
  assert.equal(toOrderDetail({ ...base, payment_channel: 'bank_transfer' }).paymentMethod, '银行转账')
  assert.equal(toOrderDetail({ ...base, payment_channel: 'wechat', paid_at: '2026-10-01T00:00:00Z' }).paymentMethod, '微信支付（历史订单）')
  assert.equal(toOrderDetail(base).paymentChannel, 'unknown')
})
