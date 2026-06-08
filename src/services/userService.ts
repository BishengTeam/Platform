import {
  quickQuestions,
  orders,
  orderDetails,
  certifications,
  registrationTagFilters,
  pointsBalance,
  pointRecords,
  agreements,
  examIntentions,
  teacherContacts,
  myCollections,
  registeredExams,
} from '@/constants/mock'

import type { OrderBackendItem, Order } from '@/types/orders'

import { get, post, put, del, getToken } from '@/utils/request'

import { getCertificationList } from './zoneService'

const USE_MOCK = false

// ---- 认证 ----

export async function getCertifications() {
  if (USE_MOCK) return certifications
  const res = await get<any[]>(`/api/cert/certifications`)
  return res.data
}

/**
 * 按新 schema id（number）查找 cert，同时从旧 mock 补充 price 等展示字段。
 * form.tsx / form-sangfor.tsx 使用此函数替代旧的 getCertifications().find()。
 */
export async function getCertDetail(certId: number): Promise<import('@/types').CertificationDetail | null> {
  if (USE_MOCK) {
    const certs = await getCertificationList()
    const matched = certs.find(c => c.id === certId)
    if (!matched) return null
    const oldCert = certifications.find(c => c.name === matched.name || c.chinese_name === matched.chinese_name)
    return {
      ...matched,
      price: (oldCert as any)?.price ?? 1200,
      examCode: (oldCert as any)?.examCode ?? '',
      examDuration: (oldCert as any)?.examDuration ?? '90分钟',
      questionCount: (oldCert as any)?.questionCount ?? 100,
      passingScore: (oldCert as any)?.passingScore ?? 60,
    }
  }
  const res = await get<any>(`/api/cert/certifications/${certId}`)
  const data = res.data
  return {
    ...data,
    price: data?.price ?? 0,
    examCode: data?.examCode ?? '',
    examDuration: data?.examDuration ?? '',
    questionCount: data?.questionCount ?? 0,
    passingScore: data?.passingScore ?? 0,
  } as import('@/types').CertificationDetail
}

export async function getRegistrationTagFilters() {
  if (USE_MOCK) return registrationTagFilters
  const res = await get<any[]>(`/api/cert/certifications/tags`)
  return res.data
}

// ---- 订单数据映射 ----

/** 后端状态 → 前端展示状态 */
function mapBackendStatus(status: string): Order['status'] {
  switch (status) {
    case 'pending':
      return 'pending'
    case 'paid':
    case 'completed':
      return 'enrolled'
    case 'refunded':
    case 'closed':
      return 'cancelled'
    default:
      return 'pending'
  }
}

/** 后端订单对象 → 前端 Order 展示对象 */
function toOrder(item: OrderBackendItem): Order {
  const date = item.created_at
    ? item.created_at.slice(0, 10)
    : ''
  const amount = item.price != null
    ? `¥${(item.price / 100).toFixed(2)}`
    : '免费'
  return {
    id: String(item.id),
    title: item.candidate_name || item.cert_type,
    description: `${item.cert_type}（${item.candidate_phone}）`,
    status: mapBackendStatus(item.status),
    date,
    amount,
  }
}

// ---- 用户 ----

export async function getOrders() {
  if (USE_MOCK) return orders
  const res = await get<any>(`/api/orders`)
  const data = res.data as any
  const items: OrderBackendItem[] = data?.items || data || []
  return items.map(toOrder)
}

export async function getOrderDetail(id: number) {
  if (USE_MOCK) {
    if (orderDetails[id]) return orderDetails[id]
    return Object.values(orderDetails).find(d => d.orderId === id) || null
  }
  const res = await get<any>(`/api/orders/${id}`)
  return res.data
}

export async function getPointsBalance() {
  if (USE_MOCK) return pointsBalance
  const res = await get<any>(`/api/points`)
  return res.data
}

export async function getPointRecords() {
  if (USE_MOCK) return pointRecords
  const res = await get<any>(`/api/points/history`)
  const data = res.data as any
  return data?.items || data || []
}

export async function getAgreements() {
  if (USE_MOCK) return agreements
  const res = await get<any>(`/api/agreements`)
  const data = res.data as any
  const items: any[] = data?.items || data || []
  return items.map((item: any) => ({
    id: String(item.id),
    title: item.type || '',
    status: item.status,
    content: item.content || '',
    createdAt: item.created_at || '',
    signedAt: item.status !== 'pending_sign' ? item.updated_at || undefined : undefined,
  }))
}

export async function getMyCollections() {
  if (USE_MOCK) return myCollections
  const res = await get<any>(`/api/collections`)
  const data = res.data as any
  const items: any[] = data?.items || data || []
  // 后端返回平级列表，按 target_type 拆分为 courses / materials
  const courses = items.filter((i: any) => i.target_type === 'course').map((i: any) => ({
    id: String(i.target_id),
    title: '',
    instructor: '',
    price: 0,
  }))
  const materials = items.filter((i: any) => i.target_type === 'material').map((i: any) => ({
    id: String(i.target_id),
    title: '',
    type: '',
  }))
  return { courses, materials }
}

export async function getRegisteredExams(): Promise<Array<{id: string; name: string; examCode: string; date: string; status: string; link: string}>> {
  if (USE_MOCK) return registeredExams
  const res = await get<Array<{id: number; cert_type: string; status: string; paid_at: string; created_at: string}>>('/api/orders', { status: 'paid' })
  const orders: any[] = (res.data as any)?.items || res.data || []
  return orders.map((order: any) => ({
    id: String(order.id),
    name: order.cert_type,
    examCode: order.cert_type,
    date: order.paid_at || order.created_at || '',
    status: '已报名',
    link: '',
  }))
}

// ================================================================
// P1 — 订单 / 支付
// ================================================================

/** POST /api/orders — 创建订单 */
export async function createOrder(data: {
  cert_type: string
  candidate_name: string
  candidate_phone: string
  candidate_idcard?: string
  extra_data?: Record<string, unknown>
  attachments?: string[]
}): Promise<{ id: number; status: string; created_at: string }> {
  if (USE_MOCK) return { id: Math.floor(Math.random() * 10000), status: 'pending', created_at: new Date().toISOString() }
  const res = await post<{ id: number; status: string; created_at: string }>('/api/orders', data as unknown as Record<string, unknown>)
  return res.data
}

/** POST /api/orders/{id}/pay — 预支付（获取微信支付参数） */
export async function prepayOrder(orderId: number): Promise<{
  prepay_id: string
  time_stamp: string
  nonce_str: string
  sign_type: string
  pay_sign: string
}> {
  if (USE_MOCK) {
    return {
      prepay_id: 'prepay_mock_' + orderId,
      time_stamp: String(Math.floor(Date.now() / 1000)),
      nonce_str: Math.random().toString(36).slice(2),
      sign_type: 'RSA',
      pay_sign: 'mock_sign',
    }
  }
  const res = await post<any>(`/api/orders/${orderId}/pay`)
  return res.data
}

// ================================================================
// 收藏
// ================================================================

export async function addFavorite(courseId: number): Promise<void> {
  if (USE_MOCK) return
  await post(`/api/collections`, { resource_type: 'course', resource_id: courseId })
}

export async function removeFavorite(courseId: number): Promise<void> {
  if (USE_MOCK) return
  await del(`/api/collections`, { resource_type: 'course', resource_id: courseId })
}

// ================================================================
// 打卡
// ================================================================

export async function submitCheckin(): Promise<{ streak: number }> {
  if (USE_MOCK) return { streak: 3 }
  const res = await post<{ streak: number }>('/api/checkin')
  return res.data
}

// ================================================================
// 优惠券
// ================================================================

export async function validateCoupon(code: string): Promise<{ valid: boolean; discount?: number }> {
  if (USE_MOCK) return { valid: code === 'MOCK100', discount: 100 }
  const res = await post<{ valid: boolean; discount?: number }>('/api/coupons/validate', { coupon_code: code })
  return res.data
}

// ================================================================
// 用户资料
// ================================================================

/** GET /api/user/profile — 用户资料 */
export async function getUserProfile() {
  if (USE_MOCK) {
    return {
      real_name: '张三',
      user_type: 'social',
      gender: 'male',
      phone: '138****1234',
      email: 'zhangsan@example.com',
      id_card: '110101199001011234',
      identity_status: 'verified',
      education: '本科',
      school: '清华大学',
      major: '计算机科学与技术',
      organization: '新华三集团',
    }
  }
  const res = await get<any>('/api/user/profile')
  return res.data
}

/** PUT /api/user/profile — 更新用户资料（仅接受后端 UserProfileUpdate schema 中的字段） */
export async function updateUserProfile(data: {
  phone?: string
  email?: string
  gender?: string
  education?: string
  school?: string
  major?: string
  organization?: string
}) {
  if (USE_MOCK) return
  const res = await put<any>('/api/user/profile', data as unknown as Record<string, unknown>)
  return res.data
}

// ================================================================
// AI 聊天
// ================================================================

export async function sendChatMessage(content: string): Promise<{ reply: string }> {
  if (USE_MOCK) return { reply: `您好，关于"${content}"的问题，我们已收到，请稍候...` }
  const res = await post<{ reply: string }>('/api/chat', { content })
  return res.data
}

// ================================================================
// 协议
// ================================================================

export async function createAgreement(data: { type: string; content?: string }): Promise<{ id: string }> {
  if (USE_MOCK) return { id: 'mock_agreement' }
  const res = await post<{ id: number }>('/api/agreements', { type: data.type, content: data.content })
  return { id: String(res.data.id) }
}

export async function signAgreement(agreementId: string, signatureImage: string): Promise<void> {
  if (USE_MOCK) return
  await put(`/api/agreements/${agreementId}/sign`, { signature_image: signatureImage })
}

// ================================================================
// 优惠券列表 / 工单
// ================================================================

export async function getCoupons(): Promise<Array<{ id: string; name: string; discount: number; valid_until: string }>> {
  if (USE_MOCK) return []
  const res = await get<any>('/api/coupons')
  const data = res.data as any
  const items: any[] = data?.items || data || []
  return items.map((c: any) => ({
    id: String(c.id),
    name: c.type || c.code || '',
    discount: c.value || 0,
    valid_until: c.valid_to || '',
    amount: c.value || 0,
    expire_at: c.valid_to || '',
  }))
}

export async function getTickets(): Promise<Array<{ id: string; title: string; status: string; created_at: string }>> {
  if (USE_MOCK) return []
  const res = await get<any>('/api/tickets')
  const data = res.data as any
  return data?.items || data || []
}

// ================================================================
// 文件上传
// ================================================================

export async function uploadFile(filePath: string): Promise<{ url: string }> {
  if (USE_MOCK) return { url: filePath }
  const Taro = require('@tarojs/taro').default
  const token = getToken()
  const res = await Taro.uploadFile({
    url: '/api/upload',
    filePath,
    name: 'file',
    header: { Authorization: token ? `Bearer ${token}` : '' },
  })
  const data = JSON.parse(res.data)
  if (data.code !== 0) throw new Error(data.message || '上传失败')
  return data.data
}

// ================================================================
// 深信服 / NISP 报名
// ================================================================

export async function getSangforCoupons(): Promise<Array<{ id: string; name: string; discount: number; valid_until: string }>> {
  return getCoupons()
}

export async function getSangforVerifyCode(phone: string): Promise<void> {
  if (USE_MOCK) return
  await post('/api/sms/verify-code', { phone })
}

export async function getNispPinyin(name: string): Promise<{ pinyin: string }> {
  if (USE_MOCK) return { pinyin: 'zhangsan' }
  const res = await get<{ pinyin: string }>('/api/utils/pinyin', { text: name })
  return res.data
}

export async function getNispTemplate(): Promise<Record<string, unknown>> {
  if (USE_MOCK) return {}
  const res = await get<Record<string, unknown>>('/api/system/template/nisp')
  return res.data
}

// ================================================================
// 积分
// ================================================================

export async function claimPoints(amount: number): Promise<void> {
  if (USE_MOCK) return
  await post('/api/points/claim', { amount })
}

export async function redeemPoints(amount: number): Promise<void> {
  if (USE_MOCK) return
  await post('/api/points/redeem', { amount })
}

export async function getPrices(): Promise<Array<{ cert_type: string; price: number }>> {
  if (USE_MOCK) return []
  const res = await get<any>('/api/price-config')
  const data = res.data as any
  return data?.items || data || []
}

// ================================================================
// 收藏扩展
// ================================================================

export async function addCollection(type: string, id: number): Promise<void> {
  if (USE_MOCK) return
  await post('/api/collections', { resource_type: type, resource_id: id })
}

export async function removeCollection(type: string, id: number): Promise<void> {
  if (USE_MOCK) return
  await del('/api/collections', { resource_type: type, resource_id: id })
}

// ================================================================
// 活动 / 竞赛 / 就业 (专区详细列表)
// ================================================================

export async function getActivities(): Promise<any[]> {
  if (USE_MOCK) return []
  const res = await get<any>('/api/activities')
  const data = res.data as any
  return data?.items || data || []
}

export async function registerActivity(activityId: number): Promise<void> {
  if (USE_MOCK) return
  await post(`/api/activities/${activityId}/register`)
}

export async function getCompetitionStats(): Promise<any> {
  if (USE_MOCK) return { total: 0 }
  const res = await get<any>('/api/competition/stats')
  return res.data
}

export async function getCompetitionTracks(): Promise<any[]> {
  if (USE_MOCK) return []
  const res = await get<any>('/api/competition/tracks')
  const data = res.data as any
  return data?.items || data || []
}

export async function getJobs(): Promise<any[]> {
  if (USE_MOCK) return []
  const res = await get<any>('/api/jobs')
  const data = res.data as any
  return data?.items || data || []
}

export async function createTicket(data: { title: string; description: string }): Promise<{ id: string }> {
  if (USE_MOCK) return { id: 'mock_ticket' }
  const res = await post<{ id: string }>('/api/tickets', data as unknown as Record<string, unknown>)
  return res.data
}

export async function getTicketDetail(ticketId: string): Promise<Record<string, unknown>> {
  if (USE_MOCK) return {}
  const res = await get<Record<string, unknown>>(`/api/tickets/${ticketId}`)
  return res.data
}

// ================================================================
// 分享
// ================================================================

/** POST /api/share — 生成分享链接 */
export async function createShare(data: { target_type: string; target_id: number }): Promise<{ code: string; url: string }> {
  if (USE_MOCK) return { code: 'mock_share_code', url: '' }
  const res = await post<{ code: string; url: string }>('/api/share', data as unknown as Record<string, unknown>)
  return res.data
}

/** GET /api/share/{code} — 分享追踪（通过分享码获取目标信息） */
export async function getShareInfo(code: string): Promise<Record<string, unknown>> {
  if (USE_MOCK) return { type: 'course', target_id: 1 }
  const res = await get<Record<string, unknown>>(`/api/share/${code}`)
  return res.data
}

// ================================================================
// 媒体
// ================================================================

/** GET /api/media/{file_id} — 访问/下载文件 */
export async function getMediaUrl(fileId: string): Promise<{ url: string }> {
  if (USE_MOCK) return { url: '' }
  const res = await get<{ url: string }>(`/api/media/${fileId}`)
  return res.data
}

// ================================================================
// 优惠券扩展
// ================================================================

/** POST /api/coupons/assign — 下发优惠券 */
export async function assignCoupon(data: { coupon_id?: string; user_id?: string }): Promise<void> {
  if (USE_MOCK) return
  await post('/api/coupons/assign', { coupon_code: data.coupon_id || '' })
}

/** POST /api/coupons/validate — 核销优惠券 */
export async function verifyCoupon(couponCode: string): Promise<{ valid: boolean; message?: string }> {
  if (USE_MOCK) return { valid: true }
  const res = await post<{ valid: boolean; message?: string }>('/api/coupons/validate', { coupon_code: couponCode })
  return res.data
}

// ================================================================
// 客服扩展
// ================================================================

/**
 * GET /api/chat/stream — SSE 流式消息
 * 注意：微信小程序不支持原生 SSE，实际对接时需通过 wx.request 或 WebSocket 桥接
 */
export async function streamChatMessage(): Promise<void> {
  // SSE 流式端点，小程序端通常需要特殊封装（如 wx.request enableChunked 或 WebSocket）
  // 当前仅声明端点，具体实现在对接时根据后端流式协议调整
  if (USE_MOCK) return
  await get('/api/chat/stream')
}

// ================================================================
// 系统
// ================================================================

/** GET /api/system/poster — 登录海报 */
export async function getPoster(): Promise<{ url: string }> {
  if (USE_MOCK) return { url: '' }
  const res = await get<{ url: string }>('/api/system/poster')
  return res.data
}

/** POST /api/upload — 文件上传 OSS */
export async function uploadToOss(filePath: string, token?: string): Promise<{ url: string }> {
  if (USE_MOCK) return { url: filePath }
  const Taro = require('@tarojs/taro').default
  const authToken = token || getToken()
  const res = await Taro.uploadFile({
    url: '/api/upload',
    filePath,
    name: 'file',
    header: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  })
  const data = JSON.parse(res.data) as { code: number; data: { url: string }; message: string }
  if (data.code !== 0) throw new Error(data.message || '上传失败')
  return data.data
}

/** GET /api/media/{media_id} — 文件访问 URL */
export async function getSystemMediaUrl(mediaId: string): Promise<{ url: string }> {
  if (USE_MOCK) return { url: '' }
  const res = await get<{ url: string }>(`/api/media/${mediaId}`)
  return res.data
}

// ================================================================
// 快捷问题 — 从本地静态数据升级为 API 调用（async）
// ================================================================

/**
 * GET /api/quick-questions — 推荐问题列表
 * USE_MOCK 为 true 时回退到本地 mock 数据
 */
export async function fetchQuickQuestions(): Promise<string[]> {
  if (USE_MOCK) return quickQuestions
  const res = await get<string[]>('/api/quick-questions')
  return res.data
}
