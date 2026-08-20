export type H3cRegistrationType = 'coupon' | 'student' | 'full'
export type H3cRegistrationStatus =
  | 'pending_payment'
  | 'pending_review'
  | 'rejected_awaiting_resubmission'
  | 'pending_refund_confirmation'
  | 'refund_processing'
  | 'approved'
  | 'refunded_closed'
  | 'cancelled'

export interface H3cProfileDefaults {
  candidate_name: string | null
  gender: string | null
  candidate_idcard: string | null
  school: string | null
  address: string | null
  phone: string | null
  email: string | null
  education: string | null
  first_name_en: string | null
  last_name_en: string | null
}

export interface H3cPriceOption {
  registration_type: H3cRegistrationType
  price_cents: number
}

export interface H3cExamBatch {
  id: number
  plan_id: number
  certification_code: string
  name: string
  status: string
  apply_start: string
  apply_end: string
  exam_date: string
  remaining_count: number
  exam_location: string | null
  description: string | null
  prices: H3cPriceOption[]
  payment_timeout_minutes: number
  max_material_bytes: number
}

export interface H3cMaterialUploadResult {
  material_type: string
  storage_key: string
  size_bytes: number
  sha256: string
}

export interface H3cMaterial {
  id: number
  material_type: string
  version_no: number
  preview_url: string | null
  original_filename: string
  size_bytes: number
  sha256: string
  is_current: boolean
  uploaded_at: string
}

export interface H3cRegistration {
  id: number
  registration_no: string
  batch_id: number
  plan_id: number
  order_id: number
  registration_type: H3cRegistrationType
  status: H3cRegistrationStatus
  candidate_snapshot: Record<string, unknown>
  order_status: string
  price_cents: number
  out_trade_no: string | null
  paid_at: string | null
  resubmission_count: number
  rejection_count: number
  resubmission_due_at: string | null
  materials: H3cMaterial[]
  latest_review: {
    decision: string
    reason_code: string | null
    reason_detail: string | null
    rejected_material_types: string[] | null
  } | null
  created_at: string
  updated_at: string
}

export interface H3cOrderCreatePayload {
  batch_id: number
  registration_type: H3cRegistrationType
  candidate_name: string
  gender: string
  candidate_idcard: string
  school: string
  address: string
  phone: string
  email: string
  education: string
  first_name_en: string
  last_name_en: string
  coupon_code?: string | null
  verify_code?: string | null
  coupon_proof_key?: string | null
  student_proof_key?: string | null
}
