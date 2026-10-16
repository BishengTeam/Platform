export const GRADUATED_RULE = 'related_major_graduated_degree_v1'
export const INSTITUTION_LABELS: Record<string, string> = {
  technical: '技工院校', vocational: '中等及以上职业院校', general_higher: '普通高等学校（专科及以上）',
}
export const EDUCATION_LABELS: Record<string, string> = {
  secondary_vocational: '中专／中等职业学历', associate: '大专', bachelor: '本科', master: '硕士', doctorate: '博士',
}
export const CHANGE_LABELS: Record<string, string> = {
  'education_info.school': '毕业院校', 'education_info.institution_type': '院校类型',
  'education_info.education': '学历层次', 'education_info.major': '所学专业',
  'education_info.graduation_date': '毕业日期', 'education_info.certificate_number': '毕业证书编号',
  contact_phone: '手机号', email: '邮箱', mailing_address: '通讯地址',
  id_card_front: '身份证正面', id_card_back: '身份证背面', registration_portrait: '一寸白底证件照',
  graduation_certificate: '毕业证', education_report: '学信网学历备案表', commitment_letter: '承诺书',
}
export function chinaDate(now = new Date()): string {
  return new Date(now.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10)
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
  if (plan.renshe_config?.qualification_rule !== GRADUATED_RULE) return true
  return ['published', 'registration_closed'].includes(plan.status) && Boolean(application.correction_due_at && Date.parse(application.correction_due_at) >= now)
}
