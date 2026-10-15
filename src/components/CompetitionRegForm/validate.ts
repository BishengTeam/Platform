import type { CompetitionCustomField } from '@/types'

/** 竞赛报名表单值：固定三项 + 自定义字段 */
export interface CompetitionRegFormValues {
  school: string
  real_name: string
  phone: string
  custom: Record<string, string | string[]>
}

/**
 * 固定字段的别名键：后台自定义字段配置了这些键时，视为固定字段本身，
 * 在配置的位置渲染对应固定输入，不再额外重复渲染固定块。
 * 提交时这些键不走 custom（固定三项走顶层 school/real_name/phone）。
 */
export const FIXED_FIELD_ALIASES: Record<string, 'school' | 'real_name' | 'phone'> = {
  name: 'real_name',
  school: 'school',
  phone_number: 'phone',
  phone: 'phone',
}

export function isFixedFieldAlias(key: string): boolean {
  return key in FIXED_FIELD_ALIASES
}

export function emptyCompetitionRegFormValues(): CompetitionRegFormValues {
  return { school: '', real_name: '', phone: '', custom: {} }
}

/**
 * 报名/修改共用表单校验。
 * 返回第一条错误提示，通过则返回 null。
 */
export function validateCompetitionRegForm(
  values: CompetitionRegFormValues,
  fields: CompetitionCustomField[] | null | undefined,
): string | null {
  if (!values.school.trim()) return '请输入学校'
  if (!values.real_name.trim()) return '请输入姓名'
  if (!/^1\d{10}$/.test(values.phone.trim())) return '请输入正确的手机号'
  for (const field of fields || []) {
    // 别名键即固定字段本身，必填性由固定三项校验覆盖
    if (isFixedFieldAlias(field.key)) continue
    const value = values.custom[field.key]
    if (field.required) {
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return `请填写${field.label}`
      }
    }
    if (field.type === 'phone' && value) {
      if (!/^1\d{10}$/.test(String(value))) return `${field.label}格式不正确`
    }
    if (field.type === 'idcard' && value) {
      if (!/^\d{17}[\dX]$/i.test(String(value))) return `${field.label}必须为18位`
    }
  }
  return null
}
