import type { RensheEducationInfo, RensheReportingInfo, RensheReportingOptions } from '../services/rensheService.ts'

export const GRADUATED_RULE = 'related_major_graduated_degree_v1'
export const EMPLOYMENT_RULE = 'documented_employment_v1'
export const LEVEL_FIVE_EMPLOYMENT_RULE = 'level_five_employment_v1'
export const LEVEL_THREE_RULE = 'level_three_v1'
export function isEmploymentRule(rule?: string): boolean {
  return rule === EMPLOYMENT_RULE || rule === LEVEL_FIVE_EMPLOYMENT_RULE || rule === LEVEL_THREE_RULE
}
export function isSelfReportedRule(rule?: string): boolean {
  return rule === GRADUATED_RULE || isEmploymentRule(rule)
}
export const INSTITUTION_LABELS: Record<string, string> = {
  technical: '技工院校', vocational: '中等及以上职业院校', general_higher: '普通高等学校（专科及以上）',
}
export const EDUCATION_LABELS: Record<string, string> = {
  primary: '小学', junior_high: '初中', senior_high: '高中', other: '其他',
  secondary_vocational: '中专', technical_school: '技校', vocational_high: '职高', higher_vocational: '高职', associate: '大专', bachelor: '大学本科', master: '硕士', doctorate: '博士',
}
export const CHANGE_LABELS: Record<string, string> = {
  'qualification_info.admission_path': '三级具体申报路径',
  'education_info.training_level': '技工院校培养层次', 'education_info.evaluation_reference': '院校评估论证依据',
  'qualification_info.title_certificate.title_name': '初级职称名称', 'qualification_info.title_certificate.level': '职称等级',
  'qualification_info.title_certificate.major': '职称专业', 'qualification_info.title_certificate.certificate_number': '职称证书编号', 'qualification_info.title_certificate.issued_on': '职称取得日期',
  work_proof: '工龄证明',
  'qualification_info.cultural_education': '文化程度', 'qualification_info.work_experiences': '工作经历',
  'qualification_info.skill_certificate.occupation_name': '证书职业／工种',
  'qualification_info.skill_certificate.grade': '证书等级',
  'qualification_info.skill_certificate.certificate_number': '证书编号',
  'qualification_info.skill_certificate.issued_on': '证书取得日期',
  'reporting_info.occupation_status': '从事职业', 'reporting_info.ethnicity': '民族', 'reporting_info.political_status': '政治面貌',
  'reporting_info.has_work_experience': '工作经历', 'reporting_info.work_start_date': '参加工作日期', 'reporting_info.enrollment_date': '入学日期',
  'reporting_info.occupation_years': '职业年限', 'reporting_info.work_unit': '工作单位', 'reporting_info.social_insurance_unit': '社保参保单位',
  'education_info.school': '毕业院校', 'education_info.institution_type': '院校类型',
  'education_info.education': '学历层次', 'education_info.major': '所学专业',
  'education_info.graduation_date': '毕业日期', 'education_info.certificate_number': '毕业证书编号',
  contact_phone: '手机号', email: '邮箱', mailing_address: '通讯地址',
  id_card_front: '身份证正面', id_card_back: '身份证背面', portrait: '二寸免冠照片（需实名更正）',
  registration_portrait: '一寸白底证件照（≤500 KB）', graduation_certificate: '毕业证', education_report: '学信网学历备案表',
  social_security_proof: '社保缴费证明', xuexin_registration: '学信网电子注册表', education_proof: '学历证明',
  vocational_qualification_certificate: '职业资格证书', professional_title_certificate: '职称证书', commitment_letter: '承诺书',
}
export function chinaDate(now = new Date()): string {
  return new Date(now.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10)
}
export function validateDegreeEducation(info: Partial<RensheEducationInfo>, options: Pick<RensheReportingOptions, 'education_levels' | 'institution_types'>): string | null {
  if (!options.education_levels.includes(info.education || '') || !options.institution_types.includes(info.institution_type || '')) return '请选择本批次支持的学历层次及院校类型'
  if (['primary', 'junior_high', 'senior_high', 'other'].includes(info.education || '')) return '该文化程度不属于本期已毕业学历型支持范围，请联系管理员'
  if (info.institution_type === 'general_higher' && !['higher_vocational', 'associate', 'bachelor', 'master', 'doctorate'].includes(info.education || '')) return '普通高等学校须为专科及以上学历'
  return null
}
export function validateReportingInfo(info: Partial<RensheReportingInfo>, options: RensheReportingOptions): string | null {
  if (!options.occupations.includes(info.occupation_status || '') || !options.ethnicities.includes(info.ethnicity || '') || !options.political_statuses.includes(info.political_status || '') || typeof info.has_work_experience !== 'boolean') return '请选择从事职业、民族、政治面貌及是否参加过工作'
  const rules = options.employment_reporting
  if (!rules.confirmed) return '本批次报送要求尚未确认，请联系管理员'
  for (const value of [info.work_start_date, info.enrollment_date]) {
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value || value < '1900-01-01' || value > chinaDate())) return '请填写有效且不晚于今天的工作／入学日期'
  }
  if (rules.work_date_required !== false && info.has_work_experience && !info.work_start_date) return '请填写真实参加工作日期'
  if (!info.has_work_experience && info.work_start_date) return '未参加过工作时不能填写参加工作日期'
  if (rules.work_date_required !== false && ((rules.date_rule === 'work_only' && !info.work_start_date) || (rules.date_rule === 'enrollment_only' && !info.enrollment_date) || (rules.date_rule === 'work_or_enrollment' && !info.work_start_date && !info.enrollment_date))) return '请按批次要求填写参加工作日期或入学日期；毕业日期不能替代'
  const years = info.occupation_years
  if (years === '' || years == null) return rules.years_rule === 'required' ? '请填写实际职业年限' : null
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(String(years)) || (!info.has_work_experience && Number(years) !== 0)) return '请填写真实职业年限，最多保留两位小数；尚未工作时不能填写正年限'
  if (Number(years) === 0 && !rules.allow_zero_years) return '本批次未确认接受零年限，请联系管理员，不要填写虚假年限'
  return null
}
export function validateGraduatedFile(kind: string, filename: string, size: number, extensions: string[]): string | null {
  const extension = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || ''
  if (!extensions.includes(extension)) return `请使用 ${extensions.join(' / ')} 格式`
  const maximum = kind === 'registration_portrait' ? 500 * 1024 : extension === '.pdf' ? 20 * 1024 * 1024 : 10 * 1024 * 1024
  if (size <= 0 || size > maximum) return kind === 'registration_portrait' ? '一寸白底证件照须不超过500 KB' : '文件为空或超过大小限制（图片10 MB、PDF20 MB）'
  return null
}
export function correctionAvailable(application: { status: string; frozen_at: string | null; correction_due_at?: string | null }, plan: { status: string; renshe_config?: { qualification_rule?: string } | null }, now = Date.now()): boolean {
  if (!['initial_rejected', 'external_rejected'].includes(application.status) || application.frozen_at) return false
  if (!isSelfReportedRule(plan.renshe_config?.qualification_rule)) return true
  return ['published', 'registration_closed'].includes(plan.status) && Boolean(application.correction_due_at && Date.parse(application.correction_due_at) >= now)
}
