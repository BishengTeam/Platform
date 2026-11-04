import type { CertificationVendor, EnrollmentBatch, EnrollmentNotice } from '../services/certificationJourney.ts'
import { formatCertificationTime } from './certificationBatch.ts'
import { getAuthSessionId } from './authState.ts'

export const CERTIFICATION_LABELS = { h3c: 'H3C认证', nisp: 'NISP认证', renshe: '人社认证', sangfor: '深信服认证' }
export const VENDOR_KEYS: Record<string, CertificationVendor> = { H3C: 'h3c', NISP: 'nisp', 人社: 'renshe', 深信服: 'sangfor', h3c: 'h3c', nisp: 'nisp', renshe: 'renshe', sangfor: 'sangfor' }
export function enrollmentFormUrl(vendor: CertificationVendor, batch: EnrollmentBatch, type: string) {
  return `/pages/${vendor}/form?${vendor === 'renshe' ? 'plan_id' : 'batch_id'}=${batch.id}${vendor === 'nisp' ? `&level=${batch.level}` : vendor === 'h3c' ? `&registration_type=${type}` : ''}`
}
export function enrollmentDetailUrl(vendor: CertificationVendor, id: number) {
  return vendor === 'sangfor' ? `/pages/sangfor/detail?id=${id}` : `/pages/mine/registration-detail?type=${vendor}&id=${id}`
}
export function enrollmentDeadline(value?: string | null) {
  if (!value) return '待公布'
  return `${formatCertificationTime(value).replace(/^(\d{4})-(\d{2})-(\d{2})/, '$1年$2月$3日')}（北京时间）`
}
export function enrollmentCountdown(value: string | null, now: number) {
  const remaining = value ? Date.parse(value) - now : NaN
  if (!(remaining > 0) || remaining > 3 * 86400000) return ''
  if (remaining >= 86400000) return `距报名截止还有${Math.ceil(remaining / 86400000)}天`
  if (remaining >= 3600000) return `距报名截止还有${Math.ceil(remaining / 3600000)}小时`
  return `距报名截止还有${Math.max(1, Math.ceil(remaining / 60000))}分钟`
}
export function enrollmentBatchLabel(batch: EnrollmentBatch) {
  return `${batch.name}｜考试${formatCertificationTime(batch.exam_date)}｜截止${formatCertificationTime(batch.apply_end)}`
}
// Page-lifetime handoff only: no identity/material/form contents in route parameters or storage.
const confirmations = new Map<CertificationVendor, EnrollmentNotice>()
export function rememberNotice(value: EnrollmentNotice) { confirmations.set(value.vendor, value) }
export function currentNotice(vendor: CertificationVendor, batchId: number, type?: string) {
  const value = confirmations.get(vendor)
  return value?.batch.id === batchId && (!type || value.price.value === type) ? value : null
}
export function clearNotice(vendor: CertificationVendor) { confirmations.delete(vendor) }
export interface EnrollmentContactDraft { phone?: string; email?: string; address?: string }
let contactDraft: EnrollmentContactDraft = {}
let contactOwner: string | number = ''
export function rememberEnrollmentContact(value: EnrollmentContactDraft) { contactDraft = { ...value }; contactOwner = getAuthSessionId() }
export function enrollmentContactDraft() { return contactOwner === getAuthSessionId() ? contactDraft : {} }
