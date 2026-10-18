import assert from 'node:assert/strict'
import test from 'node:test'
import { chinaDate, correctionAvailable, validateGraduatedFile, validateReportingInfo, validateDegreeEducation, GRADUATED_RULE } from '../src/utils/rensheGraduated.ts'

test('standard package materials enforce declared formats and size boundaries', () => {
  assert.equal(validateGraduatedFile('registration_portrait', 'photo.jpeg', 500 * 1024, ['.jpg', '.jpeg']), null)
  assert.match(validateGraduatedFile('registration_portrait', 'photo.jpeg', 500 * 1024 + 1, ['.jpg', '.jpeg']), /500 KB/)
  assert.equal(validateGraduatedFile('social_security_proof', '社保证明.pdf', 20 * 1024 * 1024, ['.pdf']), null)
  assert.match(validateGraduatedFile('social_security_proof', '社保证明.jpg', 1000, ['.pdf']), /格式/)
  assert.match(validateGraduatedFile('social_security_proof', '社保证明.pdf', 20 * 1024 * 1024 + 1, ['.pdf']), /大小/)
  assert.equal(validateGraduatedFile('vocational_qualification_certificate', '职业资格证书.jpeg', 10 * 1024 * 1024, ['.jpg', '.jpeg']), null)
  assert.match(validateGraduatedFile('professional_title_certificate', '职称证书.pdf', 1000, ['.jpg', '.jpeg']), /格式/)
})

test('graduation date uses the China date across UTC midnight', () => {
  assert.equal(chinaDate(new Date('2026-10-16T16:01:00Z')), '2026-10-17')
  assert.equal(chinaDate(new Date('2026-10-16T15:59:59Z')), '2026-10-16')
})

test('degree eligibility respects trade-specific institutions and the actual education level', () => {
  const all = { education_levels: ['primary', 'secondary_vocational', 'technical_school', 'bachelor'], institution_types: ['technical', 'vocational', 'general_higher'] }
  assert.equal(validateDegreeEducation({ education: 'bachelor', institution_type: 'general_higher' }, all), null)
  assert.match(validateDegreeEducation({ education: 'primary', institution_type: 'vocational' }, all), /不属于/)
  assert.match(validateDegreeEducation({ education: 'secondary_vocational', institution_type: 'general_higher' }, all), /专科及以上/)
  const ai = { ...all, institution_types: ['technical', 'vocational'] }
  assert.match(validateDegreeEducation({ education: 'bachelor', institution_type: 'general_higher' }, ai), /院校类型/)
  assert.equal(validateDegreeEducation({ education: 'technical_school', institution_type: 'technical' }, ai), null)
})

const reportingOptions = {
  occupations: ['职工', '失业人员', '其他'], ethnicities: ['汉族'], political_statuses: ['群众'],
  employment_reporting: { confirmed: true, date_rule: 'work_or_enrollment', years_rule: 'required', allow_zero_years: true },
}
const reporting = { occupation_status: '失业人员', ethnicity: '汉族', political_status: '群众', has_work_experience: false, enrollment_date: '2019-09-01', occupation_years: 0 }
test('reporting requires actual occupation and complete dictionaries without guessing blank years as zero', () => {
  assert.equal(validateReportingInfo(reporting, reportingOptions), null)
  assert.match(validateReportingInfo({ ...reporting, occupation_status: '已毕业' }, reportingOptions), /从事职业/)
  assert.match(validateReportingInfo({ ...reporting, ethnicity: '' }, reportingOptions), /民族/)
  assert.match(validateReportingInfo({ ...reporting, political_status: '' }, reportingOptions), /政治面貌/)
  assert.match(validateReportingInfo({ ...reporting, has_work_experience: undefined }, reportingOptions), /工作/)
  assert.match(validateReportingInfo({ ...reporting, occupation_years: '' }, reportingOptions), /职业年限/)
})
test('reporting validates confirmed date rules and never substitutes a graduation date', () => {
  assert.match(validateReportingInfo({ ...reporting, enrollment_date: null, graduation_date: '2023-06-30' }, reportingOptions), /毕业日期不能替代/)
  assert.match(validateReportingInfo({ ...reporting, enrollment_date: '2023-02-30' }, reportingOptions), /有效/)
  assert.match(validateReportingInfo({ ...reporting, enrollment_date: '2999-01-01' }, reportingOptions), /今天/)
  assert.match(validateReportingInfo({ ...reporting, has_work_experience: true }, reportingOptions), /参加工作日期/)
  assert.match(validateReportingInfo(reporting, { ...reportingOptions, employment_reporting: { ...reportingOptions.employment_reporting, confirmed: false } }), /尚未确认/)
})
test('reporting respects explicitly confirmed optional columns and zero-year rules', () => {
  const employment_reporting = { confirmed: true, date_rule: 'optional', years_rule: 'optional', allow_zero_years: false }
  const options = { ...reportingOptions, employment_reporting }
  assert.equal(validateReportingInfo({ ...reporting, enrollment_date: null, occupation_years: null }, options), null)
  assert.match(validateReportingInfo(reporting, options), /零年限/)
  assert.match(validateReportingInfo({ ...reporting, occupation_years: 2 }, reportingOptions), /尚未工作/)
  assert.equal(validateReportingInfo({ ...reporting, has_work_experience: true, work_start_date: '2020-01-01', occupation_years: '3.25' }, options), null)
  assert.match(validateReportingInfo({ ...reporting, has_work_experience: true, work_start_date: '2020-01-01', occupation_years: '3.255' }, options), /两位小数/)
})

test('current reporting requires a real work date and years while allowing zero', () => {
  const options = { ...reportingOptions, employment_reporting: { confirmed: true, date_rule: 'work_only', years_rule: 'required', allow_zero_years: true } }
  const worker = { ...reporting, has_work_experience: true, work_start_date: '2022-09-21', occupation_years: 0 }
  assert.equal(validateReportingInfo(worker, options), null)
  assert.match(validateReportingInfo({ ...worker, occupation_years: null }, options), /职业年限/)
  assert.match(validateReportingInfo({ ...reporting, enrollment_date: '2019-09-01' }, options), /毕业日期不能替代/)
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
