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

import type { OrderBackendItem, Order, OrderDetail } from '@/types/orders'
import type {
  UserProfileDetail,
  UserProfileAggregated,
  UserProfileUpdatePayload,
  UpdateIdentityPayload,
  SubmitStudentPayload,
  UpdateStudentPayload,
  SubmitEnterprisePayload,
  UpdateEnterprisePayload,
} from '@/types/profile'

import type { CheckinStatus } from '@/types/quiz'
import Taro from '@tarojs/taro'
import { get, post, put, del, getToken } from '@/utils/request'
import { getIdentityStatus } from './authService'

import { getCertificationList } from './zoneService'

const USE_MOCK = false

// ---- 认证 ----

export async function getCertifications() {
  if (USE_MOCK) return certifications
  const res = await get<CertificationResponse[]>(`/api/cert/certifications`)
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
      price: oldCert?.price ?? 1200,
      examCode: oldCert?.examCode ?? '',
      examDuration: oldCert?.examDuration ?? '90分钟',
      questionCount: oldCert?.questionCount ?? 100,
      passingScore: oldCert?.passingScore ?? 60,
    }
  }
  const res = await get<any>(`/api/cert/certifications/${certId}`)
  const data = res.data as Record<string, unknown>
  return {
    ...data,
    price: (data?.price as number) ?? 0,
    examCode: (data?.examCode as string) ?? '',
    examDuration: (data?.examDuration as string) ?? '',
    questionCount: (data?.questionCount as number) ?? 0,
    passingScore: (data?.passingScore as number) ?? 0,
  } as import('@/types').CertificationDetail
}

export async function getRegistrationTagFilters() {
  if (USE_MOCK) return registrationTagFilters
  const res = await get<import('@/types/registration').TagFilterItem[]>(`/api/cert/certifications/tags`)
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

/** 手机号脱敏：前3后4，中间星号 */
function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone || ''
  return phone.slice(0, 3) + '****' + phone.slice(-4)
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
    description: `${item.cert_type}（${maskPhone(item.candidate_phone)}）`,
    status: mapBackendStatus(item.status),
    date,
    amount,
  }
}

// ---- 用户 ----

export async function getOrders() {
  if (USE_MOCK) return orders
  const res = await get<{ items?: OrderBackendItem[] }>(`/api/orders`)
  const data = res.data
  const items: OrderBackendItem[] = data?.items || data || []
  return items.map(toOrder)
}

/** 后端订单对象 → 前端 OrderDetail 展示对象 */
function toOrderDetail(item: OrderBackendItem): OrderDetail {
  return {
    orderId: String(item.id),
    courseCover: '',
    courseTitle: item.candidate_name || item.cert_type || '',
    courseSubtitle: item.cert_type ? `${item.cert_type} · 报名` : '',
    amountPaid: item.price != null ? (item.price / 100).toFixed(2) : '0.00',
    paymentMethod: '微信支付',
    paymentTime: item.paid_at || '',
    orderTime: item.created_at || '',
  }
}

export async function getOrderDetail(id: number) {
  if (USE_MOCK) {
    const found = orderDetails[id]
    if (found) return found
    return Object.values(orderDetails).find(d => d.orderId === id) || null
  }
  const res = await get<OrderBackendItem>(`/api/orders/${id}`)
  const data = res.data
  return toOrderDetail(data)
}

export async function getPointsBalance() {
  if (USE_MOCK) return pointsBalance
  const res = await get<{ total: number; available: number }>(`/api/points`)
  return res.data
}

export async function getPointRecords() {
  if (USE_MOCK) return pointRecords
  const res = await get<{ items?: import('@/types/mine').PointRecord[] }>(`/api/points/history`)
  const data = res.data
  return data?.items || data || []
}

/** 后端协议项 DTO */
interface AgreementBackendItem {
  id: number
  type?: string
  status: string
  content?: string
  created_at?: string
  updated_at?: string
}

export async function getAgreements() {
  if (USE_MOCK) return agreements
  const res = await get<{ items?: AgreementBackendItem[] }>(`/api/agreements`)
  const data = res.data
  const items: AgreementBackendItem[] = data?.items || (Array.isArray(data) ? data : [])
  return items.map((item: AgreementBackendItem) => ({
    id: String(item.id),
    title: item.type || '',
    status: item.status,
    content: item.content || '',
    createdAt: item.created_at || '',
    signedAt: item.status !== 'pending_sign' ? item.updated_at || undefined : undefined,
  }))
}

/** 后端收藏项 DTO */
interface CollectionBackendItem {
  id: number
  target_type: string
  target_id: number
}

export async function getMyCollections() {
  if (USE_MOCK) return myCollections
  const res = await get<{ items?: CollectionBackendItem[] }>(`/api/collections`)
  const data = res.data
  const items: CollectionBackendItem[] = data?.items || (Array.isArray(data) ? data : [])
  // 后端返回平级列表，按 target_type 拆分为 courses / materials
  const courses = items.filter((i: CollectionBackendItem) => i.target_type === 'course').map((i: CollectionBackendItem) => ({
    id: String(i.target_id),
    title: '',
    instructor: '',
    price: 0,
  }))
  const materials = items.filter((i: CollectionBackendItem) => i.target_type === 'material').map((i: CollectionBackendItem) => ({
    id: String(i.target_id),
    title: '',
    type: '',
  }))
  return { courses, materials }
}

export async function getRegisteredExams(): Promise<Array<{id: string; name: string; examCode: string; date: string; status: string; link: string}>> {
  if (USE_MOCK) return registeredExams
  type RegisteredExamBackendItem = { id: number; cert_type: string; status: string; paid_at: string; created_at: string }
  const res = await get<{ items?: RegisteredExamBackendItem[] }>('/api/orders', { status: 'paid' })
  const items = res.data?.items || res.data || []
  const orders = Array.isArray(items) ? items : []
  return orders.map((order: RegisteredExamBackendItem) => ({
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

/** POST /api/payment/prepay — 预支付（获取微信支付参数） */
export async function prepayOrder(orderId: number): Promise<{
  prepay_id: string
  time_stamp: string
  nonce_str: string
  sign_type: string
  pay_sign: string
  package: string
}> {
  if (USE_MOCK) {
    return {
      prepay_id: 'prepay_mock_' + orderId,
      time_stamp: String(Math.floor(Date.now() / 1000)),
      nonce_str: Math.random().toString(36).slice(2),
      sign_type: 'RSA',
      pay_sign: 'mock_sign',
      package: 'prepay_id=prepay_mock_' + orderId,
    }
  }
  const res = await post<{ prepay_id: string; time_stamp: string; nonce_str: string; sign_type: string; pay_sign: string; package: string }>('/api/payment/prepay', { order_id: orderId })
  const data: { prepay_id: string; time_stamp: string; nonce_str: string; sign_type: string; pay_sign: string; package: string } = res.data
  // 后端返回 snake_case，显式映射确保字段一致
  return {
    prepay_id: data.prepay_id,
    time_stamp: data.time_stamp,
    nonce_str: data.nonce_str,
    sign_type: data.sign_type,
    pay_sign: data.pay_sign,
    package: data.package,
  }
}

// ================================================================
// 收藏
// ================================================================

export async function addFavorite(courseId: number): Promise<void> {
  if (USE_MOCK) return
  await post(`/api/collections`, { target_type: 'course', target_id: courseId })
}

export async function removeFavorite(courseId: number): Promise<void> {
  if (USE_MOCK) return
  await del(`/api/collections`, { target_type: 'course', target_id: courseId })
}

// ================================================================
// 打卡
// ================================================================

/** POST /api/quiz/checkin — 执行今日签到，返回签到状态 */
export async function submitCheckin(): Promise<CheckinStatus> {
  if (USE_MOCK) {
    return {
      id: 1,
      checkinDate: new Date().toISOString().slice(0, 10),
      checkedIn: true,
      questionsCompleted: 0,
      consecutiveDays: 3,
    }
  }
  const res = await post<CheckinStatus>('/api/quiz/checkin', { questions_completed: 0 })
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

/** GET /api/user/profile — 单次请求返回全量扁平数据，前端映射为聚合结构 */
export async function getUserProfile(): Promise<UserProfileAggregated> {
  if (USE_MOCK) {
    return {
      openid: 'oABC123xyz',
      created_at: '2025-09-01T08:00:00Z',
      profile: {
        nickname: '张三',
        email: 'zhangsan@example.com',
        phone: '138****1234',
        province: '四川',
        city: '成都',
        address: '高新区天府大道 999 号',
      },
      realname: {
        user_type: 'student',
        real_name: '张三',
        id_card: '110101********1234',
        id_card_front_oss: null,
        id_card_back_oss: null,
        gender: 'male',
        age: 35,
        census_register: '北京',
        identity_status: 'verified',
        reject_reason: null,
        verified_at: '2026-06-01T00:00:00Z',
        id_card_raw: '110101199001011234',
        last_name_zh: '张',
        first_name_zh: '三',
        last_name_en: 'Zhang',
        first_name_en: 'San',
        avatar_oss: null,
        birth_date: '1990-01-01',
        zip_code: '610000',
        political_status: '共青团员',
        ethnicity: '汉族',
      },
      student: {
        education: '本科',
        school: '清华大学',
        major: '计算机科学与技术',
        student_card_oss: null,
        student_status: 'verified',
        reject_reason: null,
        verified_at: '2026-06-01T00:00:00Z',
        enrollment_pdf_oss: null,
        degree_cert_oss: null,
      },
      level2_edit_count: 0,
      edit_count_limit: 5,
      edit_count_reset_hours: null,
      level2_edit_reset: '2026-07-01T00:00:00Z',
    }
  }

  const res = await get<any>('/api/user/profile')
  const d = res.data
  if (!d) throw new Error('用户数据为空')

  const isStudent = d.user_type === 'student'

  return {
    openid: d.openid || null,
    created_at: d.created_at || null,
    profile: {
      nickname: d.nickname || null,
      email: d.email || null,
      phone: d.phone || null,
      province: d.province || null,
      city: d.city || null,
      address: d.address || null,
    },
    realname: d.real_name ? {
      user_type: d.user_type || null,
      real_name: d.real_name || null,
      id_card: d.id_card || null,
      id_card_front_oss: d.id_card_front_oss || null,
      id_card_back_oss: d.id_card_back_oss || null,
      gender: d.gender || null,
      age: d.age ?? null,
      census_register: d.census_register || null,
      identity_status: d.identity_status || null,
      reject_reason: d.identity_reject_reason || null,
      verified_at: d.verified_at || null,
      id_card_raw: d.id_card_raw || null,
      last_name_zh: d.last_name_zh || null,
      first_name_zh: d.first_name_zh || null,
      last_name_en: d.last_name_en || null,
      first_name_en: d.first_name_en || null,
      avatar_oss: d.avatar_oss || null,
      birth_date: d.birth_date || null,
      zip_code: d.zip_code || null,
      political_status: d.political_status || null,
      ethnicity: d.ethnicity || null,
    } : undefined,
    student: isStudent ? {
      education: d.education || null,
      school: d.school || null,
      major: d.major || null,
      student_card_oss: d.student_card_oss || null,
      student_status: d.student_status || null,
      reject_reason: d.student_reject_reason || null,
      verified_at: d.student_verified_at || null,
      enrollment_pdf_oss: d.enrollment_pdf_oss || null,
      degree_cert_oss: d.degree_cert_oss || null,
    } : undefined,
    enterprise: !isStudent ? {
      organization: d.organization || null,
      enterprise_status: d.enterprise_status || null,
      reject_reason: d.enterprise_reject_reason || null,
      verified_at: d.enterprise_verified_at || null,
    } : undefined,
    level2_edit_count: d.edit_count ?? d.level2_edit_count ?? 0,
    edit_count_limit: d.edit_count_limit ?? 5,
    edit_count_reset_hours: d.edit_count_reset_hours ?? null,
    level2_edit_reset: d.level2_edit_reset || null,
  }
}

/** PUT /api/user/profile — 更新用户资料（重构后仅 Level-1 字段：nickname, email, phone） */
export async function updateUserProfile(data: UserProfileUpdatePayload): Promise<UserProfileAggregated> {
  if (USE_MOCK) return {
    profile: { nickname: data.nickname || '张三', email: data.email || 'zhangsan@example.com', phone: data.phone || '138****1234', province: data.province || null, city: data.city || null, address: data.address || null },
    realname: { user_type: 'student', real_name: '张三', id_card: '110101********1234', id_card_front_oss: null, id_card_back_oss: null, gender: 'male', age: 35, census_register: '北京', identity_status: 'verified', reject_reason: null, verified_at: '2026-06-01T00:00:00Z', id_card_raw: '110101199001011234', last_name_zh: null, first_name_zh: null, last_name_en: null, first_name_en: null, avatar_oss: null, birth_date: null, zip_code: null, political_status: null, ethnicity: null },
    student: { education: '本科', school: '清华大学', major: '计算机科学与技术', student_card_oss: null, student_status: 'verified', reject_reason: null, verified_at: '2026-06-01T00:00:00Z', enrollment_pdf_oss: null, degree_cert_oss: null },
    level2_edit_count: 0,
    edit_count_limit: 5,
    edit_count_reset_hours: null,
    level2_edit_reset: '2026-07-01T00:00:00Z',
  }
  const res = await put<UserProfileAggregated>('/api/user/profile', data as unknown as Record<string, unknown>)
  return res.data
}

// ================================================================
// AI 聊天
// ================================================================

export async function sendChatMessage(content: string): Promise<{ reply: string }> {
  if (USE_MOCK) return { reply: `您好，关于"${content}"的问题，我们已收到，请稍候...` }
  const res = await post<{ reply: string }>('/api/chat', { message: content })
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
  type CouponBackendItem = { id: number; type?: string; code?: string; value?: number; valid_to?: string }
  const res = await get<{ items?: CouponBackendItem[] }>('/api/coupons')
  const data = res.data
  const items: CouponBackendItem[] = data?.items || (Array.isArray(data) ? data : [])
  return items.map((c: CouponBackendItem) => ({
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
  const res = await get<{ items?: Array<{ id: number; title: string; status: string; created_at: string }> }>('/api/tickets')
  const data = res.data
  return data?.items || data || []
}

// ================================================================
// 文件上传
// ================================================================

export async function uploadFile(filePath: string): Promise<{ url: string }> {
  if (USE_MOCK) return { url: filePath }
  const token = getToken()
  const baseUrl = (process.env.TARO_APP_API_BASE || '').replace(/\/+$/, '')
  const res = await Taro.uploadFile({
    url: `${baseUrl}/api/upload`,
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
  await post('/api/cert/sangfor/verify-code', { phone })
}

export async function getNispPinyin(name: string): Promise<{ pinyin: string }> {
  if (USE_MOCK) return { pinyin: 'zhangsan' }
  const res = await get<{ pinyin: string }>('/api/cert/nisp/pinyin', { text: name })
  return res.data
}

export async function getNispTemplate(): Promise<Record<string, unknown>> {
  if (USE_MOCK) return {}
  const res = await get<Record<string, unknown>>('/api/cert/nisp/template')
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
  const res = await get<{ items?: Array<{ cert_type: string; price: number }> }>('/api/prices')
  const data = res.data
  return data?.items || data || []
}

// ================================================================
// 收藏扩展
// ================================================================

export async function addCollection(type: string, id: number): Promise<void> {
  if (USE_MOCK) return
  await post('/api/collections', { target_type: type, target_id: id })
}

export async function removeCollection(type: string, id: number): Promise<void> {
  if (USE_MOCK) return
  await del('/api/collections', { target_type: type, target_id: id })
}

// ================================================================
// 活动 / 竞赛 / 就业 (专区详细列表)
// ================================================================

export async function getActivities(): Promise<import('@/types').ActivityBrief[]> {
  if (USE_MOCK) return []
  const res = await get<{ items?: import('@/types').ActivityBrief[] }>('/api/activities')
  const data = res.data
  return data?.items || data || []
}

export async function registerActivity(activityId: number): Promise<void> {
  if (USE_MOCK) return
  await post(`/api/activities/${activityId}/register`)
}

export async function getCompetitionStats(): Promise<{ total: number }> {
  if (USE_MOCK) return { total: 0 }
  const res = await get<{ total: number }>('/api/competition/stats')
  return res.data
}

/** GET /api/competition/tracks — 后端返回赛道名列表 */
export async function getCompetitionTracks(): Promise<string[]> {
  if (USE_MOCK) return []
  const res = await get<{ tracks: string[] }>('/api/competition/tracks')
  return res.data?.tracks || []
}

export async function getJobs(): Promise<import('@/types').JobBrief[]> {
  if (USE_MOCK) return []
  const res = await get<{ items?: import('@/types').JobBrief[] }>('/api/jobs')
  const data = res.data
  return data?.items || data || []
}

export async function createTicket(data: { title: string; description: string }): Promise<{ id: string }> {
  if (USE_MOCK) return { id: 'mock_ticket' }
  const res = await post<{ id: string }>('/api/tickets', { content: data.title + '\n' + data.description } as unknown as Record<string, unknown>)
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
  const res = await post<{ code: string; share_url: string }>('/api/share', data as unknown as Record<string, unknown>)
  return { code: res.data.code, url: res.data.share_url }
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

// ================================================================
// Level-2 身份信息管理（重构新增）
// ================================================================

/** POST /api/user/identity — 修改实名信息（触发审核） */
export async function updateIdentity(data: UpdateIdentityPayload): Promise<UserProfileAggregated> {
  if (USE_MOCK) {
    return {
      profile: { nickname: '张三', email: 'zhangsan@example.com', phone: '138****1234', province: null, city: null, address: null },
      realname: {
        user_type: data.user_type || 'student',
        real_name: data.real_name || '张三',
        id_card: (data.id_card_number || '110101********1234').slice(0, 6) + '********' + (data.id_card_number || '110101********1234').slice(-4),
        id_card_front_oss: data.id_card_front_oss || null,
        id_card_back_oss: data.id_card_back_oss || null,
        gender: 'male', age: 35,
        census_register: '四川成都',
        identity_status: 'pending', reject_reason: null, verified_at: null,
        id_card_raw: data.id_card_number || '110101199001011234', last_name_zh: null, first_name_zh: null,
        last_name_en: null, first_name_en: null, avatar_oss: null, birth_date: null, zip_code: null, political_status: null, ethnicity: null,
      },
      student: { education: '本科', school: '清华大学', major: '计算机科学与技术', student_card_oss: null, student_status: 'verified', reject_reason: null, verified_at: '2026-06-01T00:00:00Z', enrollment_pdf_oss: null, degree_cert_oss: null },
      level2_edit_count: 1,
      level2_edit_reset: '2026-07-01T00:00:00Z',
    }
  }
  const res = await post<UserProfileAggregated>('/api/user/identity', data as unknown as Record<string, unknown>)
  return res.data
}

/** POST /api/user/student — 首次提交学生信息（触发审核） */
export async function submitStudent(data: SubmitStudentPayload): Promise<UserProfileAggregated> {
  if (USE_MOCK) {
    return {
      profile: { nickname: '张三', email: 'zhangsan@example.com', phone: '138****1234', province: null, city: null, address: null },
      realname: { user_type: 'student', real_name: '张三', id_card: '110101********1234', id_card_front_oss: null, id_card_back_oss: null, gender: 'male', age: 35, census_register: '北京', identity_status: 'verified', reject_reason: null, verified_at: '2026-06-01T00:00:00Z', id_card_raw: '110101199001011234', last_name_zh: null, first_name_zh: null, last_name_en: null, first_name_en: null, avatar_oss: null, birth_date: null, zip_code: null, political_status: null, ethnicity: null },
      student: { ...data, student_card_oss: data.student_card_oss || null, student_status: 'pending', reject_reason: null, verified_at: null, enrollment_pdf_oss: data.enrollment_pdf_oss || null, degree_cert_oss: data.degree_cert_oss || null },
      level2_edit_count: 1,
      level2_edit_reset: '2026-07-01T00:00:00Z',
    }
  }
  const res = await post<UserProfileAggregated>('/api/user/student', data as unknown as Record<string, unknown>)
  return res.data
}

/** POST /api/user/student — 修改学生信息（触发审核） */
export async function updateStudent(data: UpdateStudentPayload): Promise<UserProfileAggregated> {
  if (USE_MOCK) {
    return {
      profile: { nickname: '张三', email: 'zhangsan@example.com', phone: '138****1234', province: null, city: null, address: null },
      realname: { user_type: 'student', real_name: '张三', id_card: '110101********1234', id_card_front_oss: null, id_card_back_oss: null, gender: 'male', age: 35, census_register: '北京', identity_status: 'verified', reject_reason: null, verified_at: '2026-06-01T00:00:00Z', id_card_raw: '110101199001011234', last_name_zh: null, first_name_zh: null, last_name_en: null, first_name_en: null, avatar_oss: null, birth_date: null, zip_code: null, political_status: null, ethnicity: null },
      student: { education: data.education || '本科', school: data.school || '清华大学', major: data.major || '计算机科学与技术', student_card_oss: data.student_card_oss || null, student_status: 'pending', reject_reason: null, verified_at: null, enrollment_pdf_oss: data.enrollment_pdf_oss || null, degree_cert_oss: data.degree_cert_oss || null },
      level2_edit_count: 1,
      level2_edit_reset: '2026-07-01T00:00:00Z',
    }
  }
  const res = await post<UserProfileAggregated>('/api/user/student', data as unknown as Record<string, unknown>)
  return res.data
}

/** POST /api/user/enterprise — 首次提交企业信息（触发审核） */
export async function submitEnterprise(data: SubmitEnterprisePayload): Promise<UserProfileAggregated> {
  if (USE_MOCK) {
    return {
      profile: { nickname: '张三', email: 'zhangsan@example.com', phone: '138****1234', province: null, city: null, address: null },
      realname: { user_type: 'enterprise', real_name: '张三', id_card: '110101********1234', id_card_front_oss: null, id_card_back_oss: null, gender: 'male', age: 35, census_register: '北京', identity_status: 'verified', reject_reason: null, verified_at: '2026-06-01T00:00:00Z', id_card_raw: '110101199001011234', last_name_zh: null, first_name_zh: null, last_name_en: null, first_name_en: null, avatar_oss: null, birth_date: null, zip_code: null, political_status: null, ethnicity: null },
      enterprise: { ...data, enterprise_status: 'pending', reject_reason: null, verified_at: null },
      level2_edit_count: 1,
      level2_edit_reset: '2026-07-01T00:00:00Z',
    }
  }
  const res = await post<UserProfileAggregated>('/api/user/enterprise', data as unknown as Record<string, unknown>)
  return res.data
}

/** POST /api/user/enterprise — 修改企业信息（触发审核） */
export async function updateEnterprise(data: UpdateEnterprisePayload): Promise<UserProfileAggregated> {
  if (USE_MOCK) {
    return {
      profile: { nickname: '张三', email: 'zhangsan@example.com', phone: '138****1234', province: null, city: null, address: null },
      realname: { user_type: 'enterprise', real_name: '张三', id_card: '110101********1234', id_card_front_oss: null, id_card_back_oss: null, gender: 'male', age: 35, census_register: '北京', identity_status: 'verified', reject_reason: null, verified_at: '2026-06-01T00:00:00Z', id_card_raw: '110101199001011234', last_name_zh: null, first_name_zh: null, last_name_en: null, first_name_en: null, avatar_oss: null, birth_date: null, zip_code: null, political_status: null, ethnicity: null },
      enterprise: { organization: data.organization || '新华三集团', enterprise_status: 'pending', reject_reason: null, verified_at: null },
      level2_edit_count: 1,
      level2_edit_reset: '2026-07-01T00:00:00Z',
    }
  }
  const res = await post<UserProfileAggregated>('/api/user/enterprise', data as unknown as Record<string, unknown>)
  return res.data
}