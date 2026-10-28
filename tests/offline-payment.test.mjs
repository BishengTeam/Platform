import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import * as runtime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { beijingTransferParts, formatTransferTime, transferCents, transferDeadline } from '../src/utils/offlinePayment.ts'
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
  if (name === '@tarojs/components') return { View: host('div'), Text: host('span'), Picker: host('div'), Input: host('input'), Image: host('img') }
  if (name === '@tarojs/taro') return { useDidShow() {} }
  if (name === '../Button' || name === '@/components/Button') return button
  if (name.endsWith('.scss')) return classes
  throw Error(name)
}
const parts = compile('src/components/RegistrationParts/index.tsx', baseRequire)
const input = compile('src/components/FormInput/index.tsx', baseRequire)
export function renderPayment(overrides = {}, expanded = {}) {
  const payment = { order_id: 1, amount_cents: 25000, out_trade_no: 'OF-123', product_type: '测试认证', order_status: 'pending',
    status: 'awaiting_proof', status_label: '请转账并提交凭证', deadline: new Date(Date.now() + 3 * 3600000).toISOString(), current_version: 0,
    can_submit: true, can_cancel: true, can_change_coupon: true, can_report_exception: false,
    account: { account_name: '测试收款公司', bank_name: '测试银行', account_number: '6222000000000000000', transfer_note: '请备注订单号', contact_name: '测试管理员', contact_phone: '13800000000', contact_wechat: 'test_admin', service_hours: '工作日' },
    submissions: [], materials: [], ...overrides }
  let state = 0
  const module = compile('src/components/OfflinePaymentPanel/index.tsx', name => {
    if (name === 'react') return { ...React, useState(initial) {
      const index = state++
      const seeds = { 0: payment, 6: false, ...(expanded.contact ? { 12: true } : {}), ...(expanded.extra ? { 14: true } : {}) }
      return React.useState(Object.hasOwn(seeds, index) ? seeds[index] : initial)
    } }
    if (name === '@/components/RegistrationParts') return parts
    if (name === '@/components/FormInput') return input
    if (name === '@/services/offlinePayment') return { transferCents }
    if (name === '@/utils/offlinePayment') return { beijingTransferParts, formatTransferTime, transferDeadline }
    if (name === '@/constants/routes') return { ROUTES: { MINE_REGISTRATIONS: 'pages/mine/registrations' } }
    if (name === '@/services/pointsMallService' || name === '@/services/dataService') return {}
    return baseRequire(name)
  })
  return renderToStaticMarkup(React.createElement(module.OfflinePaymentPanel, { orderId: 1 }))
}

test('money input preserves cents and rejects malformed or unsafe amounts', () => {
  for (const [input, expected] of [['0.01', 1], ['1.10', 110], ['123.45', 12345], [' 99 ', 9900]]) assert.equal(transferCents(input), expected)
  for (const input of ['', '0', '-1', '1.001', 'Infinity', '1e5', '1,000', '21474836.48', '.5']) assert.equal(transferCents(input), null)
})
test('transfer page prioritizes amount, deadline and proof while secondary information stays collapsed', () => {
  const html = renderPayment()
  for (const text of ['summaryCard', '250.00', 'deadlineNotice', '北京时间', 'proofGrid', 'registrationSubmitBar', '转账人', '转账日期', '转账时间', '转账金额', '提交转账凭证', '复制银行账号', '联系管理员', '订单详情', '优惠券']) assert.ok(html.includes(text), text)
  for (const hidden of ['13800000000', 'test_admin', '银行流水号', '查看可用优惠券']) assert.ok(!html.includes(hidden), hidden)
  assert.equal((html.match(/OF-123/g) || []).length, 1, 'order number is shown as transfer memo without duplicated order details')
  assert.doesNotMatch(html, /微信支付|支付成功/)
})
test('administrator contact and optional bank reference remain accessible on demand', () => {
  const html = renderPayment({}, { contact: true, extra: true })
  for (const text of ['13800000000', 'test_admin', '拨打电话', '复制联系电话', '复制微信号', '银行流水号', '补充说明']) assert.ok(html.includes(text), text)
})
test('waiting for bookkeeping cannot submit proof, change coupons or cancel', () => {
  const html = renderPayment({ status: 'under_review', status_label: '凭证已提交，等待核账', can_submit: false, can_cancel: false, can_change_coupon: false })
  assert.match(html, /等待核账/)
  assert.match(html, /请勿重复转账/)
  assert.doesNotMatch(html, /deadlineNotice|银行账号|转账日期|transfer-materials/)
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
test('confirmed payments link to registration progress and show no payment form', () => {
  const html = renderPayment({ order_status: 'paid', status: 'confirmed', status_label: '付款已确认', can_submit: false, can_cancel: false, can_change_coupon: false })
  assert.match(html, /付款已确认/)
  assert.match(html, /查看报名进度/)
  assert.doesNotMatch(html, /registrationSubmitBar|transfer-materials|deadlineNotice/)
})
test('expired deadlines stop normal submission without inventing exception permissions', () => {
  const html = renderPayment({ deadline: new Date(Date.now() - 1000).toISOString() })
  assert.match(html, /凭证提交时间已截止/)
  assert.doesNotMatch(html, /registrationSubmitBar|transfer-materials|已转账？申报异常/)
})
test('zero-yuan orders omit transfer account and proof upload', () => {
  const html = renderPayment({ amount_cents: 0 })
  assert.match(html, /确认零元报名/)
  assert.doesNotMatch(html, /银行收款账户|transfer-materials|deadlineNotice/)
})
test('deadline reminders cover all urgency boundaries and never round remaining seconds to zero', () => {
  const now = Date.parse('2026-10-28T00:00:00Z')
  const reminder = (ms, status = 'awaiting_proof') => transferDeadline(new Date(now + ms).toISOString(), status, now)
  assert.equal(reminder(27 * 3600000).title, '请在1天3小时内提交转账凭证')
  assert.equal(reminder(24 * 3600000).tone, 'warning')
  assert.equal(reminder(3600000).tone, 'urgent')
  assert.equal(reminder(59 * 60000).title, '即将截止，还剩59分钟')
  assert.equal(reminder(1).title, '即将截止，还剩1分钟')
  assert.equal(reminder(3600000, 'returned').title, '请在1小时内补交凭证')
  assert.equal(reminder(0, 'returned').title, '补交凭证时间已截止')
  assert.equal(reminder(-1).expired, true)
  assert.equal(reminder(1000, 'under_review'), null)
  assert.equal(transferDeadline('invalid', 'awaiting_proof', now), null)
})
test('payment dates are stable across device timezones and year boundaries', () => {
  assert.deepEqual(beijingTransferParts('2026-12-31T18:30:00Z'), { date: '2027-01-01', time: '02:30' })
  assert.equal(formatTransferTime('2026-10-28T00:00:00Z'), '2026-10-28 08:00（北京时间）')
  assert.equal(beijingTransferParts('invalid'), null)
})
test('proof downloads keep authorization and reuse local paths for image previews', async () => {
  const calls = []
  const material = { id: 11, content_type: 'image/jpeg' }
  const api = compile('src/services/offlinePayment.ts', name => {
    if (name === '@tarojs/taro') return {
      downloadFile: async options => { calls.push(options); return { statusCode: 200, tempFilePath: 'wxfile://proof.jpg' } },
      previewImage: async options => calls.push(options),
    }
    if (name === '@/utils/request') return { getToken: () => 'test-token', resolveUrl: path => `https://test.invalid${path}` }
    if (name === '@/utils/offlinePayment') return { transferCents }
    throw Error(name)
  }).offlinePaymentService
  const path = await api.downloadMaterial(7, material)
  assert.equal(path, 'wxfile://proof.jpg')
  assert.equal(calls[0].url, 'https://test.invalid/api/orders/7/offline-payment/materials/11/content')
  assert.deepEqual(calls[0].header, { Authorization: 'Bearer test-token' })
  await api.preview(7, material, path)
  assert.equal(calls.length, 2, 'cached image preview does not download the original twice')
  assert.deepEqual(calls[1], { urls: [path], current: path })
})
test('failed authorization cannot turn an error response into a thumbnail or preview', async () => {
  let previewed = false
  const api = compile('src/services/offlinePayment.ts', name => {
    if (name === '@tarojs/taro') return { downloadFile: async () => ({ statusCode: 401, tempFilePath: 'error-response' }), previewImage: async () => { previewed = true } }
    if (name === '@/utils/request') return { getToken: () => 'expired-token', resolveUrl: path => path }
    if (name === '@/utils/offlinePayment') return { transferCents }
    throw Error(name)
  }).offlinePaymentService
  await assert.rejects(api.preview(7, { id: 11, content_type: 'image/jpeg' }), /登录已失效/)
  assert.equal(previewed, false)
})
test('mapper uses explicit server channels, including refunded transfers and ambiguous legacy orders', () => {
  const base = { id: 1, price: 10000, order_kind: 'certification', product_type: 'NISP-1', status: 'pending' }
  assert.equal(toOrderDetail({ ...base, payment_channel: 'bank_transfer' }).paymentMethod, '银行转账')
  assert.equal(toOrderDetail({ ...base, payment_channel: 'wechat', paid_at: '2026-10-01T00:00:00Z' }).paymentMethod, '微信支付（历史订单）')
  assert.equal(toOrderDetail(base).paymentChannel, 'unknown')
})
