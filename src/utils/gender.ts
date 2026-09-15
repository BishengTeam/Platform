/**
 * 性别值域统一为中文「男/女」，与后端 UserRealname.gender（身份证推导）一致。
 * 兼容历史/模拟数据中的 male/female，未知值返回 undefined（不预填）。
 */
export type GenderZh = '男' | '女'

const GENDER_ZH: Record<string, GenderZh> = {
  male: '男',
  female: '女',
}

export function normalizeGenderZh(value: string | null | undefined): GenderZh | undefined {
  if (value === '男' || value === '女') return value
  return GENDER_ZH[value ?? '']
}
