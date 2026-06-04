/**
 * @note 当前所有函数为 mock 直通层。接入真实 API 后，需在此层承担请求、数据转换、缓存等职责。
 * @note USE_MOCK 开关控制 mock/API 双模切换
 * @note 2026-06-03：Zone 模块从 20 个细粒度端点收敛为 6 个聚合端点
 */

import {
  zoneIcons,
  quickQuestions,
  initialMessages,
  courseList,
  competitionBannerItems,
  ongoingCompetitions,
  upcomingCompetitions,
  endedCompetitions,
  activityBannerItems,
  ongoingActivities,
  upcomingActivities,
  endedActivities,
  jobList,
  contactList,
  orderItems,
  profileFunctions,
  orders,
  orderDetails,
  certifications,
  registrationTagFilters,
  courseCategories,
  quizCategories,
  quizQuestions,
  wrongBook,
  favoriteQuestions,
  checkinRecords,
  myCourses,
  pointsBalance,
  pointRecords,
  agreements,
  examIntentions,
  teacherContacts,
  myCollections,
  registeredExams,
} from '@/constants/mock'

import { get, post, put, del, getToken } from '@/utils/request'

import type {
  HomeAggregationResponse,
  CertZoneResponse,
  StudyZoneResponse,
  CompetitionZoneResponse,
  ActivityZoneResponse,
  EmploymentZoneResponse,
} from '@/types'

/** 全局开关：true=mock，false=真实API */
const USE_MOCK = true

// ---- 纯本地/静态数据（无对应 API） ----

export function getZoneIcons() { return zoneIcons }
export function getQuickQuestions() { return quickQuestions }
export function getInitialMessages() { return initialMessages }
export function getContactList() { return contactList }
export function getOrderItems() { return orderItems }
export function getProfileFunctions() { return profileFunctions }
export function getExamBannerItems() { return examBannerItems }

// ================================================================
// Zone 聚合端点（2026-06-03 重构）
// ================================================================

/** GET /api/zones — 首页聚合：Banner + 所有专区卡片 */
export async function getHomeAggregation(): Promise<HomeAggregationResponse> {
  if (USE_MOCK) {
    return {
      banners: competitionBannerItems.map((item, idx) => ({
        id: idx + 1,
        image_url: item.image,
        jump_link: item.link || null,
        sort: idx,
      })),
      zones: {
        cert: [{ id: 1, title: '认证专区', cover_url: null, description: 'H3CNE 等认证考试报名' }],
        study: [{ id: 2, title: '学习专区', cover_url: null, description: '在线课程与培训' }],
        competition: [{ id: 3, title: '竞赛专区', cover_url: null, description: '技术竞赛与挑战' }],
        activity: [{ id: 4, title: '活动专区', cover_url: null, description: '线上线下活动' }],
        employment: [{ id: 5, title: '就业专区', cover_url: null, description: '优质岗位推荐' }],
      },
    }
  }
  const res = await get<HomeAggregationResponse>('/api/zones')
  return res.data
}

/** GET /api/zones/cert — 认证专区：zone 列表 + 认证项目列表 */
export async function getCertZone(): Promise<CertZoneResponse> {
  if (USE_MOCK) return { zones: [], certifications }
  const res = await get<CertZoneResponse>('/api/zones/cert')
  return res.data
}

/** GET /api/zones/study — 学习专区：zone 列表 + 课程列表 */
export async function getStudyZone(): Promise<StudyZoneResponse> {
  if (USE_MOCK) return { zones: [], courses: courseList.map(c => ({
    id: Number(c.id) || 0,
    title: c.title,
    category: c.tag || '',
    description: c.desc || null,
    cover_url: c.image || null,
    price: c.price ?? 0,
    teacher_name: c.instructor || null,
  })) }
  const res = await get<StudyZoneResponse>('/api/zones/study')
  return res.data
}

/** GET /api/zones/competition — 竞赛专区 */
export async function getCompetitionZone(): Promise<CompetitionZoneResponse> {
  if (USE_MOCK) {
    const all = [...ongoingCompetitions, ...upcomingCompetitions, ...endedCompetitions]
    return {
      zones: [],
      competitions: all.map((c, idx) => ({
        id: idx + 1,
        competition_name: c.name,
        school: c.school || '',
        track: null,
        created_at: new Date().toISOString(),
      })),
    }
  }
  const res = await get<CompetitionZoneResponse>('/api/zones/competition')
  return res.data
}

/** GET /api/zones/activity — 活动专区 */
export async function getActivityZone(): Promise<ActivityZoneResponse> {
  if (USE_MOCK) {
    const all = [...ongoingActivities, ...upcomingActivities, ...endedActivities]
    return {
      zones: [],
      activities: all.map(a => ({
        id: (a as any).id ?? 0,
        title: a.name || (a as any).title || '',
        description: a.desc || null,
        cover_url: (a as any).image || null,
        location: (a as any).location || null,
        start_time: (a as any).startDate || null,
        end_time: (a as any).endDate || null,
        max_participants: ((a as any).current ?? 0) + ((a as any).remaining ?? 0),
      })),
    }
  }
  const res = await get<ActivityZoneResponse>('/api/zones/activity')
  return res.data
}

/** GET /api/zones/employment — 就业专区 */
export async function getEmploymentZone(): Promise<EmploymentZoneResponse> {
  if (USE_MOCK) {
    return {
      zones: [],
      jobs: jobList.map((j, idx) => ({
        id: idx + 1,
        title: j.title,
        company: j.company,
        location: j.location || null,
        salary_range: j.salary || null,
        description: j.description || null,
        requirements: null,
        contact_info: null,
      })),
    }
  }
  const res = await get<EmploymentZoneResponse>('/api/zones/employment')
  return res.data
}

// ---- 课程 ----

export async function getCourseList() {
  if (USE_MOCK) return courseList
  const res = await get<any[]>(`/api/courses`)
  return res.data
}

export async function getCourseListExpanded() {
  if (USE_MOCK) return courseList
  const res = await get<any[]>(`/api/courses`)
  return res.data
}

export async function getCourseCategories() {
  if (USE_MOCK) return courseCategories
  const res = await get<any[]>(`/api/courses/categories`)
  return res.data
}

export async function getCourseById(id: string) {
  if (USE_MOCK) return courseList.find(c => c.id === id) || null
  const res = await get<any>(`/api/courses/${id}`)
  return res.data
}

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

// ---- 答题 ----

export async function getQuizCategories() {
  if (USE_MOCK) return quizCategories
  const res = await get<any[]>(`/api/quiz/categories`)
  return res.data
}

export async function getQuizQuestions(categoryId?: string) {
  if (USE_MOCK) {
    if (categoryId) return quizQuestions.filter(q => q.categoryId === categoryId)
    return quizQuestions
  }
  const res = await get<any[]>(`/api/quiz/questions`, categoryId ? { categoryId } : undefined)
  return res.data
}

export async function getWrongBook() {
  if (USE_MOCK) return wrongBook
  const res = await get<any[]>(`/api/quiz/wrong-book`)
  return res.data
}

export async function getFavoriteQuestions() {
  if (USE_MOCK) return favoriteQuestions
  const res = await get<any[]>(`/api/quiz/collections`)
  return res.data
}

export async function getCheckinRecords() {
  if (USE_MOCK) return checkinRecords
  const res = await get<any[]>(`/api/quiz/checkin`)
  return res.data
}

// ---- 用户 ----

export async function getMyCourses() {
  if (USE_MOCK) return myCourses
  const res = await get<any[]>(`/api/courses/my`)
  return res.data
}

export async function getOrders() {
  if (USE_MOCK) return orders
  const res = await get<any[]>(`/api/orders`)
  return res.data
}

export async function getOrderDetail(id: string) {
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

export async function getRegisteredExams() {
  if (USE_MOCK) return registeredExams
  const res = await get<any[]>(`/api/user/exams`)
  return res.data
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

/** POST /api/quiz/submit — 提交单题答案 */
export async function submitQuizAnswer(data: {
  question_id: string
  answer: number | number[]
  is_correct: boolean
}): Promise<void> {
  if (USE_MOCK) return
  await post('/api/quiz/submit', data as unknown as Record<string, unknown>)
}

/** POST /api/quiz/collections — 收藏题目 */
export async function addFavorite(questionId: string): Promise<void> {
  if (USE_MOCK) return
  await post('/api/quiz/collections', { question_id: questionId })
}

/** DELETE /api/quiz/collections/{id} — 取消收藏 */
export async function removeFavorite(questionId: string): Promise<void> {
  if (USE_MOCK) return
  await del(`/api/quiz/collections/${questionId}`)
}

/** POST /api/quiz/checkin — 打卡 */
export async function submitCheckin(): Promise<void> {
  if (USE_MOCK) return
  await post('/api/quiz/checkin')
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

/** POST /api/verification/send — 发送动态验证码 */
export async function sendVerificationCode(phone: string): Promise<void> {
  if (USE_MOCK) return
  await post('/api/verification/send', { phone })
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

// ================================================================
// P3 — 活动报名 / 竞赛报名 / 就业投递 / 上传
// ================================================================

/** POST /api/activities/{id}/enroll — 活动报名 */
export async function enrollActivity(activityId: number): Promise<void> {
  if (USE_MOCK) return
  await post(`/api/activities/${activityId}/enroll`)
}

/** POST /api/activities/{id}/remind — 活动预约提醒 */
export async function remindActivity(activityId: number): Promise<void> {
  if (USE_MOCK) return
  await post(`/api/activities/${activityId}/remind`)
}

/** POST /api/competition/signup — 竞赛报名 */
export async function signupCompetition(competitionId: number): Promise<void> {
  if (USE_MOCK) return
  await post('/api/competition/signup', { competition_id: competitionId })
}

/** POST /api/jobs/{id}/apply — 岗位投递 */
export async function applyJob(jobId: number): Promise<void> {
  if (USE_MOCK) return
  await post(`/api/jobs/${jobId}/apply`)
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
