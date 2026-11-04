import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done }), resolve: value => resolve(value) } }
function driver({ vendor = 'nisp', catalog, getNotice }) {
  let cursor = 0, dirty = true, tree, loader
  const slots = [], effects = [], calls = [], remembered = []
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]))
  const React = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], value => { const next = typeof value === 'function' ? value(slots[index]) : value; if (!Object.is(slots[index], next)) { slots[index] = next; dirty = true } }] },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial } },
    useCallback(callback, deps) { const index = cursor++; if (!same(slots[index]?.deps, deps)) slots[index] = { deps, value: callback }; return slots[index].value },
    useEffect(effect, deps) { const index = cursor++; if (!same(slots[index]?.deps, deps)) { effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: effect() } }); slots[index] = { ...slots[index], deps } } },
  }
  const jsx = (type, props) => ({ type, props })
  const mocks = {
    react: React, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    '@tarojs/components': { View: 'View', Text: 'Text', Checkbox: 'Checkbox', Picker: 'Picker' },
    '@tarojs/taro': { __esModule: true, default: { getCurrentPages: () => [], navigateBack: async () => calls.push('back') }, useLoad: callback => { loader = callback } },
    '@/components/PageHeader': { PageHeader: 'PageHeader' }, '@/components/Button': { Button: 'Button' }, '@/components/CertificationEnrollment': { NoticeBlocks: 'NoticeBlocks' },
    '@/services/certificationJourney': { certificationJourneyService: { catalog: async () => catalog, notice: getNotice } },
    '@/utils/enrollment': { VENDOR_KEYS: { nisp: 'nisp', h3c: 'h3c' }, currentNotice: () => null, enrollmentBatchLabel: batch => batch.name, enrollmentDeadline: value => value,
      enrollmentCountdown: () => '', enrollmentFormUrl: (vendor, batch, type) => `${vendor}:${batch.id}:${type}`, rememberNotice: value => remembered.push(value) },
    '@/utils/certificationBatch': { certificationBatchState: batch => ({ canApply: batch.can_apply }) },
    '@/utils/loginCoordinator': { navigateWithLogin: async target => calls.push(target), requireLogin: async () => true },
    '@/hooks/useCertificationBatchClock': { useCertificationBatchClock: () => Date.parse('2026-11-04') },
  }
  const source = ts.transpileModule(readFileSync('src/pages/registration/notice.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const exports = {}
  new Function('require', 'exports', source)(name => name.endsWith('.scss') ? { default: new Proxy({}, { get: (_, key) => key }) } : mocks[name] || (() => { throw new Error(name) })(), exports)
  function render() { cursor = 0; dirty = false; tree = exports.default(); for (const effect of effects.splice(0)) effect() }
  async function settle() { for (let turn = 0; turn < 40; turn++) { if (dirty) render(); await Promise.resolve() } }
  const walk = node => !node ? [] : Array.isArray(node) ? node.flatMap(walk) : typeof node !== 'object' ? [] : [node, ...walk(node.props?.children)]
  const nodes = () => walk(tree)
  render(); loader({ type: vendor })
  return { settle, nodes, calls, remembered, dispose: () => slots.forEach(slot => slot?.cleanup?.()), pick: async (index, value) => { nodes().filter(node => node.type === 'Picker')[index].props.onChange({ detail: { value: String(value) } }); await settle() },
    agree: async () => { nodes().find(node => node.props?.className === 'agreement').props.onClick(); await settle() },
    proceed: async () => { await nodes().find(node => node.type === 'Button' && node.props.children === '继续填写报名信息').props.onClick(); await settle() },
    get continueDisabled() { return nodes().find(node => node.type === 'Button' && node.props.children === '继续填写报名信息').props.disabled } }
}
const batch = (id, subject, price = 1000) => ({ id, plan_id: id + 100, subject_id: subject, name: `批次${id}`, can_apply: true, status: 'published', apply_end: '2026-11-20T15:59:00Z', exam_date: '2026-12-01', prices: [{ value: '1', label: '一级', price_cents: price }] })
const notice = (batch, hash = String(batch.id)) => ({ vendor: 'nisp', subject: { id: batch.subject_id, name: batch.subject_id }, batch, price: batch.prices[0], notice: { title: '须知', blocks: [] }, supplement: { title: '补充', blocks: [] }, notice_hash: hash })

test('changing subjects isolates late notice responses, auto-selects a sole batch and resumes only the confirmed target', async t => {
  const first = deferred(), a = batch(1, 'A'), b = batch(2, 'B')
  const runtime = driver({ catalog: { subjects: [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }], batches: [a, b] }, getNotice: async (_vendor, id) => id === 1 ? first.promise : notice(b) })
  t.after(runtime.dispose)
  await runtime.settle(); assert.equal(runtime.continueDisabled, true)
  await runtime.pick(0, 0); await runtime.pick(0, 1)
  first.resolve(notice(a)); await runtime.settle()
  const rendered = runtime.nodes().find(node => node.type === 'NoticeBlocks')
  assert.ok(rendered)
  await runtime.agree(); assert.equal(runtime.continueDisabled, false)
  await runtime.proceed()
  assert.deepEqual(runtime.calls, ['nisp:2:1'])
  assert.equal(runtime.remembered[0].batch.id, 2)
})

test('price or notice changes during final confirmation clear the acknowledgement and do not navigate', async t => {
  const b = batch(3, 'A'); let count = 0
  const runtime = driver({ catalog: { subjects: [{ id: 'A', name: 'A' }], batches: [b] }, getNotice: async () => notice(b, ++count === 1 ? 'old' : 'new') })
  t.after(runtime.dispose)
  await runtime.settle(); await runtime.agree(); await runtime.proceed()
  assert.equal(runtime.continueDisabled, true)
  assert.deepEqual(runtime.calls, [])
  assert.deepEqual(runtime.remembered, [])
  assert.ok(runtime.nodes().some(node => node.props?.children === '须知、费用或批次要求已更新，请重新阅读并确认'))
})
