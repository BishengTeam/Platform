import assert from 'node:assert/strict'
import test from 'node:test'
import { H3C_REGISTRATION_TYPE_LABELS, isValidH3cPhone } from '../src/utils/h3cRegistration.ts'
import { correctionDeadlineState } from '../src/utils/correctionDeadline.ts'
import { nextCertificationTransition } from '../src/utils/certificationBatch.ts'

test('H3C registration type labels and mobile rules are consistent', () => {
  assert.deepEqual(H3C_REGISTRATION_TYPE_LABELS, { full: '全额报名', coupon: '考券报名', student: '学生报名' })
  for (const value of ['12345678901', '12345', 'abc', '12800138000', '１3800138000', '1380013800a']) {
    assert.equal(isValidH3cPhone(value), false, value)
  }
  for (const value of ['13800138000', '16600138000', '19900138000']) assert.equal(isValidH3cPhone(value), true)
})

test('correction deadline uses current request, Beijing display and exact expiry boundary', () => {
  const due = '2026-11-02T16:00:00Z'
  const registration = { status: 'rejected_awaiting_resubmission', resubmission_due_at: '2026-11-01T16:00:00Z',
    pending_correction: { due_at: due } }
  const before = correctionDeadlineState(registration, Date.parse(due) - 1)
  assert.equal(before.expired, false)
  assert.equal(before.label, '2026-11-03 00:00（北京时间）')
  const atExpiry = correctionDeadlineState(registration, Date.parse(due))
  assert.equal(atExpiry.expired, true)
  assert.match(atExpiry.message, /不能提交/)
  assert.equal(nextCertificationTransition([], Date.parse(due) - 1, [due]), Date.parse(due))
  assert.equal(nextCertificationTransition([], Date.parse(due), [due]), null)
})

test('legacy deadline falls back, missing dates do not invent expiry, other states hide notice', () => {
  const due = '2026-11-02T16:00:00Z'
  const registration = { status: 'rejected_awaiting_resubmission', resubmission_due_at: due }
  assert.equal(correctionDeadlineState(registration, Date.parse(due) + 1).expired, true)
  for (const value of [undefined, null, 'invalid']) {
    assert.equal(correctionDeadlineState({ ...registration, resubmission_due_at: value }).label, '待确认')
  }
  for (const status of ['pending_review', 'approved', 'refund_processing', 'refunded_closed', 'final_approved']) {
    assert.equal(correctionDeadlineState({ ...registration, status }), null)
  }
  assert.equal(correctionDeadlineState(null), null)
})
