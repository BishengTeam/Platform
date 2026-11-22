import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { SANGFOR_STATUS } from '../src/utils/sangforForm.ts'
import { createLatestGuard } from '../src/utils/latestRequest.ts'
import { correctionAvailability } from '../src/utils/correction.ts'
import { applyBookingOverview } from '../src/utils/examBookingOverview.ts'
import { bookingSubmitState } from '../src/utils/bookingSubmit.ts'

test('Sangfor status copy separates initial approval from external review', async () => {
  assert.match(SANGFOR_STATUS.approved, /待外审/)
  assert.equal(SANGFOR_STATUS.final_approved, '外审通过')
  assert.equal(SANGFOR_STATUS.pending_payment, '待付款')

  const registrations = await readFile('src/pages/mine/registrations.tsx', 'utf8')
  assert.match(registrations, /approved: 'active'/)
  assert.match(registrations, /final_approved: 'passed'/)
})

test('exam booking loads schedules, bookings, dates, notice, slots and attachments independently', async () => {
  const page = await readFile('src/pages/h3c/exam-booking/index.tsx', 'utf8')

  assert.match(page, /Promise\.allSettled\(\[/)
  assert.match(page, /setScheduleError\(/)
  assert.match(page, /setBookingError\(/)
  assert.match(page, /const loadDates = useCallback/)
  assert.match(page, /const loadSlots = useCallback/)
  assert.match(page, /const loadNotice = useCallback/)
  assert.match(page, /重试日期/)
  assert.match(page, /重试时段/)
  assert.match(page, /重试注意事项/)
  assert.match(page, /预约记录加载失败，可继续选择考场或稍后重试/)
  // 须知失败不得与日期绑定在同一 Promise.all 中
  assert.doesNotMatch(page, /Promise\.all\(\[\s*h3cService\.listExamDates/)
})

test('journey panel hides correction action after the deadline', async () => {
  const panel = await readFile('src/components/CertificationEnrollment/JourneyPanel.tsx', 'utf8')

  assert.match(panel, /const correctionOpen = Boolean\(/)
  assert.match(panel, /const correctionExpired = Boolean\(/)
  assert.match(panel, /补正已截止，如需修改请联系管理员/)
  assert.match(panel, /correctionOpen &&/)
})

test('sangfor form shows a blocking banner and disables editing for terminal states', async () => {
  const form = await readFile('src/pages/sangfor/form.tsx', 'utf8')

  assert.match(form, /const terminalBlocked =/)
  assert.match(form, /const blockReason =/)
  assert.match(form, /styles\.blockBanner/)
  assert.match(form, /disabled=\{submitting \|\| terminalBlocked\}/)
  assert.match(form, /返回报名详情/)
})

test('my registrations keeps per-vendor failures visible instead of showing an empty list', async () => {
  const page = await readFile('src/pages/mine/registrations.tsx', 'utf8')

  assert.match(page, /Promise\.allSettled\(\[/)
  assert.match(page, /sourceErrors/)
  assert.match(page, /报名加载失败，点击重试/)
  assert.doesNotMatch(page, /\.catch\(\(\) => \[\] as SangforRegistration\[\]\)/)
})

test('sangfor detail keeps journey as the only owner of actions and records', async () => {
  const detail = await readFile('src/pages/sangfor/detail.tsx', 'utf8')

  assert.doesNotMatch(detail, /审核记录/)
  assert.doesNotMatch(detail, /查看订单／付款进度/)
  assert.doesNotMatch(detail, /修改并提交补正/)
  assert.match(detail, /void loadExamBooking\(\)/)
  assert.match(detail, /预约信息加载失败，点击重试/)
})

test('late responses from a previously selected schedule are ignored', async () => {
  const guard = createLatestGuard()
  const applied = []
  const run = (token, value, delay) => new Promise(resolve => {
    setTimeout(() => {
      if (guard.isCurrent(token)) applied.push(value)
      resolve()
    }, delay)
  })
  const first = guard.next()
  const second = guard.next()
  await Promise.all([run(second, 'B', 5), run(first, 'A', 20)])
  assert.deepEqual(applied, ['B'])
})

test('correction availability requires a future deadline', () => {
  const now = Date.parse('2026-11-19T00:00:00Z')
  assert.equal(correctionAvailability('returned', '2026-11-20T00:00:00Z', now).open, true)
  assert.equal(correctionAvailability('returned', '2026-11-18T00:00:00Z', now).expired, true)
  assert.deepEqual(
    correctionAvailability('returned', null, now),
    { open: false, expired: false, missingDue: true },
  )
  assert.equal(correctionAvailability('approved', '2026-11-20T00:00:00Z', now).open, false)
})

test('exam booking ignores stale responses and blocks submit while booking state is unknown', async () => {
  const [page, submit] = await Promise.all([
    readFile('src/pages/h3c/exam-booking/index.tsx', 'utf8'),
    readFile('src/utils/bookingSubmit.ts', 'utf8'),
  ])

  assert.match(page, /const datesGuard = useRef\(createLatestGuard\(\)\)/)
  assert.match(page, /const slotsGuard = useRef\(createLatestGuard\(\)\)/)
  assert.match(page, /const noticeGuard = useRef\(createLatestGuard\(\)\)/)
  assert.match(page, /const attachmentsGuard = useRef\(createLatestGuard\(\)\)/)
  assert.match(page, /datesGuard\.current\.isCurrent\(token\)/)
  assert.match(page, /setNotice\(''\)/)
  assert.match(page, /bookingError \|\| bookingLoading/)
  assert.match(submit, /预约状态未确认，请先重试/)
  assert.match(page, /const overviewGuard = useRef\(createLatestGuard\(\)\)/)
  assert.match(page, /overviewGuard\.current\.invalidate\(\)/)
  assert.match(page, /overviewGuard\.current\.isCurrent\(token\)/)
  assert.match(page, /bookingSubmitState\(\{/)
})

test('stale overview response cannot clear the just-created booking', () => {
  const guard = createLatestGuard()
  const booking = { id: 9, registration_id: 7, status: 'booked' }
  let state = { bookings: [], optimistic: null }
  const apply = (token, rows, optimistic) => {
    if (!guard.isCurrent(token)) return
    state = applyBookingOverview(rows, 7, optimistic)
  }

  const stale = guard.next()
  const fresh = guard.next()
  apply(fresh, [booking], booking)
  apply(stale, [], null)

  assert.deepEqual(state.bookings, [booking])
  assert.deepEqual(state.optimistic, booking)
})

test('submit stays disabled while booking state is loading or unknown', () => {
  const base = { hasSelectedSlot: true, hasCurrentBooking: false, submitting: false, bookingError: '', bookingLoading: false }
  assert.equal(bookingSubmitState(base).disabled, false)
  assert.deepEqual(bookingSubmitState({ ...base, bookingLoading: true }), {
    disabled: true, label: '正在确认预约状态…',
  })
  assert.deepEqual(bookingSubmitState({ ...base, bookingError: 'x' }), {
    disabled: true, label: '预约状态未确认，请先重试',
  })
})

test('sangfor form reuses the shared correction rule and server clock', async () => {
  const form = await readFile('src/pages/sangfor/form.tsx', 'utf8')

  assert.match(form, /correctionAvailability\(/)
  assert.match(form, /const correctionAllowed = correction\.open/)
  assert.match(form, /serverNow\(\)/)
})

test('my registrations shows offline reconciliation next to the Sangfor status', async () => {
  const page = await readFile('src/pages/mine/registrations.tsx', 'utf8')

  assert.match(page, /凭证待核账/)
  assert.match(page, /payment_summary\?\.offline_status/)
})

test('sangfor form opens the agreement preview directly', async () => {
  const form = await readFile('src/pages/sangfor/form.tsx', 'utf8')
  const agreementLine = form.split('\n').find(line => line.includes('《认证报名信息处理授权协议》'))

  assert.ok(agreementLine, 'agreement link missing')
  // 点击协议文字必须直接进协议页；签署闸门在已签署/查询失败时会静默返回，表现为点击无反应
  assert.match(agreementLine, /Taro\.navigateTo/)
  assert.match(agreementLine, /AGREEMENT_VIEW\}\?type=cert_registration&requireSign=1/)
  assert.doesNotMatch(agreementLine, /ensureAgreementSigned/)
  // 提交前的签署闸门保留
  assert.match(form, /await ensureAgreementSigned\('cert_registration'/)
})

test('sangfor form keeps the page still when a field gets focus', async () => {
  const form = await readFile('src/pages/sangfor/form.tsx', 'utf8')

  // 关掉系统整体上推页面，改为滚动内部 ScrollView
  assert.match(form, /adjustPosition=\{false\}/)
  assert.match(form, /onFocus=\{\(\) => focusField\(key\)\}/)
  assert.match(form, /setScrollTarget\(`sangfor-\$\{key\}`\)/)
})
