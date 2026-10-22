import Taro from '@tarojs/taro'
import { get, post, getToken, resolveUrl } from '@/utils/request'
export { transferCents } from '@/utils/offlinePayment'

export interface PaymentMaterial { id: number; filename: string; size_bytes: number; content_type: string }
export interface TransferSubmission {
  version: number; status: string; reason: string | null; created_at: string
  payer: string; transfer_time: string; amount_cents: number; bank_reference: string; note: string; material_ids: number[]
}
export interface OfflinePayment {
  order_id: number; out_trade_no: string; product_type: string; amount_cents: number
  coupon_code: string | null
  order_status: string; status: string; status_label: string; current_version: number
  deadline: string | null; message: string | null; confirmed_at: string | null
  can_submit: boolean; can_cancel: boolean; can_change_coupon: boolean; can_report_exception: boolean
  account: { account_name: string; bank_name: string; account_number: string; transfer_note: string
    contact_name: string; contact_phone: string; contact_wechat: string; service_hours: string }
  submissions: TransferSubmission[]; materials: PaymentMaterial[]
}
export const paymentRequestKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
export const offlinePaymentService = {
  async detail(id: number) { return (await get<OfflinePayment>(`/api/orders/${id}/offline-payment`)).data },
  async submit(id: number, body: Record<string, unknown>, exception = false) {
    return post(`/api/orders/${id}/offline-payment/${exception ? 'exceptions' : 'submissions'}`, body)
  },
  async free(id: number) { return post(`/api/orders/${id}/offline-payment/free`) },
  async upload(id: number, path: string): Promise<PaymentMaterial> {
    const result = await Taro.uploadFile({ url: resolveUrl(`/api/orders/${id}/offline-payment/materials`),
      filePath: path, name: 'file', header: { Authorization: `Bearer ${getToken()}` } })
    if (result.statusCode === 401) throw new Error('登录已失效，请重新登录')
    let payload: { code: number; data: PaymentMaterial; message: string }
    try { payload = JSON.parse(result.data) } catch { throw new Error('凭证上传失败，请重试') }
    if (result.statusCode !== 200 || payload.code !== 0 || !payload.data?.id) throw new Error(payload.message || '凭证上传失败')
    return payload.data
  },
  async preview(id: number, material: PaymentMaterial) {
    const result = await Taro.downloadFile({ url: resolveUrl(`/api/orders/${id}/offline-payment/materials/${material.id}/content`),
      header: { Authorization: `Bearer ${getToken()}` } }).catch(() => { throw new Error('凭证获取失败，请重试') })
    if (result.statusCode !== 200 || !result.tempFilePath) throw new Error(result.statusCode === 401 ? '登录已失效，请重新登录' : '凭证获取失败，请重试')
    try {
      if (material.content_type === 'application/pdf') await Taro.openDocument({ filePath: result.tempFilePath, fileType: 'pdf', showMenu: true })
      else await Taro.previewImage({ urls: [result.tempFilePath], current: result.tempFilePath })
    } catch (reason) {
      if (/cancel/i.test(String((reason as { errMsg?: string })?.errMsg || ''))) return
      throw new Error('凭证预览失败，请重试或联系管理员')
    }
  },
}
