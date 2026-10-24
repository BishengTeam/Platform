export const H3C_EDUCATIONS = ['本科', '中职', '高职', '硕士', '博士']
export type H3cStudentVerificationMethod = 'online_code' | 'stamped_certificate'
export const H3C_STUDENT_METHODS: { value: H3cStudentVerificationMethod; label: string }[] = [
  { value: 'online_code', label: '有学信网在线验证码' },
  { value: 'stamped_certificate', label: '无学信网在线验证码' },
]
export function studentProofLabel(method?: string | null): string {
  return method === 'stamped_certificate' ? '学院盖章的学籍证图片' : '身份证人像面图片'
}
export function studentQualificationError(method: string, code: string, proof: string): string | null {
  if (!H3C_STUDENT_METHODS.some(item => item.value === method)) return '请选择学生资格核验方式'
  if (method === 'online_code' && !code.trim()) return '请填写学信网在线验证码'
  if (!proof) return `请上传${studentProofLabel(method)}`
  return null
}
