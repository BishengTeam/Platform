import Taro from '@tarojs/taro'
import { get, getToken, post } from '../utils/request.ts'

export type NispMaterialType =
  | 'id_card_both_sides'
  | 'portrait_photo'
  | 'xuexin_report'
  | 'application_form'

export type NispLevel = '1' | '2'

export interface NispMaterialUploadResult {
  material_type: NispMaterialType
  material_id: number
  storage_key: string
  original_filename: string | null
  content_type: string | null
  size_bytes: number
  sha256: string
}

export interface NispResubmitPayload {
  id_card_both_sides_key?: string | null
  portrait_photo_key?: string | null
  xuexin_report_key?: string | null
  application_form_key?: string | null
}

export interface NispBatch {
  id: number
  level: '1' | '2'
  name: string
  status: string
  apply_start: string | null
  apply_end: string | null
  exam_date: string | null
  exam_location: string | null
  remaining_count: number
  level1_price_cents: number
  level2_price_cents: number
  payment_timeout_minutes: number
  max_material_bytes: number
}

export interface NispRegistration {
  id: number
  registration_no: string
  batch_id: number
  plan_id: number
  order_id: number
  level: '1' | '2'
  status: 'pending_payment' | 'pending_review' | 'rejected_awaiting_resubmission' | 'approved' | 'cancelled'
  candidate_snapshot: Record<string, unknown>
  order_status: string
  price_cents: number
  out_trade_no: string | null
  paid_at: string | null
  resubmission_count: number
  rejection_count: number
  resubmission_due_at: string | null
  latest_review: {
    decision: string
    reason_code: string | null
    reason_detail: string | null
    rejected_material_types: string[] | null
  } | null
  created_at: string
  updated_at: string
}

export interface NispOrderCreatePayload {
  batch_id: number
  level: '1' | '2'
  name: string
  pinyin: string
  major: string
  school: string
  id_card: string
  phone: string
  email: string
  province: string
  gender?: string
  age?: number
  education?: string
  address?: string
  zip_code?: string
  id_card_both_sides_key: string
  portrait_photo_key: string
  xuexin_report_key?: string
  application_form_key?: string
}

export interface PageData<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export const nispService = {
  async listBatches(level?: NispLevel): Promise<NispBatch[]> {
    return (await get<NispBatch[]>('/api/nisp/batches', level ? { level } : undefined)).data
  },

  async createOrder(payload: NispOrderCreatePayload): Promise<NispRegistration> {
    return (await post<NispRegistration>('/api/nisp/orders', payload as unknown as Record<string, unknown>)).data
  },

  async listRegistrations(page = 1, pageSize = 20): Promise<PageData<NispRegistration>> {
    return (await get<PageData<NispRegistration>>('/api/nisp/registrations', {
      page,
      page_size: pageSize,
    })).data
  },

  async getRegistration(id: number): Promise<NispRegistration> {
    return (await get<NispRegistration>(`/api/nisp/registrations/${id}`)).data
  },

  async uploadMaterial(
    filePath: string,
    materialType: NispMaterialType,
    originalFilename?: string,
  ): Promise<NispMaterialUploadResult> {
    const baseUrl = (process.env.TARO_APP_API_BASE || '').replace(/\/+$/, '')
    const token = getToken()
    const response = await Taro.uploadFile({
      url: `${baseUrl}/api/nisp/materials/upload`,
      filePath,
      name: 'file',
      formData: {
        material_type: materialType,
        ...(originalFilename ? { original_filename: originalFilename } : {}),
      },
      header: { Authorization: token ? `Bearer ${token}` : '' },
      timeout: 60000,
    })
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`材料上传失败(${response.statusCode})`)
    }

    let rawPayload: unknown = response.data
    if (typeof rawPayload === 'string') {
      try {
        rawPayload = JSON.parse(rawPayload)
      } catch {
        throw new Error('材料上传响应格式错误')
      }
    }

    const payload = rawPayload as {
      code?: number
      data?: NispMaterialUploadResult
      message?: string
    }
    if (payload.code !== 0) throw new Error(payload.message || '材料上传失败')
    if (!payload.data?.storage_key) throw new Error('材料上传结果无效')
    return payload.data
  },

  async resubmitMaterials(
    id: number,
    payload: NispResubmitPayload,
  ): Promise<NispRegistration> {
    return (await post<NispRegistration>(
      `/api/nisp/registrations/${id}/materials`,
      payload as Record<string, unknown>,
    )).data
  },

  async cancelPayment(id: number): Promise<NispRegistration> {
    return (await post<NispRegistration>(`/api/nisp/registrations/${id}/cancel-payment`)).data
  },
}

export function getNispLevelFromCertCode(code: string): NispLevel {
  return code.trim().toUpperCase().endsWith('-2') ? '2' : '1'
}
