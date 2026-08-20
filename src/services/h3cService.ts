import Taro from '@tarojs/taro'
import { get, getToken, post } from '../utils/request.ts'
import type {
  H3cExamBatch,
  H3cMaterialUploadResult,
  H3cOrderCreatePayload,
  H3cProfileDefaults,
  H3cRegistration,
} from '../types/h3c.ts'

export interface PageData<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export const h3cService = {
  async profileDefaults(): Promise<H3cProfileDefaults> {
    return (await get<H3cProfileDefaults>('/api/orders/h3c/profile')).data
  },
  async listBatches(): Promise<H3cExamBatch[]> {
    return (await get<H3cExamBatch[]>('/api/h3c/exam-batches')).data
  },
  async uploadMaterial(
    filePath: string,
    batchId: number,
    materialType: 'coupon_proof' | 'student_proof',
  ): Promise<H3cMaterialUploadResult> {
    const baseUrl = (process.env.TARO_APP_API_BASE || '').replace(/\/+$/, '')
    const token = getToken()
    const response = await Taro.uploadFile({
      url: `${baseUrl}/api/h3c/materials`,
      filePath,
      name: 'file',
      formData: {
        batch_id: String(batchId),
        material_type: materialType,
      },
      header: { Authorization: token ? `Bearer ${token}` : '' },
    })
    const payload = JSON.parse(response.data) as {
      code: number
      data: H3cMaterialUploadResult
      message: string
    }
    if (payload.code !== 0) throw new Error(payload.message || '材料上传失败')
    return payload.data
  },
  async createOrder(payload: H3cOrderCreatePayload): Promise<H3cRegistration> {
    return (await post<H3cRegistration>('/api/orders/h3c', payload as unknown as Record<string, unknown>)).data
  },
  async listRegistrations(page = 1, pageSize = 20): Promise<PageData<H3cRegistration>> {
    return (await get<PageData<H3cRegistration>>('/api/h3c/registrations', {
      page,
      page_size: pageSize,
    })).data
  },
  async getRegistration(id: number): Promise<H3cRegistration> {
    return (await get<H3cRegistration>(`/api/h3c/registrations/${id}`)).data
  },
  async cancelPayment(id: number): Promise<H3cRegistration> {
    return (await post<H3cRegistration>(`/api/h3c/registrations/${id}/cancel-payment`)).data
  },
  async resubmitMaterials(
    id: number,
    payload: { coupon_proof_key?: string | null; student_proof_key?: string | null },
  ): Promise<H3cRegistration> {
    return (await post<H3cRegistration>(
      `/api/h3c/registrations/${id}/materials`,
      payload as Record<string, unknown>,
    )).data
  },
}
