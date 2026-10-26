import type { SangforBatch, SangforValues } from '../services/sangforService.ts'

export const SANGFOR_LABELS: Record<keyof SangforValues, string> = {
  phone: '手机号', organization: '所属机构', first_name: '名字拼音（firstName）', last_name: '姓氏拼音（lastName）',
  exam_voucher_code: '考试券码', email: '邮箱地址', mailing_address: '邮寄地址', remark1: '备注1', remark2: '备注2',
}
export const SANGFOR_STATUS: Record<string, string> = { pending_payment: '待付款／核账', pending_review: '待初审', returned: '待补正', approved: '初审通过，待报送外审',
  final_approved: '外审通过', refund_processing: '退款处理中', refunded_closed: '已退款', cancelled: '已关闭' }

export function validateSangforForm(values: SangforValues): Partial<Record<keyof SangforValues, string>> {
  const errors: Partial<Record<keyof SangforValues, string>> = {}
  for (const key of ['phone', 'organization', 'first_name', 'last_name', 'exam_voucher_code'] as const) {
    if (!values[key].trim()) errors[key] = `请填写${SANGFOR_LABELS[key]}`
  }
  if (values.phone.trim() && !/^1[3-9]\d{9}$/.test(values.phone.trim())) errors.phone = '手机号格式不正确'
  for (const key of ['first_name', 'last_name'] as const) {
    if (values[key].trim() && !/^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$/.test(values[key].trim())) errors[key] = '请填写英文或拼音，可使用空格、短横线或英文单引号'
  }
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = '邮箱格式不正确'
  const max: Record<keyof SangforValues, number> = { phone: 11, organization: 128, first_name: 64, last_name: 64, exam_voucher_code: 128, email: 128, mailing_address: 256, remark1: 500, remark2: 500 }
  for (const key of Object.keys(max) as Array<keyof SangforValues>) if (values[key].trim().length > max[key]) errors[key] = `${SANGFOR_LABELS[key]}不能超过${max[key]}个字符`
  return errors
}
export function canApplySangfor(batch: SangforBatch, time = Date.now()): boolean {
  return batch.status === 'published' && batch.remaining_count !== 0 && !!batch.exam_date && !!batch.apply_start && !!batch.apply_end
    && Date.parse(batch.apply_start) <= time && Date.parse(batch.apply_end) >= time
}
