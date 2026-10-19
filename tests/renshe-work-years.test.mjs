import assert from 'node:assert/strict'
import test from 'node:test'
import { cumulativeWorkYears, workAnniversary } from '../src/utils/rensheWorkYears.ts'
import { validateEmploymentInfo } from '../src/utils/rensheEmployment.ts'
import { chinaDate } from '../src/utils/rensheGraduated.ts'

const experience = (start_date, end_date = null) => ({ work_unit: '真实单位', position: '实际岗位', occupation_name: '信息安全管理员', start_date, end_date })
const report = { has_work_experience: true, work_unit: '真实单位', social_insurance_unit: '真实单位', work_start_date: '2010-01-01', occupation_years: 6 }

test('calendar years merge duplicate periods and preserve gaps, inclusive ends and leap anniversaries', () => {
  const row = experience('2020-01-01', '2024-12-31')
  assert.equal(cumulativeWorkYears([row, row], '2025-01-01'), 5)
  assert.equal(cumulativeWorkYears([experience('2020-01-01', '2021-12-31'), experience('2023-01-01', '2024-12-31')], '2025-01-01'), 4)
  assert.equal(cumulativeWorkYears([row], '2025-01-01', '2023-01-01'), 2)
  assert.equal(workAnniversary('2020-02-29', 5), '2025-02-28')
  assert.ok(Number.isNaN(cumulativeWorkYears([experience('2025-01-02', '2025-01-01')], '2025-01-01')))
})

test('fourth-level work validates real effective periods rather than the declared number alone', () => {
  const start = workAnniversary(chinaDate(), -2)
  const qualification = { cultural_education: 'primary', work_experiences: [experience(start), experience(start)] }
  assert.match(validateEmploymentInfo(qualification, false, report), /去除重叠.*5年/)
  const valid = { ...qualification, work_experiences: [experience('2010-01-01')] }
  assert.equal(validateEmploymentInfo(valid, false, report), null)
  assert.match(validateEmploymentInfo(valid, false, { ...report, occupation_years: 1000 }), /不能超过/)
})

test('fourth-level compound counts only work after the fifth-level certificate', () => {
  const qualification = { cultural_education: 'primary', work_experiences: [experience('2010-01-01')], skill_certificate: { occupation_name: '信息安全管理员', grade: 5, certificate_number: 'L5', issued_on: workAnniversary(chinaDate(), -2) } }
  assert.match(validateEmploymentInfo(qualification, true, report), /证书取得后.*未满3年/)
  const valid = { ...qualification, skill_certificate: { ...qualification.skill_certificate, issued_on: workAnniversary(chinaDate(), -4) } }
  assert.equal(validateEmploymentInfo(valid, true, report), null)
  assert.match(validateEmploymentInfo(valid, false, report), /工龄型不使用技能证书/)
  assert.match(validateEmploymentInfo(valid, true, { ...report, occupation_years: 'NaN' }), /满3年/)
})
