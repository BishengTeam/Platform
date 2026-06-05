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

import { get, post, put, del, getToken } from '@/utils/request'

import { getCertZone } from './zoneService'

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
    const { certifications: certs } = await getCertZone()
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
  // TODO: GET /api/cert/certifications/${certId}
  const res = await get<any>(`/api/cert/certifications/${certId}`)
  return res.data as import('@/types').CertificationDetail
}

export async function getRegistrationTagFilters() {
  if (USE_MOCK) return registrationTagFilters
  const res = await get<any[]>(`/api/cert/certifications/tags`)
  return res.data
}

// ---- 用户 ----

export async function getOrders() {
  if (USE_MOCK) return orders
  const res = await get<any[]>(`/api/orders`)
  return res.data
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
  const res = await get<any[]>(`/api/points/history`)
  return res.data
}

export async function getAgreements() {
  if (USE_MOCK) return agreements
  const res = await get<any[]>(`/api/agreements`)
  return res.data
}

export async function getExamIntentions() {
  if (USE_MOCK) return examIntentions
  const res = await get<any[]>(`/api/user/exam-intentions`)
  return res.data
}

export async function getTeacherContacts() {
  if (USE_MOCK) return teacherContacts
  const res = await get<any[]>(`/api/user/teachers`)
  return res.data
}

export async function getMyCollections() {
  if (USE_MOCK) return myCollections
  const res = await get<any[]>(`/api/collections`)
  return res.data
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
  candidate_idcard: string
  extra_data?: Record<string, unknown>
  attachments?: string[]
}): Promise<{ order_id: string }> {
  if (USE_MOCK) return { order_id: `ORD${Date.now()}` }
  const res = await post<{ order_id: string }>('/api/orders', data as unknown as Record<string, unknown>)
  return res.data
}

/** POST /api/payment/prepay — 获取微信支付参数 */
export async function prepayOrder(orderId: string): Promise<{
  timeStamp: string
  nonceStr: string
  package: string
  signType: string
  paySign: string
}> {
  if (USE_MOCK) {
    return { timeStamp: '', nonceStr: '', package: '', signType: 'MD5', paySign: '' }
  }
  const res = await post<Record<string, string>>('/api/payment/prepay', { order_id: orderId })
  return res.data as unknown as {
    timeStamp: string
    nonceStr: string
    package: string
    signType: string
    paySign: string
  }
}

// ================================================================
// P1 — 题库提交 / 收藏 / 打卡
// ================================================================

/** POST /api/quiz/collections — 收藏题目 */
export async function addFavorite(questionId: number): Promise<void> {
  if (USE_MOCK) return
  await post('/api/quiz/collections', { question_id: questionId })
}

/** DELETE /api/quiz/collections/{id} — 取消收藏 */
export async function removeFavorite(questionId: number): Promise<void> {
  if (USE_MOCK) return
  await del(`/api/quiz/collections/${questionId}`)
}

/** POST /api/quiz/checkin — 打卡 */
export async function submitCheckin(): Promise<void> {
  if (USE_MOCK) return
  await post('/api/quiz/checkin', { questions_completed: 1 })
}

// ================================================================
// P1 — 深信服 / NISP 特殊
// ================================================================

/** POST /api/coupons/validate — 验证考试券 */
export async function validateCoupon(code: string): Promise<{ valid: boolean; message?: string }> {
  if (USE_MOCK) return { valid: true }
  const res = await post<{ valid: boolean; message?: string }>('/api/coupons/validate', { code })
  return res.data
}

// ================================================================
// P2 — 用户资料 / AI / 协议 / 工单
// ================================================================

/** GET /api/user/profile — 获取用户资料 */
export async function getUserProfile(): Promise<{
  nickname: string
  avatar: string
  phone: string
  email: string
  real_name: string
  id_card: string
  education: string
  gender: string
  school: string
  major: string
  organization: string
}> {
  if (USE_MOCK) return {
    nickname: '小王同学', avatar: '', phone: '138****8888', email: 'xiaowang@example.com',
    real_name: '王小明', id_card: '330106****1234', education: '本科',
    gender: 'male', school: '电子科技大学', major: '网络工程', organization: '',
  }
  const res = await get<Record<string, string>>('/api/user/profile')
  return res.data as unknown as {
    nickname: string; avatar: string; phone: string; email: string
    real_name: string; id_card: string; education: string
    gender: string; school: string; major: string; organization: string
  }
}

/** PUT /api/user/profile — 更新用户资料 */
export async function updateUserProfile(data: Record<string, unknown>): Promise<void> {
  if (USE_MOCK) return
  await put('/api/user/profile', data)
}

/** POST /api/chat — 发送 AI 对话消息（非流式 fallback） */
export async function sendChatMessage(message: string): Promise<{ reply: string }> {
  if (USE_MOCK) return { reply: '收到您的消息，AI 助手正在处理中...' }
  const res = await post<{ reply: string }>('/api/chat', { message })
  return res.data
}

/** POST /api/agreements — 创建协议 */
export async function createAgreement(data: { type: string; content?: string }): Promise<{ id: string }> {
  if (USE_MOCK) return { id: `AGR${Date.now()}` }
  const res = await post<{ id: string }>('/api/agreements', data as unknown as Record<string, unknown>)
  return res.data
}

/** PUT /api/agreements/{id}/sign — 签名提交 */
export async function signAgreement(id: string, signatureImage: string): Promise<void> {
  if (USE_MOCK) return
  await put(`/api/agreements/${id}/sign`, { signature_image: signatureImage })
}

/** GET /api/coupons — 获取优惠券列表 */
export async function getCoupons(): Promise<Array<{ id: string; name: string; amount: number; expire_at: string }>> {
  if (USE_MOCK) return []
  const res = await get<Array<Record<string, unknown>>>('/api/coupons')
  return res.data as unknown as Array<{ id: string; name: string; amount: number; expire_at: string }>
}

/** GET /api/tickets — 获取工单列表 */
export async function getTickets(): Promise<Array<{ id: string; title: string; status: string; created_at: string }>> {
  if (USE_MOCK) return [
    { id: 'T001', title: '考试报名咨询', status: '处理中', created_at: '2026-06-01' },
  ]
  const res = await get<Array<Record<string, unknown>>>('/api/tickets')
  return res.data as unknown as Array<{ id: string; title: string; status: string; created_at: string }>
}

/**
 * POST /api/upload — 文件上传
 * 调用方需先通过 Taro.chooseImage 获取 filePath，再调用此函数
 */
export async function uploadFile(filePath: string, token?: string): Promise<{ url: string }> {
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

// ================================================================
// 深信服 / NISP / 认证导出
// ================================================================

/** GET /api/cert/sangfor/coupons — 深信服考试券列表 */
export async function getSangforCoupons(): Promise<Array<Record<string, unknown>>> {
  if (USE_MOCK) return []
  const res = await get<Array<Record<string, unknown>>>('/api/cert/sangfor/coupons')
  return res.data
}

/** GET /api/cert/sangfor/verify-code — 深信服动态验证码下发 */
export async function getSangforVerifyCode(): Promise<{ code: string }> {
  if (USE_MOCK) return { code: '123456' }
  const res = await get<{ code: string }>('/api/cert/sangfor/verify-code')
  return res.data
}

/** GET /api/cert/nisp/pinyin — NISP 拼音生成 */
export async function getNispPinyin(text: string): Promise<{ pinyin: string }> {
  if (USE_MOCK) return { pinyin: 'zhangsan' }
  const res = await get<{ pinyin: string }>('/api/cert/nisp/pinyin', { text } as unknown as Record<string, unknown>)
  return res.data
}

/** GET /api/cert/nisp/template — NISP 模板文件 */
export async function getNispTemplate(): Promise<{ url: string }> {
  if (USE_MOCK) return { url: '' }
  const res = await get<{ url: string }>('/api/cert/nisp/template')
  return res.data
}

// ================================================================
// 积分扩展 — 领取 / 兑换
// ================================================================

/** POST /api/points/claim — 领取积分 */
export async function claimPoints(pointId?: string): Promise<void> {
  if (USE_MOCK) return
  await post('/api/points/claim', pointId ? { point_id: pointId } : undefined)
}

/** POST /api/points/redeem — 积分兑换 */
export async function redeemPoints(data: { item_id: string; points: number }): Promise<void> {
  if (USE_MOCK) return
  await post('/api/points/redeem', data as unknown as Record<string, unknown>)
}

// ================================================================
// 价格配置
// ================================================================

/** GET /api/prices — 价格配置列表 */
export async function getPrices(): Promise<Array<Record<string, unknown>>> {
  if (USE_MOCK) return []
  const res = await get<Array<Record<string, unknown>>>('/api/prices')
  return res.data
}

// ================================================================
// 通用收藏（区别于题库收藏 /api/quiz/collections）
// ================================================================

/** POST /api/collections — 通用添加收藏 */
export async function addCollection(data: { type: string; target_id: number }): Promise<void> {
  if (USE_MOCK) return
  await post('/api/collections', data as unknown as Record<string, unknown>)
}

/** DELETE /api/collections/{id} — 通用取消收藏 */
export async function removeCollection(id: number): Promise<void> {
  if (USE_MOCK) return
  await del(`/api/collections/${id}`)
}

// ================================================================
// 活动扩展
// ================================================================

/** GET /api/activities — 活动列表（独立端点） */
export async function getActivities(): Promise<Array<Record<string, unknown>>> {
  if (USE_MOCK) return []
  const res = await get<Array<Record<string, unknown>>>('/api/activities')
  return res.data
}

/** POST /api/activities/register — 活动报名（主端点，含报名人信息） */
export async function registerActivity(data: { activity_id: number; name: string; phone: string; remark?: string }): Promise<void> {
  if (USE_MOCK) return
  await post('/api/activities/register', data as unknown as Record<string, unknown>)
}

// ================================================================
// 竞赛扩展
// ================================================================

/** GET /api/competition/stats — 按学校统计竞赛报名 */
export async function getCompetitionStats(): Promise<Array<Record<string, unknown>>> {
  if (USE_MOCK) return []
  const res = await get<Array<Record<string, unknown>>>('/api/competition/stats')
  return res.data
}

/** GET /api/competition/tracks — 竞赛赛道列表 */
export async function getCompetitionTracks(): Promise<Array<Record<string, unknown>>> {
  if (USE_MOCK) return []
  const res = await get<Array<Record<string, unknown>>>('/api/competition/tracks')
  return res.data
}

// ================================================================
// 岗位列表
// ================================================================

/** GET /api/jobs — 岗位列表 */
export async function getJobs(): Promise<Array<Record<string, unknown>>> {
  if (USE_MOCK) return []
  const res = await get<Array<Record<string, unknown>>>('/api/jobs')
  return res.data
}

// ================================================================
// 工单扩展
// ================================================================

/** POST /api/tickets — 创建工单 */
export async function createTicket(data: { title: string; description: string; type?: string }): Promise<{ id: string }> {
  if (USE_MOCK) return { id: `TKT${Date.now()}` }
  const res = await post<{ id: string }>('/api/tickets', data as unknown as Record<string, unknown>)
  return res.data
}

/** GET /api/tickets/{id} — 工单详情 */
export async function getTicketDetail(id: string): Promise<Record<string, unknown>> {
  if (USE_MOCK) return { id, title: '考试报名咨询', status: '处理中', created_at: '2026-06-01' }
  const res = await get<Record<string, unknown>>(`/api/tickets/${id}`)
  return res.data
}

// ================================================================
// 分享
// ================================================================

/** POST /api/share — 生成分享链接 */
export async function createShare(data: { type: string; target_id: number }): Promise<{ code: string; url: string }> {
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
  await post('/api/coupons/assign', data as unknown as Record<string, unknown>)
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