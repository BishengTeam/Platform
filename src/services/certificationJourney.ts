import { get, getPublic } from '../utils/request.ts'
export type CertificationVendor = 'h3c' | 'nisp' | 'renshe' | 'sangfor'
export interface EnrollmentBatch {
  id: number; plan_id: number; subject_id: string; name: string; status: string
  plan_product_id?: number
  batch_product_id?: number
  batch_project_id?: number
  apply_start: string | null; apply_end: string | null; exam_date: string | null; exam_location: string | null
  time_segments?: Array<{ id: number; label: string; start_time: string; end_time: string }>
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
  registration_notice?: string | null
  exam_org_name?: string | null
  exam_org_code?: string | null
  exam_date_note?: string | null
  requirements_summary?: string[]
}
export interface CertAttachmentItem {
  id: number; title: string; file_url: string; file_size: number | null; sort_order?: number
}
export interface EnrollmentJourney {
  vendor: CertificationVendor; registration_id: number; registration_no: string; order_id: number; subject: string; batch_name: string
  registration_code?: string | null
  registration_code_info?: {
    code: string | null
    generated_at: string | null
    revoked: boolean
    activation_url: string | null
    instructions: string[]
  } | null
  exam_org_name?: string | null
  exam_org_code?: string | null
  exam_date_note?: string | null
  stages: string[]; progress: { stage: number | null; exception: boolean; label: string; description: string; action: string }
  apply_end: string | null; proof_due_at: string | null; correction_due_at: string | null; reason: string | null
  events: Array<{ at: string; label: string; reason?: string }>
  contact: { contact_name: string; contact_phone: string; contact_wechat: string; service_hours: string }
  consultation_group: import('../components/ConsultationGroupCard').ConsultationGroupInfo | null; group_message: string
}
export const certificationJourneyService = {
  async catalog(vendor: CertificationVendor): Promise<EnrollmentCatalog> { return (await getPublic<EnrollmentCatalog>(`/api/cert/enrollment/${vendor}/catalog`)).data },
  async notice(vendor: CertificationVendor, id: number, type?: string, batchProjectId?: number): Promise<EnrollmentNotice> {
    const params: Record<string, string> = {}
    if (type) params.registration_type = type
    if (batchProjectId) params.batch_project_id = String(batchProjectId)
    return (await getPublic<EnrollmentNotice>(`/api/cert/enrollment/${vendor}/notice/${id}`, Object.keys(params).length ? params : undefined)).data
  },
  async journey(vendor: CertificationVendor, id: number): Promise<EnrollmentJourney> { return (await get<EnrollmentJourney>(`/api/cert/enrollment/${vendor}/registrations/${id}`)).data },
  async planAttachments(vendor: CertificationVendor, planId: number): Promise<CertAttachmentItem[]> {
    return (await getPublic<CertAttachmentItem[]>(`/api/cert/enrollment/${vendor}/plans/${planId}/attachments`)).data
  },
  async order(orderId: number): Promise<{ vendor: CertificationVendor; id: number } | null> { return (await get<{ vendor: CertificationVendor; id: number } | null>(`/api/cert/enrollment/orders/${orderId}`)).data },
}
