import type { RensheAdmissionPath, RensheEducationInfo, RensheEmploymentInfo, RensheReportingInfo } from '../services/rensheService.ts'
import { chinaDate } from './rensheGraduated.ts'

export function validateLevelThreeInfo(info: RensheEmploymentInfo, path: RensheAdmissionPath | undefined, report: Partial<RensheReportingInfo>, education: Partial<RensheEducationInfo>): string | null {
  if (!path || info.admission_path !== path.id) return '请选择具体三级申报路径'
  if (!info.cultural_education) return '请选择本人实际文化程度'
  const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v && v >= '1900-01-01' && v <= chinaDate()
  if (path.skill && (!info.skill_certificate?.occupation_name.trim() || !info.skill_certificate.certificate_number.trim() || info.skill_certificate.grade !== 4 || !validDate(info.skill_certificate.issued_on))) return '请完整填写四级／中级工技能证书信息'
  if (path.title && (!info.title_certificate?.title_name.trim() || !info.title_certificate.major.trim() || info.title_certificate.level !== 'primary' || !info.title_certificate.certificate_number.trim() || !validDate(info.title_certificate.issued_on))) return '请完整填写初级职称名称、专业、证书编号及取得日期'
  if (path.work) {
    if (!report.has_work_experience || !report.work_unit?.trim() || !report.social_insurance_unit?.trim() || !info.work_experiences.length) return '本路径须填写工作经历、工作单位及社保参保单位'
    if (info.work_experiences.some(item => !item.work_unit.trim() || !item.position.trim() || !item.occupation_name.trim() || !validDate(item.start_date) || (item.end_date !== null && (!validDate(item.end_date) || item.end_date < item.start_date)))) return '请完整填写有效的相关职业工作经历'
    if (!report.work_start_date || info.work_experiences.some(item => item.start_date < report.work_start_date!)) return '参加工作日期不能晚于所填经历最早开始日期'
    if (report.occupation_years == null || Number(report.occupation_years) < path.years) return `当前三级路径要求累计相关工作满${path.years}年；证书路径只计算取得证书后的经历`
  }
  if (path.id === 'technical_senior' && (education.institution_type !== 'technical' || !education.training_level)) return '本路径须为技工院校高级工班及以上，请选择培养层次'
  if (path.education && path.id !== 'technical_senior' && (!['vocational', 'general_higher'].includes(education.institution_type || '') || !['higher_vocational', 'associate', 'bachelor', 'master', 'doctorate'].includes(education.education || ''))) return '本路径须为高等职业学校或专科及以上普通高等学校毕业学历'
  if (path.id === 'evaluated_college' && !education.evaluation_reference?.trim()) return '请填写院校评估论证依据，由初审核验'
  return null
}
