import { STRINGS } from '../constants/strings.ts'

const NAME_RE = /^[一-龥]{2,20}$/
const PHONE_RE = /^1[3-9]\d{9}$/
const ID_CARD_RE = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/
const ID_CARD_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const ID_CARD_CHECK_CHARS = '10X98765432'

export interface ValidationResult {
  valid: boolean
  message: string
}

export function validateName(name: string): ValidationResult {
  if (!name.trim()) return { valid: false, message: STRINGS.VALIDATOR_NAME_REQUIRED }
  if (!NAME_RE.test(name.trim())) return { valid: false, message: STRINGS.VALIDATOR_NAME_INVALID }
  return { valid: true, message: '' }
}

export function validatePhone(phone: string): ValidationResult {
  if (!phone.trim()) return { valid: false, message: STRINGS.VALIDATOR_PHONE_REQUIRED }
  if (!PHONE_RE.test(phone.trim())) return { valid: false, message: STRINGS.VALIDATOR_PHONE_INVALID }
  return { valid: true, message: '' }
}

export function validateIdCard(idCard: string): ValidationResult {
  const value = idCard.trim()
  if (!value) return { valid: false, message: STRINGS.VALIDATOR_ID_CARD_REQUIRED }
  if (!ID_CARD_RE.test(value)) return { valid: false, message: STRINGS.VALIDATOR_ID_CARD_INVALID }

  const sum = ID_CARD_WEIGHTS.reduce((total, weight, index) => total + Number(value[index]) * weight, 0)
  const expectedCheck = ID_CARD_CHECK_CHARS[sum % 11]
  if (value[17].toUpperCase() !== expectedCheck) {
    return { valid: false, message: '身份证号校验位不正确' }
  }
  return { valid: true, message: '' }
}

export function validateEmail(email: string): ValidationResult {
  if (!email.trim()) return { valid: false, message: STRINGS.VALIDATOR_EMAIL_REQUIRED }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return { valid: false, message: STRINGS.VALIDATOR_EMAIL_INVALID }
  }
  return { valid: true, message: '' }
}

export function validateRequired(value: string, label: string): ValidationResult {
  if (!value.trim()) return { valid: false, message: `请输入${label}` }
  return { valid: true, message: '' }
}
