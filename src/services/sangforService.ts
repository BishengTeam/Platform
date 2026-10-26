import { get, getPublic, post } from '../utils/request.ts'

export interface SangforBatch {
  id: number; product_code: string; product_name: string; name: string; status: string
  exam_direction: string; description: string | null; exam_date: string | null; exam_location: string | null
  apply_start: string | null; apply_end: string | null; price_cents: number; capacity: number; enrolled: number; remaining_count: number
}
export interface SangforValues {
  phone: string; organization: string; first_name: string; last_name: string; exam_voucher_code: string
  email: string; mailing_address: string; remark1: string; remark2: string
}
export interface SangforRegistration {
  id: number; order_id: number; batch_id: number; registration_no: string; status: string; order_status: string
  revision: number; current_version: number; price_cents: number; created_at: string; correction_due_at: string | null
  candidate_snapshot: SangforValues & Record<string, string> & { name: string; id_card: string; exam_direction: string; exam_date: string }
  batch_snapshot: { name: string; product_code: string; exam_direction: string; exam_date: string; exam_location: string | null }
  reviews: Array<{ action: string; reason: string; version: number; created_at: string; correction_due_at: string | null }>
  payment_summary: { order_id: number; payment_channel: string; offline_status: string | null; review_payment_allowed: boolean; review_block_reason: string | null }
}
export const sangforService = {
  async listBatches(code?: string): Promise<SangforBatch[]> { return (await getPublic<SangforBatch[]>('/api/sangfor/batches', code ? { product_code: code } : undefined)).data },
  async batch(id: number): Promise<SangforBatch> { return (await getPublic<SangforBatch>(`/api/sangfor/batches/${id}`)).data },
  async create(batchId: number, values: SangforValues): Promise<SangforRegistration> { return (await post<SangforRegistration>('/api/sangfor/registrations', { ...values, batch_id: batchId })).data },
  async registrations(page = 1): Promise<{ items: SangforRegistration[]; total: number }> { return (await get<{ items: SangforRegistration[]; total: number }>('/api/sangfor/registrations', { page, page_size: 100 })).data },
  async registration(id: number): Promise<SangforRegistration> { return (await get<SangforRegistration>(`/api/sangfor/registrations/${id}`)).data },
  async resubmit(id: number, revision: number, values: SangforValues): Promise<SangforRegistration> { return (await post<SangforRegistration>(`/api/sangfor/registrations/${id}/resubmit`, { ...values, expected_revision: revision })).data },
}
