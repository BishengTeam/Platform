import type { NispBatch, NispMaterialType } from '../services/nispService.ts'

export async function findNispBatch(batchId: number, load: () => Promise<NispBatch[]>): Promise<NispBatch | null> {
  if (!Number.isSafeInteger(batchId) || batchId <= 0) return null
  return (await load()).find(batch => batch.id === batchId) || null
}

export interface NispFormValues {
  name: string; pinyin: string; major: string; school: string
  id_card: string; phone: string; email: string; province: string
  gender: string; age: string; education: string; address: string; zip_code: string
}

export const NISP_FIELD_LABELS: Record<keyof NispFormValues, string> = {
  name: '姓名', pinyin: '姓名拼音', major: '专业', school: '学校／单位',
  id_card: '身份证号', phone: '手机号码', email: '邮箱', province: '报考省份',
  gender: '性别', age: '年龄', education: '最高学历', address: '通信地址', zip_code: '邮编',
}
export const NISP_MATERIAL_LABELS: Record<NispMaterialType, string> = {
  id_card_both_sides: '身份证双面', portrait_photo: '证件照', xuexin_report: '学籍验证报告', application_form: '二级申请表',
}
export type NispErrorKey = keyof NispFormValues | NispMaterialType | 'agreement'
export type NispFormErrors = Partial<Record<NispErrorKey, string>>

export function validateNispForm(form: NispFormValues, level: '1' | '2', materials: Partial<Record<NispMaterialType, string>>): NispFormErrors {
  const errors: NispFormErrors = {}
  const required: (keyof NispFormValues)[] = ['name', 'pinyin', 'major', 'province', 'school', 'id_card']
  if (level === '2') required.push('gender', 'age', 'education', 'zip_code', 'address')
  required.push('phone', 'email')
  const limits = { name: 64, pinyin: 128, major: 64, school: 128, email: 128, province: 32, education: 32, address: 256 }
  for (const key of required) {
    const value = form[key].trim()
    if (!value) errors[key] = `请填写${NISP_FIELD_LABELS[key]}`
    else if (key in limits && value.length > limits[key as keyof typeof limits]) errors[key] = `${NISP_FIELD_LABELS[key]}不能超过${limits[key as keyof typeof limits]}字`
  }
  if (form.id_card.trim() && form.id_card.trim().length !== 18) errors.id_card = '身份证号必须为18位'
  if (form.phone.trim() && !/^1\d{10}$/.test(form.phone.trim())) errors.phone = '手机号格式不正确'
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = '邮箱格式不正确'
  if (level === '2') {
    if (form.age.trim() && (!/^\d+$/.test(form.age.trim()) || Number(form.age) < 16 || Number(form.age) > 80)) errors.age = '年龄须为16至80之间的整数'
    if (form.zip_code.trim() && !/^\d{6}$/.test(form.zip_code.trim())) errors.zip_code = '邮编须为6位数字'
  }
  const kinds: NispMaterialType[] = ['id_card_both_sides', 'portrait_photo', ...(level === '2' ? ['xuexin_report', 'application_form'] as NispMaterialType[] : [])]
  for (const kind of kinds) if (!materials[kind]) errors[kind] = `请上传${NISP_MATERIAL_LABELS[kind]}`
  return errors
}

export function nispErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback
  if (error.message === 'UNAUTHORIZED') return '登录已失效，请重新登录后重试'
  if (!/[\u4e00-\u9fff]/.test(error.message)) return fallback
  let message = error.message
  for (const [key, label] of Object.entries({ ...NISP_FIELD_LABELS, ...NISP_MATERIAL_LABELS })) message = message.replace(new RegExp(`\\b${key}\\b`, 'g'), label)
  return message
}
