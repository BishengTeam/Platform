import { getOptional, getPublic } from '../utils/request.ts'
import Taro from '@tarojs/taro'
import { del, get, getToken, post } from '../utils/request.ts'
import type {
  H3cExamBatch,
  H3cMaterialUploadResult,
  H3cOrderCreatePayload,
  H3cProfileDefaults,
  H3cRegistration,
  H3cExamBooking,
  H3cExamAttachment,
  H3cExamScheduleOption,
  H3cExamTimeSlot,
} from '../types/h3c.ts'
import type { CertificationVendor } from './certificationJourney.ts'

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
    return (await getOptional<H3cExamBatch[]>('/api/h3c/exam-batches')).data
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
  async listExamSchedules(
    registrationId: number,
    vendor: CertificationVendor = 'h3c',
  ): Promise<H3cExamScheduleOption[]> {
    return (await get<H3cExamScheduleOption[]>('/api/exam/schedules', {
      vendor,
      registration_id: registrationId,
    })).data
  },
  async listExamDates(
    scheduleId: number,
    vendor: CertificationVendor = 'h3c',
  ): Promise<string[]> {
    return (await get<{ dates: string[] }>(
      `/api/exam/schedules/${scheduleId}/dates`,
      { vendor },
    )).data.dates
  },
  async listExamSlots(
    scheduleId: number,
    examDate: string,
    registrationId: number,
    vendor: CertificationVendor = 'h3c',
  ): Promise<H3cExamTimeSlot[]> {
    return (await get<{ slots: H3cExamTimeSlot[] }>(
      `/api/exam/schedules/${scheduleId}/slots`,
      { date: examDate, registration_id: registrationId, vendor },
    )).data.slots
  },
  async getExamNotice(
    scheduleId: number,
    vendor: CertificationVendor = 'h3c',
  ): Promise<string> {
    return (await get<{ notice: string }>(
      `/api/exam/schedules/${scheduleId}/notice`,
      { vendor },
    )).data.notice
  },
  async listExamAttachments(
    scheduleId: number,
    vendor: CertificationVendor = 'h3c',
  ): Promise<H3cExamAttachment[]> {
    return (await get<H3cExamAttachment[]>(
      `/api/exam/schedules/${scheduleId}/attachments`,
      { vendor },
    )).data
  },
  async bookExamSeat(
    scheduleId: number,
    registrationId: number,
    slotId: number,
    examDate: string,
    vendor: CertificationVendor = 'h3c',
  ): Promise<{ booking_id: number; exam_date: string }> {
    return (await post<{ booking_id: number; exam_date: string }>(
      `/api/exam/schedules/${scheduleId}/book?vendor=${vendor}&registration_id=${registrationId}`,
      { slot_id: slotId, exam_date: examDate },
    )).data
  },
  async listExamBookings(
    vendor: CertificationVendor = 'h3c',
  ): Promise<H3cExamBooking[]> {
    return (await get<H3cExamBooking[]>('/api/exam/bookings', { vendor })).data
  },
  async cancelExamBooking(
    bookingId: number,
    registrationId: number,
    vendor: CertificationVendor = 'h3c',
  ): Promise<void> {
    await del(
      `/api/exam/bookings/${bookingId}?vendor=${vendor}&registration_id=${registrationId}`,
    )
  },
  async resubmitMaterials(
    id: number,
    payload: {
      phone?: string | null
      email?: string | null
      school?: string | null
      address?: string | null
      verify_code?: string | null
      student_verification_method?: import('../utils/h3cStudent').H3cStudentVerificationMethod | null
      coupon_proof_key?: string | null
      student_proof_key?: string | null
    },
  ): Promise<H3cRegistration> {
    return (await post<H3cRegistration>(
      `/api/h3c/registrations/${id}/materials`,
      payload as Record<string, unknown>,
    )).data
  },
}
