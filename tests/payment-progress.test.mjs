import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import * as runtime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { paymentProgress } from '../src/utils/paymentProgress.ts'

export const progressFixture = (status = 'under_review', product = 'NISP-1') => ({
  order: { orderId: '7', numericId: 7, orderKind: 'certification', paymentChannel: 'bank_transfer', productType: product,
    productTitle: { 'NISP-1': 'NISP一级认证', 'GB0-192': 'H3C认证报名', 'RS-ZY': '人社认证报名', 'SCSA-T': '深信服认证报名' }[product],
    status: status === 'confirmed' ? 'paid' : status === 'closed' ? 'closed' : status === 'refunded' ? 'refunded' : 'pending',
    offlineStatus: status, amountPaid: '1280.00', outTradeNo: 'OF202610290007', closeReason: status === 'closed' ? '用户取消订单' : null },
  payment: { order_id: 7, amount_cents: 128000, status, order_status: status === 'confirmed' ? 'paid' : status === 'closed' ? 'closed' : status === 'refunded' ? 'refunded' : 'pending',
    deadline: new Date(Date.now() + 45 * 60000).toISOString(), message: status === 'returned' ? '请上传包含收款账号的完整回单' : null,
    can_report_exception: status === 'closed', account: { contact_name: '认证服务老师', contact_phone: '13800000000', contact_wechat: 'test_admin', service_hours: '工作日 09:00—18:00' }, submissions: [] },
})

for (const product of ['GB0-192', 'NISP-1', 'RS-ZY', 'SCSA-T']) {
  test(`${product} uses the same state-specific titles and next actions`, () => {
    for (const [status, title, action] of [
      ['awaiting_proof', '请完成转账并提交凭证', '前往付款'],
      ['under_review', '凭证已提交，等待核账', '查看已提交凭证'],
      ['returned', '转账凭证需要补交', '补交凭证'],
      ['exception', '转账需要人工核实', '联系管理员'],
      ['confirmed', '付款已确认', '查看报名进度'],
      ['closed', '订单已关闭', '已转账，前往处理'],
      ['refunded', '款项已退回', '查看退款订单'],
    ]) {
      const view = paymentProgress(progressFixture(status, product))
      assert.equal(view.title, title)
      assert.equal(view.actionLabel, action)
      assert.equal(view.poll, status === 'under_review')
    }
  })
}

test('server order state wins over optimistic or inconsistent payment labels', () => {
  const snapshot = progressFixture('confirmed')
  snapshot.payment.order_status = 'pending'
  assert.equal(paymentProgress(snapshot).state, 'unknown')
  snapshot.order.status = 'pending'; snapshot.payment.order_status = 'paid'
  assert.equal(paymentProgress(snapshot).state, 'confirmed')
  snapshot.payment.order_status = 'refunded'
  assert.equal(paymentProgress(snapshot).state, 'refunded')
})

test('returned and expired proofs use the actual rejection and correction deadline', () => {
  const snapshot = progressFixture('returned')
  assert.match(paymentProgress(snapshot).reason, /完整回单/)
  assert.match(paymentProgress(snapshot).deadline.title, /补交凭证/)
  snapshot.payment.deadline = new Date(Date.now() - 1).toISOString()
  snapshot.payment.can_report_exception = true
  assert.equal(paymentProgress(snapshot).title, '补交凭证时间已截止')
  assert.equal(paymentProgress(snapshot).actionLabel, '已转账，前往处理')
})

test('bank snapshot amount wins when a coupon changed between the two reads', () => {
  const snapshot = progressFixture('awaiting_proof')
  snapshot.payment.amount_cents = 108000
  assert.equal(paymentProgress(snapshot).amount, '1080.00')
  snapshot.payment.amount_cents = 0
  const free = paymentProgress(snapshot)
  assert.equal(free.title, '请确认零元报名')
  assert.equal(free.deadline, null)
  assert.doesNotMatch(free.description, /上传银行回单/)
})

test('missing contacts and legacy channels never offer a dead contact button or a new transfer', () => {
  const snapshot = progressFixture('exception')
  snapshot.payment.account.contact_phone = ''; snapshot.payment.account.contact_wechat = ''
  assert.equal(paymentProgress(snapshot).action, 'order')
  snapshot.payment = null; snapshot.order.paymentChannel = 'wechat'; snapshot.order.offlineStatus = 'awaiting_proof'
  assert.equal(paymentProgress(snapshot).state, 'unknown')
  snapshot.order.status = 'paid'; snapshot.order.orderKind = 'course'
  assert.equal(paymentProgress(snapshot).action, 'order')
  assert.doesNotMatch(paymentProgress(snapshot).description, /报名/)
})

function compile(file, resolve) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(resolve, module, module.exports)
  return module.exports
}
const host = tag => ({ children, className, id, onClick, disabled }) => React.createElement(tag, { className, id, onClick, disabled }, children)
const classes = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : key })
export function renderProgress(snapshot = progressFixture(), options = {}) {
  let state = 0
  const module = compile('src/pages/payment/result.tsx', name => {
    if (name === 'react') return { ...React, useState(initial) { const index = state++; return React.useState(index === 0 ? 7 : index === 1 ? true : index === 2 ? Boolean(options.contact) : initial) } }
    if (name === 'react/jsx-runtime') return runtime
    if (name === '@tarojs/components') return { View: host('div'), Text: host('span') }
    if (name === '@tarojs/taro') return { useLoad() {} }
    if (name === '@/components/AuthGuard') return { AuthGuard: ({ children }) => children }
    if (name === '@/components/PageHeader') return { PageHeader: ({ title }) => React.createElement('header', null, title) }
    if (name === '@/components/Button') return { Button: host('button') }
    if (name === '@/hooks/useAuth') return { useAuth: () => ({ isLoggedIn: true, sessionId: 0 }) }
    if (name === '@/hooks/usePaymentProgress') return { usePaymentProgress: () => ({ snapshot, loading: false, refreshing: false, error: options.error || '', now: Date.now(), refresh() {} }) }
    if (name === '@/utils/paymentProgress') return { paymentProgress }
    if (name === '@/constants/routes') return { ROUTES: { MINE_REGISTRATIONS: 'pages/mine/registrations' } }
    if (name.endsWith('.scss')) return classes
    throw Error(name)
  })
  return renderToStaticMarkup(React.createElement(module.default))
}

test('result UI emphasizes the next action without exposing the full order number', () => {
  const html = renderProgress()
  assert.match(html, /凭证已提交，等待核账/)
  assert.match(html, /statusIcon/)
  assert.match(html, /每 30 秒自动更新/)
  assert.match(html, /查看已提交凭证/)
  assert.doesNotMatch(html, /OF202610290007|test_admin/)
  assert.match(renderProgress(progressFixture('exception'), { contact: true }), /13800000000/)
})

test('refresh errors keep the existing result and never change it into a payment failure', () => {
  const html = renderProgress(progressFixture('under_review'), { error: '进度更新失败，已加载的信息已保留，请刷新重试。' })
  assert.match(html, /等待核账/)
  assert.match(html, /进度更新失败/)
  assert.doesNotMatch(html, /付款失败|支付失败/)
})

function progressDriver(t, initial = progressFixture()) {
  let time = Date.now(), cursor = 0, dirty = false, data = initial, show, hide, value
  let orderId = 7, enabled = true, session = 0, requestCount = 0, detailCount = 0, fail = false, failDetail = false, hold = false
  const slots = [], effects = [], timers = new Map(), pending = []
  let timerId = 0
  t.mock.method(Date, 'now', () => time)
  const react = {
    useState(initial) { const key = cursor++; slots[key] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slots[key].value, next => { const result = typeof next === 'function' ? next(slots[key].value) : next; if (result !== slots[key].value) { slots[key].value = result; dirty = true } }] },
    useRef(initial) { const key = cursor++; slots[key] ??= { current: initial }; return slots[key] },
    useCallback(callback, deps) { const key = cursor++; if (!slots[key] || deps.some((dep, i) => !Object.is(dep, slots[key].deps[i]))) slots[key] = { deps, callback }; return slots[key].callback },
    useEffect(action, deps) { const key = cursor++, old = slots[key]; if (!old || deps.some((dep, i) => !Object.is(dep, old.deps[i]))) { old?.cleanup?.(); slots[key] = { deps }; effects.push(() => { slots[key].cleanup = action() }) } },
  }
  const source = ts.transpileModule(readFileSync('src/hooks/usePaymentProgress.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const module = { exports: {} }
  const timer = (callback, delay, interval) => { timers.set(++timerId, { callback, at: time + delay, interval }); return timerId }
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', source)(name => {
    if (name === 'react') return react
    if (name === '@tarojs/taro') return { useDidShow(callback) { show = callback }, useDidHide(callback) { hide = callback } }
    if (name === '@/utils/authState') return { getAuthSessionId: () => session }
    if (name === '@/utils/paymentProgress') return { paymentProgress }
    if (name === '@/services/dataService') return { getOrderDetail: async (id, quiet) => {
      assert.equal(quiet, true); requestCount++
      if (fail) throw Error('network unavailable')
      if (hold) return new Promise(resolve => pending.push(resolve))
      return structuredClone({ ...data.order, numericId: id })
    } }
    if (name === '@/services/offlinePayment') return { offlinePaymentService: { detail: async (id, quiet) => { assert.equal(quiet, true); detailCount++; if (failDetail) throw Error('detail unavailable'); return structuredClone(data.payment) } } }
    throw Error(name)
  }, module, module.exports, (callback, delay) => timer(callback, delay, 0), id => timers.delete(id), (callback, delay) => timer(callback, delay, delay), id => timers.delete(id))
  function render() { do { dirty = false; cursor = 0; value = module.exports.usePaymentProgress(orderId, enabled, session); while (effects.length) effects.shift()() } while (dirty) }
  const driver = {
    get value() { return value }, get calls() { return requestCount }, get detailCalls() { return detailCount }, get timerCount() { return timers.size },
    get pending() { return pending }, set data(next) { data = next }, set fail(next) { fail = next }, set failDetail(next) { failDetail = next }, set hold(next) { hold = next },
    async settle() { for (let i = 0; i < 20; i++) { await Promise.resolve(); if (dirty) render() } },
    show() { show(); render() }, hide() { hide(); render() },
    context(id, active = true, nextSession = session) { orderId = id; enabled = active; session = nextSession; render() },
    tick(ms) { time += ms; for (const [id, task] of [...timers]) if (task.at <= time) { if (task.interval) task.at += task.interval; else timers.delete(id); task.callback() } render() },
    unmount() { for (const slot of slots) slot?.cleanup?.() },
  }
  render(); t.after(() => driver.unmount()); return driver
}

test('review polling runs only in the foreground and stops after confirmation', async t => {
  const driver = progressDriver(t)
  await driver.settle(); driver.show()
  assert.equal(driver.calls, 1)
  driver.tick(30000); await driver.settle(); assert.equal(driver.calls, 2)
  driver.hide(); assert.equal(driver.timerCount, 0)
  driver.tick(90000); await driver.settle(); assert.equal(driver.calls, 2)
  driver.data = progressFixture('confirmed'); driver.show(); await driver.settle()
  assert.equal(driver.calls, 3); assert.equal(paymentProgress(driver.value.snapshot).state, 'confirmed')
  assert.equal(driver.timerCount, 0)
})

test('background failures preserve the snapshot and recovery clears the inline error', async t => {
  const driver = progressDriver(t)
  await driver.settle(); const previous = driver.value.snapshot
  driver.fail = true; driver.tick(30000); await driver.settle()
  assert.equal(driver.value.snapshot, previous); assert.match(driver.value.error, /进度更新失败/)
  driver.fail = false; driver.tick(30000); await driver.settle(); assert.equal(driver.value.error, '')
})

test('partial bank-detail failure still shows the current order state', async t => {
  const driver = progressDriver(t, progressFixture('confirmed'))
  driver.failDetail = true; await driver.settle()
  assert.equal(paymentProgress(driver.value.snapshot).state, 'confirmed')
  assert.match(driver.value.error, /付款详情更新失败/)
})

test('manual refreshes share a pending request and old-session responses are discarded', async t => {
  const driver = progressDriver(t)
  await driver.settle(); driver.hold = true
  const first = driver.value.refresh(), second = driver.value.refresh()
  assert.equal(first, second); assert.equal(driver.calls, 2)
  driver.context(7, false, 1)
  driver.pending.shift()(progressFixture().order); await driver.settle()
  assert.equal(driver.value.snapshot, null)
  assert.equal(driver.timerCount, 0)
})

test('expired correction deadlines refresh once and disable normal correction actions', async t => {
  const data = progressFixture('returned'); data.payment.deadline = new Date(Date.now() + 1000).toISOString()
  const driver = progressDriver(t, data)
  await driver.settle(); driver.show(); driver.tick(1001); await driver.settle()
  assert.equal(driver.calls, 2)
  assert.equal(paymentProgress(driver.value.snapshot, driver.value.now).state, 'expired')
  driver.tick(60000); await driver.settle(); assert.equal(driver.calls, 2)
  driver.unmount(); assert.equal(driver.timerCount, 0)
})

test('zero-yuan confirmed orders need no bank details or polling', async t => {
  const data = progressFixture('confirmed'); data.order.paymentChannel = 'free'; data.order.amountPaid = '0.00'
  const driver = progressDriver(t, data)
  await driver.settle()
  assert.equal(driver.detailCalls, 0); assert.equal(driver.timerCount, 0)
  assert.equal(paymentProgress(driver.value.snapshot).action, 'registration')
})
