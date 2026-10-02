import type { CompetitionCustomField } from '@/types'

/** 竞赛报名表单值：固定三项 + 自定义字段 */
export interface CompetitionRegFormValues {
  school: string
  real_name: string
  phone: string
  custom: Record<string, string | string[]>
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
