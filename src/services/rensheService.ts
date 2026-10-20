import { get, post } from '../utils/request.ts'
import { getToken } from '../utils/request.ts'
import Taro from '@tarojs/taro'
import { downloadDocumentFile, previewDocumentFile, sendDocumentFile, canSendDocumentFile, FILE_SHARE_UNSUPPORTED, type LocalDocumentFile } from '../utils/documentFile.ts'

export interface RensheEducationInfo {
  training_level?: 'senior_worker' | 'preparatory_technician' | 'technician'
  evaluation_reference?: string
  graduated: true
  school: string
  institution_type: string
  education: string
  major: string
  graduation_date: string
  certificate_number: string
}
export interface RensheWorkExperience {
  work_unit: string
  position: string
  occupation_name: string
  start_date: string
  end_date: string | null
}
export interface RensheEmploymentInfo {
  admission_path?: string
  title_certificate?: { title_name: string; level: 'primary'; major: string; certificate_number: string; issued_on: string } | null
  cultural_education: string
  work_experiences: RensheWorkExperience[]
  skill_certificate?: { occupation_name: string; grade: 4 | 5; certificate_number: string; issued_on: string } | null
}
export interface RensheAdmissionPath {
  id: string
  condition: string
  material_kinds: string[]
  years: number
  work?: boolean
  skill?: boolean
  title?: boolean
  education?: boolean
}
export interface RensheReportingInfo {
  occupation_status: string
  ethnicity: string
  political_status: string
  has_work_experience: boolean
  work_start_date?: string | null
  enrollment_date?: string | null
  occupation_years?: string | number | null
  work_unit?: string
  social_insurance_unit?: string
}
export interface RensheReportingOptions {
  rule_profile?: { admission_paths?: RensheAdmissionPath[]; occupation_name?: string; related_majors?: string; related_occupations?: string; source_conditions?: string[]; project_limits?: string[]; sources?: string[] }
  config_id: number
  education_levels: string[]
  education_labels: Record<string, string>
  institution_types: string[]
  occupations: string[]
  ethnicities: string[]
  political_statuses: string[]
  candidate_source: string
  application_condition: string
  employment_reporting: { confirmed: boolean; work_date_required?: boolean; date_rule: string; years_rule: string; allow_zero_years: boolean }
  commitment_template: { filename: string } | null
}
export interface RensheUploadedMaterial {
  application_id?: number
  kind: string
  storage_key: string
  original_filename: string
  size_bytes: number
}

export type RensheApplicationStatus =
  | 'draft'
  | 'pending_payment'
  | 'pending_initial_review'
  | 'initial_rejected'
  | 'pending_external_review'
  | 'external_rejected'
  | 'external_approved'
  | 'closed'

export interface RenshePlan {
  id: number
  product_type: string
  project_name?: string | null
  renshe_config_id?: number | null
  renshe_config?: {
    rule_profile?: { source_conditions?: string[]; admission_paths?: RensheAdmissionPath[] }
    qualification_rule?: string
    institution_types?: string[]
    reporting_policy?: { contract_version?: number; commitment_template?: { filename: string; original_filename?: string } }
    education_levels: string[]
    materials: Array<{ kind: string; name: string; required: boolean; extensions: string[]; max_count: number }>
  } | null
  name: string
  apply_start: string | null
  apply_end: string | null
  exam_date: string | null
  exam_location: string | null
  capacity: number
  occupation_name: string
  occupation_code: string
  skill_level: string
  exam_type: string
  application_type: string
  price_cents: number
  description: string | null
  enrolled: number
  status: string
}

export interface RensheDraftPayload {
  qualification_info?: RensheEmploymentInfo
  plan_id: number
  contact_phone: string
  mailing_address: string
  email: string
  education_info?: RensheEducationInfo
  reporting_info?: RensheReportingInfo
}

export interface RensheProject {
  id: number
  name: string
  description: string | null
  home_cover_url: string | null
  occupation_name: string
  occupation_code: string
  skill_level: string
  qualification_rule?: string
  application_types?: string[]
  education_levels?: string[]
  institution_types?: string[]
  materials?: Array<{ kind: string; name: string; required: boolean }>
  admission_notice?: string
}

export interface RensheApplication {
  id: number
  plan_id: number
  user_id: number
  current_version_id: number | null
  status: RensheApplicationStatus
  draft_data: {
    qualification_info?: RensheEmploymentInfo
    contact_phone?: string
    mailing_address?: string
    email?: string
    education_info?: RensheEducationInfo
    reporting_info?: RensheReportingInfo
    materials?: Record<string, RensheUploadedMaterial>
  } | null
  correction_due_at?: string | null
  submitted_at: string | null
  frozen_at: string | null
  freeze_reason: string | null
  closed_at: string | null
  close_reason: string | null
  created_at: string
  updated_at: string
}

export interface RensheApplicationListItem extends RensheApplication {
  plan: RenshePlan
  current_order: {
    id: number
    status: string
    price_cents: number
    expires_at: string | null
    paid_at: string | null
    closed_at: string | null
  } | null
  current_refund: {
    id: number
    status: string
    request_kind: string
    amount_cents: number
    requested_at: string
    due_at: string
    out_refund_no: string | null
    succeeded_at: string | null
    last_error: string | null
    retry_count: number
  } | null
}

export interface RensheApplicationDetail extends RensheApplication {
  plan: RenshePlan
  versions: Array<{ id: number; version_no: number; submitted_at: string }>
  current_order_id: number | null
  current_order_status: string | null
  current_refund_id: number | null
  current_refund_status: string | null
  current_refund_last_error: string | null
  current_refund_retry_count: number | null
  latest_rejection_stage: 'initial' | 'external' | null
  latest_rejection_reason: string | null
  required_changes: string[] | null
  consultation_group?: {
    qrcode_url: string
    join_instructions?: string | null
    expires_at?: string | null
    contact_name?: string | null
    contact_phone?: string | null
  } | null
}

export interface RensheSubmitResult {
  application: RensheApplication
  version: { id: number; version_no: number; submitted_at: string }
  order_id: number
  order_status: string
  order_expires_at: string | null
  payment_required: boolean
}

export interface PageData<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export type RensheTemplateFile = LocalDocumentFile
export const TEMPLATE_SHARE_UNSUPPORTED = FILE_SHARE_UNSUPPORTED
export const canSendCommitmentTemplate = canSendDocumentFile

export const rensheService = {
  async getReportingOptions(planId: number): Promise<RensheReportingOptions> {
    return (await get<RensheReportingOptions>(`/api/renshe/batches/${planId}/reporting-options`)).data
  },
  async findActiveApplication(planId: number): Promise<RensheApplicationDetail | null> {
    const result = await get<PageData<RensheApplicationListItem>>('/api/renshe/applications', { plan_id: planId, page_size: 20 })
    const item = result.data.items.find(application => application.status !== 'closed')
    return item ? this.getApplication(item.id) : null
  },
  async uploadMaterial(planId: number, kind: string, filePath: string): Promise<RensheUploadedMaterial> {
    const token = getToken()
    const response = await Taro.uploadFile({
      url: `${(process.env.TARO_APP_API_BASE || '').replace(/\/+$/, '')}/api/renshe/batches/${planId}/materials/${kind}`,
      filePath, name: 'file', header: { Authorization: token ? `Bearer ${token}` : '' },
    })
    let payload: { code: number; data: RensheUploadedMaterial; message?: string }
    try { payload = JSON.parse(response.data) } catch { throw new Error('上传响应无效，请重试') }
    if (response.statusCode !== 200 || payload.code !== 0 || !payload.data?.storage_key) throw new Error(payload.message || '材料上传失败')
    return payload.data
  },
  async getCommitmentTemplateFile(planId: number, filename?: string): Promise<RensheTemplateFile> {
    const token = getToken()
    if (!token) throw new Error('登录已失效，请重新登录后重试')
    return downloadDocumentFile({
      url: `${(process.env.TARO_APP_API_BASE || '').replace(/\/+$/, '')}/api/renshe/batches/${planId}/commitment-template`,
      header: { Authorization: `Bearer ${token}` }, filename,
      fallbackName: '承诺书模板', failureMessage: '模板获取失败，请重试',
      missingMessage: '暂无可用承诺书模板，请联系管理员',
    })
  },
  async previewCommitmentTemplate(file: RensheTemplateFile): Promise<void> {
    await previewDocumentFile(file)
  },
  async sendCommitmentTemplate(file: RensheTemplateFile): Promise<void> {
    await sendDocumentFile({ ...file, filename: `承诺书模板.${file.fileType}` })
  },
  async downloadCommitmentTemplate(planId: number, filename?: string): Promise<void> {
    await this.previewCommitmentTemplate(await this.getCommitmentTemplateFile(planId, filename))
  },
  async listProjects(): Promise<RensheProject[]> {
    return (await get<RensheProject[]>('/api/renshe/projects')).data ?? []
  },
  async listBatches(projectId?: number): Promise<RenshePlan[]> {
    return (await get<RenshePlan[]>('/api/renshe/batches', projectId ? { project_id: projectId } : undefined)).data ?? []
  },

  async getBatch(id: number): Promise<RenshePlan> {
    return (await get<RenshePlan>(`/api/plans/${id}`)).data
  },

  async saveDraft(payload: RensheDraftPayload): Promise<RensheApplication> {
    return (await post<RensheApplication>(
      '/api/renshe/applications/draft',
      payload as unknown as Record<string, unknown>,
    )).data
  },

  async submit(id: number): Promise<RensheSubmitResult> {
    return (await post<RensheSubmitResult>(`/api/renshe/applications/${id}/submit`)).data
  },

  async listApplications(page = 1, pageSize = 20): Promise<PageData<RensheApplicationListItem>> {
    return (await get<PageData<RensheApplicationListItem>>('/api/renshe/applications', {
      page,
      page_size: pageSize,
    })).data
  },

  async getApplication(id: number): Promise<RensheApplicationDetail> {
    return (await get<RensheApplicationDetail>(`/api/renshe/applications/${id}`)).data
  },

  async cancelPayment(id: number): Promise<void> {
    await post(`/api/renshe/applications/${id}/cancel-payment`)
  },

  async requestRefund(
    id: number,
    reasonDetail: string,
    requestKind: 'normal' | 'exception' = 'normal',
  ): Promise<void> {
    await post(`/api/renshe/applications/${id}/refunds`, {
      request_kind: requestKind,
      reason_code: 'user_request',
      reason_detail: reasonDetail,
    })
  },
}
