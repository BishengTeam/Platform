import assert from 'node:assert/strict'
import test from 'node:test'
import { validateLevelThreeInfo } from '../src/utils/rensheLevelThree.ts'
import { LEVEL_THREE_RULE, isSelfReportedRule } from '../src/utils/rensheGraduated.ts'

const work = { work_unit: '单位', position: '岗位', occupation_name: '信息安全管理员', start_date: '2010-01-01', end_date: null }
const report = { has_work_experience: true, work_unit: '单位', social_insurance_unit: '单位', work_start_date: '2010-01-01', occupation_years: 12 }
const info = { admission_path: 'work_10', cultural_education: 'associate', work_experiences: [work] }
const branch = { id: 'work_10', work: true, years: 10, condition: '', material_kinds: [] }

test('third-level self-reported work path requires ten years rather than four-level five', () => {
  assert.equal(isSelfReportedRule(LEVEL_THREE_RULE), true)
  assert.equal(validateLevelThreeInfo(info, branch, report, {}), null)
  assert.match(validateLevelThreeInfo(info, branch, { ...report, occupation_years: 5 }, {}), /10年/)
  assert.match(validateLevelThreeInfo(info, undefined, report, {}), /申报路径/)
})

test('skill and title paths collect distinct fourth-level and primary-title credentials', () => {
  const path = { ...branch, id: 'skill_4_work_4', skill: true, years: 4 }
  const skilled = { ...info, admission_path: path.id, skill_certificate: { occupation_name: '信息安全管理员', grade: 4, certificate_number: 'TEST', issued_on: '2019-01-01' } }
  assert.equal(validateLevelThreeInfo(skilled, path, report, {}), null)
  assert.match(validateLevelThreeInfo({ ...skilled, skill_certificate: { ...skilled.skill_certificate, grade: 5 } }, path, report, {}), /四级/)
  const titlePath = { ...branch, id: 'title_work_1', title: true, years: 1 }
  const titled = { ...info, admission_path: titlePath.id, title_certificate: { title_name: '助理工程师', level: 'primary', major: '信息安全', certificate_number: 'TITLE', issued_on: '2020-01-01' } }
  assert.equal(validateLevelThreeInfo(titled, titlePath, report, {}), null)
  assert.match(validateLevelThreeInfo({ ...titled, title_certificate: { ...titled.title_certificate, major: '' } }, titlePath, report, {}), /初级职称/)
})

test('degree paths verify senior technical training or institution evaluation and do not add work thresholds', () => {
  const path = { id: 'technical_senior', education: true, years: 0, condition: '', material_kinds: [] }
  const degree = { ...info, admission_path: path.id, work_experiences: [] }
  assert.match(validateLevelThreeInfo(degree, path, report, { institution_type: 'technical' }), /培养层次/)
  assert.equal(validateLevelThreeInfo(degree, path, { ...report, occupation_years: 0 }, { institution_type: 'technical', training_level: 'senior_worker' }), null)
  const evaluated = { ...path, id: 'evaluated_college' }
  const education = { institution_type: 'vocational', education: 'higher_vocational' }
  assert.match(validateLevelThreeInfo({ ...degree, admission_path: evaluated.id }, evaluated, report, education), /评估论证/)
  assert.equal(validateLevelThreeInfo({ ...degree, admission_path: evaluated.id }, evaluated, report, { ...education, evaluation_reference: '备案机构核验依据' }), null)
})
