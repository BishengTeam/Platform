import assert from 'node:assert/strict'
import test from 'node:test'
import { chinaDate, correctionAvailable, validateGraduatedFile, GRADUATED_RULE } from '../src/utils/rensheGraduated.ts'

test('graduated portrait enforces the exact 500 KB boundary and original format', () => {
  assert.equal(validateGraduatedFile('registration_portrait', 'photo.JPEG', 500 * 1024, ['.jpg', '.jpeg']), null)
  assert.match(validateGraduatedFile('registration_portrait', 'photo.jpg', 500 * 1024 + 1, ['.jpg']), /500 KB/)
  assert.match(validateGraduatedFile('education_report', '在读报告.jpg', 1000, ['.pdf']), /格式/)
  assert.match(validateGraduatedFile('graduation_certificate', 'diploma.png', 1000, ['.pdf', '.jpg', '.jpeg']), /格式/)
  assert.equal(validateGraduatedFile('graduation_certificate', 'diploma.pdf', 20 * 1024 * 1024, ['.pdf']), null)
})

test('graduation date uses the China date across UTC midnight', () => {
  assert.equal(chinaDate(new Date('2026-10-16T16:01:00Z')), '2026-10-17')
  assert.equal(chinaDate(new Date('2026-10-16T15:59:59Z')), '2026-10-16')
})

test('paid correction UX allows registration closure but respects deadline, freeze and cancellation', () => {
  const now = Date.parse('2026-10-16T02:00:00Z')
  const application = { status: 'initial_rejected', frozen_at: null, correction_due_at: '2026-10-17T02:00:00Z' }
  const plan = { status: 'registration_closed', renshe_config: { qualification_rule: GRADUATED_RULE } }
  assert.equal(correctionAvailable(application, plan, now), true)
  assert.equal(correctionAvailable({ ...application, correction_due_at: '2026-10-16T01:59:00Z' }, plan, now), false)
  assert.equal(correctionAvailable({ ...application, correction_due_at: null }, plan, now), false)
  assert.equal(correctionAvailable({ ...application, frozen_at: '2026-10-16T01:00:00Z' }, plan, now), false)
  assert.equal(correctionAvailable(application, { ...plan, status: 'cancelled' }, now), false)
})
