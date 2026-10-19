import assert from 'node:assert/strict'
import test from 'node:test'
import { levelFiveAgeBasis, validateLevelFiveAge } from '../src/utils/rensheLevelFive.ts'
import { validateEmploymentInfo } from '../src/utils/rensheEmployment.ts'
import { chinaDate } from '../src/utils/rensheGraduated.ts'

const now = new Date('2026-10-19T08:00:00Z')

test('five-level age uses verified birth and admits the sixteenth birthday without a self-entered age', () => {
  assert.equal(validateLevelFiveAge('2010-10-19', [], now), null)
  assert.match(validateLevelFiveAge('2010-10-20', [], now), /年满16周岁/)
  assert.match(validateLevelFiveAge(null, [], now), /实名更正/)
  assert.match(validateLevelFiveAge('2010-02-30', [], now), /出生日期/)
  assert.match(validateLevelFiveAge('2999-01-01', [], now), /出生日期/)
})

test('corrections preserve the earliest formal China submission date, not draft creation or latest submission', () => {
  const versions = [{ submitted_at: '2026-10-22T08:00:00Z' }, { submitted_at: '2026-10-18T16:00:00Z' }]
  const later = new Date('2026-10-23T08:00:00Z')
  assert.equal(levelFiveAgeBasis(versions, later), '2026-10-19')
  assert.equal(validateLevelFiveAge('2010-10-19', versions, later), null)
  assert.match(validateLevelFiveAge('2010-10-20', versions, later), /首次正式提交当日未满16周岁/)
  assert.equal(levelFiveAgeBasis([{ submitted_at: '2026-10-18T16:00:00' }], now), '2026-10-19')
  assert.match(validateLevelFiveAge('1990-01-01', [{ submitted_at: 'invalid' }], now), /时间异常/)
})

test('five-level only needs real work, not three or five full years, and accepts zero on the first workday', () => {
  const today = chinaDate()
  const info = { cultural_education: 'junior_high', work_experiences: [{ work_unit: '单位', position: '岗位', occupation_name: '信息安全管理员', start_date: today, end_date: null }] }
  const reporting = { has_work_experience: true, work_unit: '单位', social_insurance_unit: '单位', work_start_date: today, occupation_years: 0 }
  assert.equal(validateEmploymentInfo(info, false, reporting, true), null)
  assert.match(validateEmploymentInfo(info, false, reporting), /满5年/)
  assert.match(validateEmploymentInfo(info, true, reporting, true), /不提供复合型/)
  assert.match(validateEmploymentInfo(info, false, { ...reporting, social_insurance_unit: '' }, true), /社保/)
  assert.match(validateEmploymentInfo(info, false, { ...reporting, occupation_years: 1 }, true), /不能超过/)
})
