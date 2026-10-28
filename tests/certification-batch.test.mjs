import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { assertCertificationBatchOpen, certificationBatchState, formatCertificationApplyRange, nextCertificationTransition } from '../src/utils/certificationBatch.ts'
import { correctionAvailable, GRADUATED_RULE } from '../src/utils/rensheGraduated.ts'

const start = Date.parse('2026-11-19T00:00:00+08:00')
const end = Date.parse('2026-11-20T00:00:00+08:00')
const batch = { status: 'published', apply_start: new Date(start).toISOString(), apply_end: new Date(end).toISOString(), remaining_count: 10 }

test('all vendors use a start-inclusive, end-exclusive registration window', () => {
  for (const vendor of ['h3c', 'nisp', 'renshe', 'sangfor']) {
    const value = { ...batch, vendor }
    assert.equal(certificationBatchState(value, start - 1).state, 'upcoming')
    assert.equal(certificationBatchState(value, start).canApply, true)
    assert.equal(certificationBatchState(value, end - 1).canApply, true)
    assert.equal(certificationBatchState(value, end).state, 'closed')
    assert.equal(certificationBatchState(value, end + 12 * 3600000).visible, false)
  }
})

test('manual closures, missing schedules and invalid windows cannot become registerable', () => {
  for (const change of [{ status: 'draft' }, { status: 'registration_closed' }, { status: 'finalized' }, { status: 'cancelled' }, { status: 'archived' }, { apply_start: null }, { apply_end: null }, { apply_end: 'invalid' }, { apply_end: batch.apply_start }, { apply_start: batch.apply_end }, { can_apply: false }]) {
    assert.equal(certificationBatchState({ ...batch, ...change }, start).canApply, false, JSON.stringify(change))
  }
  assert.equal(certificationBatchState(null).visible, false)
})

test('capacity representations agree without treating unlimited batches as full', () => {
  assert.equal(certificationBatchState({ ...batch, remaining_count: 0 }, start).state, 'full')
  assert.equal(certificationBatchState({ ...batch, remaining_count: -1 }, start).canApply, true)
  assert.equal(certificationBatchState({ ...batch, remaining_count: undefined, capacity: 0, enrolled: 99 }, start).canApply, true)
  assert.equal(certificationBatchState({ ...batch, remaining_count: undefined, capacity: 10, enrolled: 10 }, start).state, 'full')
  assert.equal(certificationBatchState({ ...batch, remaining_count: 0 }, end).state, 'closed')
})

test('click and final submission guards read current time rather than a rendered boolean', t => {
  let current = end - 1
  t.mock.method(Date, 'now', () => current)
  assert.doesNotThrow(() => assertCertificationBatchOpen(batch))
  current = end
  assert.throws(() => assertCertificationBatchOpen(batch), /报名已截止/)
})

test('midnight display preserves the exact Beijing date and time', () => {
  assert.equal(formatCertificationApplyRange(batch), '2026-11-19 00:00 至 2026-11-20 00:00（北京时间）')
  assert.equal(formatCertificationApplyRange({ apply_start: null, apply_end: null }), '以批次安排为准')
})

test('transition scheduling includes opening, closing and separate correction deadlines', () => {
  const correction = new Date(end + 86400000).toISOString()
  assert.equal(nextCertificationTransition([batch], start - 1), start)
  assert.equal(nextCertificationTransition([batch], start), end)
  assert.equal(nextCertificationTransition([batch], end), null)
  assert.equal(nextCertificationTransition([batch], end, [correction]), end + 86400000)
  assert.equal(nextCertificationTransition([{ ...batch, status: 'cancelled' }], start - 1), null)
})

test('new enrollment closing does not close a separately authorized correction window', () => {
  const plan = { ...batch, status: 'registration_closed', renshe_config: { qualification_rule: GRADUATED_RULE } }
  const application = { status: 'initial_rejected', frozen_at: null, correction_due_at: new Date(end + 86400000).toISOString() }
  assert.equal(certificationBatchState(plan, end + 1).canApply, false)
  assert.equal(correctionAvailable(application, plan, end + 1), true)
  assert.equal(correctionAvailable(application, plan, end + 86400001), false)
  assert.equal(correctionAvailable({ ...application, frozen_at: batch.apply_end }, plan, end + 1), false)
})

// Small hook driver isolates Taro lifecycle events and timer scheduling without a native runtime.
function clockDriver(t, initialBatches, initialTime, deadlines = []) {
  let current = initialTime, cursor = 0, dirty = false, show, hide, data = initialBatches, value, refreshes = 0
  const slots = [], timers = new Map(), effects = []
  let timerId = 0
  t.mock.method(Date, 'now', () => current)
  const react = {
    useState(initial) {
      const key = cursor++
      slots[key] ??= { value: typeof initial === 'function' ? initial() : initial }
      return [slots[key].value, next => { const result = typeof next === 'function' ? next(slots[key].value) : next; if (result !== slots[key].value) { slots[key].value = result; dirty = true } }]
    },
    useRef(initial) { const key = cursor++; slots[key] ??= { current: initial }; return slots[key] },
    useEffect(action, deps) {
      const key = cursor++, previous = slots[key]
      if (!previous || deps.some((dep, index) => !Object.is(dep, previous.deps[index]))) {
        previous?.cleanup?.(); slots[key] = { deps }; effects.push(() => { slots[key].cleanup = action() })
      }
    },
  }
  const source = ts.transpileModule(readFileSync('src/hooks/useCertificationBatchClock.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', source)(name => {
    if (name === 'react') return react
    if (name === '@tarojs/taro') return { useDidShow(callback) { show = callback }, useDidHide(callback) { hide = callback } }
    return { nextCertificationTransition }
  }, module, module.exports, (callback, delay) => { timers.set(++timerId, { callback, at: current + delay }); return timerId }, id => timers.delete(id))
  function render() {
    do { dirty = false; cursor = 0; value = module.exports.useCertificationBatchClock(data, () => { refreshes++ }, true, deadlines); while (effects.length) effects.shift()() } while (dirty)
  }
  render()
  const driver = {
    get now() { return value }, get refreshes() { return refreshes }, get timerCount() { return timers.size },
    show() { show(); render() }, hide() { hide(); render() },
    advance(time) { current = time; for (const [id, timer] of [...timers]) if (timer.at <= time) { timers.delete(id); timer.callback() } render() },
    replace(batches) { data = batches; render() },
    unmount() { for (const slot of slots) slot?.cleanup?.() },
  }
  t.after(() => driver.unmount())
  return driver
}

test('staying on the page crosses midnight, refreshes once and makes the expired card disappear', async t => {
  const clock = clockDriver(t, [batch], end - 1000)
  clock.show()
  assert.equal(clock.refreshes, 0, 'initial page loader owns the first request')
  clock.advance(end + 1)
  await Promise.resolve(); await Promise.resolve()
  assert.equal(clock.refreshes, 1)
  assert.equal(certificationBatchState(batch, clock.now).visible, false)
  assert.equal(clock.timerCount, 0)
})

test('hidden pages stop timers and returning refreshes time and availability', async t => {
  const clock = clockDriver(t, [batch], end - 1000)
  clock.show(); clock.hide()
  assert.equal(clock.timerCount, 0)
  clock.advance(end + 1)
  assert.equal(clock.refreshes, 0)
  clock.show()
  await Promise.resolve(); await Promise.resolve()
  assert.equal(clock.refreshes, 1)
  assert.equal(certificationBatchState(batch, clock.now).canApply, false)
})

test('deadline edits replace the timer and unmount cancels pending work', async t => {
  const clock = clockDriver(t, [batch], end - 1000)
  clock.replace([{ ...batch, apply_end: new Date(end + 10000).toISOString() }])
  clock.advance(end + 1)
  await Promise.resolve()
  assert.equal(clock.refreshes, 0)
  assert.equal(clock.timerCount, 1)
  clock.unmount()
  assert.equal(clock.timerCount, 0)
})

test('a correction deadline still triggers a refresh after the public batch has closed', async t => {
  const due = end + 1000
  const clock = clockDriver(t, [{ ...batch, status: 'registration_closed' }], end, [new Date(due).toISOString()])
  clock.show(); clock.advance(due + 1)
  await Promise.resolve(); await Promise.resolve()
  assert.equal(clock.refreshes, 1)
})
