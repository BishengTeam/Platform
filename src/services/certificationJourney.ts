import { get, getPublic } from '../utils/request.ts'
export type CertificationVendor = 'h3c' | 'nisp' | 'renshe' | 'sangfor'
export interface EnrollmentBatch {
  id: number; plan_id: number; subject_id: string; name: string; status: string
  apply_start: string | null; apply_end: string | null; exam_date: string | null; exam_location: string | null
  remaining_count: number; can_apply: boolean; capacity: number; level: '1' | '2' | null
  skill_level: string | null; application_type: string | null
  prices: Array<{ value: string; label: string; price_cents: number }>
}
export interface EnrollmentCatalog {
  vendor: CertificationVendor; title: string; introduction: string
  subjects: Array<{ id: string; name: string; description: string | null }>; batches: EnrollmentBatch[]
}
export interface NoticeBlock { type: 'text' | 'image'; text: string; url: string; caption: string }
export interface EnrollmentNotice {
  vendor: CertificationVendor; subject: EnrollmentCatalog['subjects'][number]; batch: EnrollmentBatch
  price: EnrollmentBatch['prices'][number]; notice: { title: string; blocks: NoticeBlock[] }
  supplement: { title: string; blocks: NoticeBlock[] }; batch_description: string; notice_hash: string
  requirements_summary?: string[]
}
export interface EnrollmentJourney {
  vendor: CertificationVendor; registration_id: number; registration_no: string; order_id: number; subject: string; batch_name: string
  stages: string[]; progress: { stage: number | null; exception: boolean; label: string; description: string; action: string }
  apply_end: string | null; proof_due_at: string | null; correction_due_at: string | null; reason: string | null
  events: Array<{ at: string; label: string; reason?: string }>
  contact: { contact_name: string; contact_phone: string; contact_wechat: string; service_hours: string }
  consultation_group: import('../components/ConsultationGroupCard').ConsultationGroupInfo | null; group_message: string
}
export const certificationJourneyService = {
  async catalog(vendor: CertificationVendor): Promise<EnrollmentCatalog> { return (await getPublic<EnrollmentCatalog>(`/api/cert/enrollment/${vendor}/catalog`)).data },
  async notice(vendor: CertificationVendor, id: number, type?: string): Promise<EnrollmentNotice> { return (await getPublic<EnrollmentNotice>(`/api/cert/enrollment/${vendor}/notice/${id}`, type ? { registration_type: type } : undefined)).data },
  async journey(vendor: CertificationVendor, id: number): Promise<EnrollmentJourney> { return (await get<EnrollmentJourney>(`/api/cert/enrollment/${vendor}/registrations/${id}`)).data },
  async order(orderId: number): Promise<{ vendor: CertificationVendor; id: number } | null> { return (await get<{ vendor: CertificationVendor; id: number } | null>(`/api/cert/enrollment/orders/${orderId}`)).data },
}
