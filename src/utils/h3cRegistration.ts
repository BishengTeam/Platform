export const H3C_REGISTRATION_TYPE_LABELS: Record<string, string> = {
  full: '全额报名',
  coupon: '考券报名',
  student: '学生报名',
}

export function isValidH3cPhone(value: string): boolean {
  return /^1[3-9][0-9]{9}$/.test(value)
}
