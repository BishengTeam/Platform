import assert from 'node:assert/strict'
import test from 'node:test'
import { validateEmploymentInfo } from '../src/utils/rensheEmployment.ts'
import { correctionAvailable, EMPLOYMENT_RULE, LEVEL_FIVE_EMPLOYMENT_RULE, isSelfReportedRule, isEmploymentRule } from '../src/utils/rensheGraduated.ts'

const qualification = {
  cultural_education: 'primary',
  work_experiences: [{ work_unit: '实际单位', position: '安全管理', occupation_name: '信息安全管理员', start_date: '2018-01-01', end_date: null }],
}
const report = { has_work_experience: true, work_unit: '实际单位', social_insurance_unit: '实际单位', work_start_date: '2018-01-01', occupation_years: 6 }

test('fifth-level employment is a separate self-reported rule without fourth-level year or certificate requirements', () => {
  assert.equal(isEmploymentRule(LEVEL_FIVE_EMPLOYMENT_RULE), true)
  assert.equal(isSelfReportedRule(LEVEL_FIVE_EMPLOYMENT_RULE), true)
  assert.equal(validateEmploymentInfo(qualification, false, { ...report, occupation_years: 0 }, true), null)
  assert.match(validateEmploymentInfo(qualification, false, { ...report, occupation_years: 0 }), /5年/)
  assert.match(validateEmploymentInfo(qualification, true, report, true), /不提供复合型/)
  assert.match(validateEmploymentInfo(qualification, false, { ...report, social_insurance_unit: '' }, true), /社保/)
})
test('work path accepts actual cultural education without a degree but requires real work and social data', () => {
  assert.equal(validateEmploymentInfo(qualification, false, report), null)
  assert.match(validateEmploymentInfo(qualification, false, { ...report, social_insurance_unit: '' }), /社保/)
  assert.match(validateEmploymentInfo(qualification, false, { ...report, occupation_years: 4 }), /5年/)
  assert.match(validateEmploymentInfo({ ...qualification, cultural_education: '' }, false, report), /文化程度/)
})
test('periods cannot be reversed, incomplete, future or inconsistent with the real work start', () => {
  assert.match(validateEmploymentInfo({ ...qualification, work_experiences: [] }, false, report), /工作经历/)
  assert.match(validateEmploymentInfo({ ...qualification, work_experiences: [{ ...qualification.work_experiences[0], end_date: '2017-01-01' }] }, false, report), /起止日期/)
  assert.match(validateEmploymentInfo({ ...qualification, work_experiences: [{ ...qualification.work_experiences[0], start_date: '2999-01-01' }] }, false, report), /起止日期/)
  assert.match(validateEmploymentInfo(qualification, false, { ...report, work_start_date: '2020-01-01' }), /最早开始日期/)
})
test('compound path requires the complete fifth-level certificate, not merely an attachment', () => {
  assert.match(validateEmploymentInfo(qualification, true, report), /五级证书/)
  const skilled = { ...qualification, skill_certificate: { occupation_name: '信息安全管理员', grade: 5, certificate_number: 'TEST-1', issued_on: '2020-01-01' } }
  assert.equal(validateEmploymentInfo(skilled, true, report), null)
  assert.match(validateEmploymentInfo({ ...skilled, skill_certificate: { ...skilled.skill_certificate, issued_on: '2999-01-01' } }, true, report), /取得日期/)
})
test('paid work corrections respect deadline, refund freeze and closed batches', () => {
  const app = { status: 'initial_rejected', frozen_at: null, correction_due_at: '2026-10-19T00:00:00Z' }
  const plan = { status: 'registration_closed', renshe_config: { qualification_rule: EMPLOYMENT_RULE } }
  const now = Date.parse('2026-10-18T00:00:00Z')
  assert.equal(correctionAvailable(app, plan, now), true)
  assert.equal(correctionAvailable({ ...app, correction_due_at: null }, plan, now), false)
  assert.equal(correctionAvailable({ ...app, frozen_at: '2026-10-18T00:00:00Z' }, plan, now), false)
  assert.equal(correctionAvailable(app, { ...plan, status: 'cancelled' }, now), false)
})
