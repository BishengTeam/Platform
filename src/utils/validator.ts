const NAME_RE = /^[一-龥]{2,20}$/
const PHONE_RE = /^1[3-9]\d{9}$/
const ID_CARD_RE = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/

export interface ValidationResult {
  valid: boolean
  message: string
}

export function validateName(name: string): ValidationResult {
  if (!name.trim()) return { valid: false, message: '请输入姓名' }
  if (!NAME_RE.test(name.trim())) return { valid: false, message: '请输入2-20位中文姓名' }
  return { valid: true, message: '' }
}

export function validatePhone(phone: string): ValidationResult {
  if (!phone.trim()) return { valid: false, message: '请输入手机号' }
  if (!PHONE_RE.test(phone.trim())) return { valid: false, message: '请输入正确的手机号' }
  return { valid: true, message: '' }
}

export function validateIdCard(idCard: string): ValidationResult {
  if (!idCard.trim()) return { valid: false, message: '请输入身份证号' }
  if (!ID_CARD_RE.test(idCard.trim())) return { valid: false, message: '请输入正确的身份证号' }
  return { valid: true, message: '' }
}
