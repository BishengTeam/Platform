import type { RensheEmploymentInfo, RensheReportingInfo } from '../services/rensheService.ts'
import { chinaDate } from './rensheGraduated.ts'

export function validateEmploymentInfo(info: RensheEmploymentInfo, compound: boolean, reporting: Partial<RensheReportingInfo>, levelFive = false): string | null {
  if (levelFive && compound) return '五级不提供复合型路径'
  if (!info.cultural_education) return '请选择本人实际文化程度'
  if (!reporting.has_work_experience || !reporting.work_unit?.trim() || !reporting.social_insurance_unit?.trim()) return '工龄或证书路径须填写真实工作及社保参保单位'
  if (!info.work_experiences.length || info.work_experiences.length > 20) return '请填写1至20段相关职业工作经历'
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value && value >= '1900-01-01' && value <= chinaDate()
  for (const item of info.work_experiences) {
    if (![item.work_unit, item.position, item.occupation_name].every(value => value.trim())) return '请完整填写每段工作经历的单位、岗位及职业'
    if (!validDate(item.start_date) || (item.end_date !== null && (!validDate(item.end_date) || item.end_date < item.start_date))) return '请填写有效的工作起止日期，结束日期不得早于开始日期或晚于今天'
  }
  if (!reporting.work_start_date || info.work_experiences.some(item => item.start_date < reporting.work_start_date!)) return '参加工作日期不能晚于所填经历的最早开始日期'
  if (compound && (!info.skill_certificate?.occupation_name.trim() || !info.skill_certificate.certificate_number.trim() || info.skill_certificate.grade !== 5 || !validDate(info.skill_certificate.issued_on))) return '请完整填写五级证书的职业、编号及真实取得日期'
  if (reporting.occupation_years == null || Number(reporting.occupation_years) < (levelFive ? 0 : compound ? 3 : 5)) return compound ? '本复合型路径要求证书取得后累计相关工作满3年' : '本工龄型路径要求累计相关工作满5年'
  return null
}
