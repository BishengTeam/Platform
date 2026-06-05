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
const USE_MOCK = false

// ---- 纯本地/静态数据（无对应 API） ----

export function getZoneIcons() { return zoneIcons }
/** @deprecated 同步版本仅返回本地 mock，请使用异步的 fetchQuickQuestions() 对接 GET /api/quick-questions */
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

// ================================================================
// 认证模块 — 登录 / 刷新 / 退出
// ================================================================

/** POST /api/auth/login — 微信 code 登录，返回 token */
export async function wxLogin(code: string): Promise<{ token: string; refresh_token?: string; expires_in?: number }> {
  if (USE_MOCK) return { token: 'mock_token_' + Date.now() }
  const res = await post<{ token: string; refresh_token?: string; expires_in?: number }>('/api/auth/login', { code })
  return res.data
}

/** POST /api/auth/refresh — 刷新 token */
export async function refreshToken(): Promise<{ token: string }> {
  if (USE_MOCK) return { token: 'mock_refreshed_' + Date.now() }
  const res = await post<{ token: string }>('/api/auth/refresh')
  return res.data
}

/** POST /api/auth/logout — 退出登录 */
export async function logout(): Promise<void> {
  if (USE_MOCK) return
  await post('/api/auth/logout')
}

// ================================================================
// 用户扩展 — 注销 / 手机号解密 / 实名认证 / 解绑
// ================================================================

/** DELETE /api/user/account — 注销账号 */
export async function deleteAccount(): Promise<void> {
  if (USE_MOCK) return
  await del('/api/user/account')
}

/** POST /api/user/phone/decrypt — 解密微信手机号 */
export async function decryptPhone(data: { encrypted_data: string; iv: string }): Promise<{ phone: string }> {
  if (USE_MOCK) return { phone: '138****8888' }
  const res = await post<{ phone: string }>('/api/user/phone/decrypt', data as unknown as Record<string, unknown>)
  return res.data
}

/** POST /api/user/identity — 提交实名认证 */
export async function submitIdentity(data: { real_name: string; id_card: string }): Promise<void> {
  if (USE_MOCK) return
  await post('/api/user/identity', data as unknown as Record<string, unknown>)
}

/** GET /api/user/identity — 查询实名认证状态 */
export async function getIdentityStatus(): Promise<{ status: string; real_name?: string; id_card?: string }> {
  if (USE_MOCK) return { status: 'verified', real_name: '王小明', id_card: '330106****1234' }
  const res = await get<{ status: string; real_name?: string; id_card?: string }>('/api/user/identity')
  return res.data
}

/** POST /api/user/unbind — 解绑手机号/微信 */
export async function unbindAccount(type: 'phone' | 'wechat'): Promise<void> {
  if (USE_MOCK) return
  await post('/api/user/unbind', { type })
}

// ================================================================
// 课程报名
// ================================================================

/** POST /api/courses/enroll — 课程报名 */
export async function enrollCourse(courseId: number): Promise<void> {
  if (USE_MOCK) return
  await post('/api/courses/enroll', { course_id: courseId })
}

// ================================================================
// 题库扩展 — 错题本写操作
// ================================================================

/** POST /api/quiz/wrong-book — 加入错题本 */
export async function addWrongBook(questionId: number): Promise<void> {
  if (USE_MOCK) return
  await post('/api/quiz/wrong-book', { question_id: questionId })
}

/** DELETE /api/quiz/wrong-book/{id} — 移出错题本 */
export async function removeWrongBook(id: number): Promise<void> {
  if (USE_MOCK) return
  await del(`/api/quiz/wrong-book/${id}`)
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

/** GET /api/cert/export — 认证报名导出 CSV */
export async function exportCertRegistrations(): Promise<{ url: string }> {
  if (USE_MOCK) return { url: '' }
  const res = await get<{ url: string }>('/api/cert/export')
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

/** GET /api/activities/export — 导出活动报名 CSV */
export async function exportActivityRegistrations(): Promise<{ url: string }> {
  if (USE_MOCK) return { url: '' }
  const res = await get<{ url: string }>('/api/activities/export')
  return res.data
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

/** GET /api/competition/export — 导出竞赛报名 CSV */
export async function exportCompetitionRegistrations(): Promise<{ url: string }> {
  if (USE_MOCK) return { url: '' }
  const res = await get<{ url: string }>('/api/competition/export')
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

/** POST /api/coupons/verify — 核销优惠券 */
export async function verifyCoupon(couponCode: string): Promise<{ valid: boolean; message?: string }> {
  if (USE_MOCK) return { valid: true }
  const res = await post<{ valid: boolean; message?: string }>('/api/coupons/verify', { coupon_code: couponCode })
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

/** POST /api/system/upload — 文件上传 OSS */
export async function uploadToOss(filePath: string, token?: string): Promise<{ url: string }> {
  if (USE_MOCK) return { url: filePath }
  const Taro = require('@tarojs/taro').default
  const authToken = token || getToken()
  const res = await Taro.uploadFile({
    url: '/api/system/upload',
    filePath,
    name: 'file',
    header: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  })
  const data = JSON.parse(res.data) as { code: number; data: { url: string }; message: string }
  if (data.code !== 0) throw new Error(data.message || '上传失败')
  return data.data
}

/** GET /api/system/media/{media_id} — 文件访问 URL */
export async function getSystemMediaUrl(mediaId: string): Promise<{ url: string }> {
  if (USE_MOCK) return { url: '' }
  const res = await get<{ url: string }>(`/api/system/media/${mediaId}`)
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