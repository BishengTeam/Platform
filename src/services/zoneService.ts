/**
 * Zone 聚合服务
 * 2026-06-03：从 dataService.ts 提取，Zone 模块从 20 个细粒度端点收敛为 6 个聚合端点
 */

import {
  zoneIcons,
  quickQuestions,
  initialMessages,
  homeCourses,
  homeActivities,
  courseList,
  competitionBannerItems,
  ongoingCompetitions,
  upcomingCompetitions,
  endedCompetitions,
  ongoingActivities,
  upcomingActivities,
  endedActivities,
  jobList,
  contactList,
  orderItems,
  profileFunctions,
  examBannerItems,
  certifications,
} from '@/constants/mock'

import { get, post, resolveUrl } from '@/utils/request'

/**
 * 递归遍历 API 响应，将 image_url / cover_url 的相对路径转为完整 URL。
 * 支持嵌套对象和数组。
 */
function resolveMedia<T>(data: T): T {
  if (data === null || data === undefined) return data
  if (Array.isArray(data)) return data.map(resolveMedia) as unknown as T
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if ((key === 'image_url' || key === 'cover_url') && typeof value === 'string') {
        result[key] = resolveUrl(value)
      } else {
        result[key] = resolveMedia(value)
      }
    }
    return result as T
  }
  return data
}

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
        cert: [
          { id: 1, title: 'H3CNE 认证', cover_url: null, description: '新华三网络工程师认证', gradient: 'linear-gradient(135deg, #1677FF, #4096FF)', icon: 'book-open', tag: '热门', tagColor: '#FF4D4F' },
          { id: 2, title: '深信服认证', cover_url: null, description: '安全技术方向认证', gradient: 'linear-gradient(135deg, #52C41A, #73D13D)', icon: 'shield', tag: '推荐', tagColor: '#52C41A' },
          { id: 3, title: 'NISP 认证', cover_url: null, description: '国家信息安全水平考试', gradient: 'linear-gradient(135deg, #FA8C16, #FFC53D)', icon: 'award', tag: '国标', tagColor: '#FA8C16' },
        ],
        study: [
          { id: 4, title: '网络基础课程', cover_url: null, description: '零基础入门到精通', gradient: 'linear-gradient(135deg, #722ED1, #9254DE)', icon: 'book-open', tag: '入门', tagColor: '#722ED1' },
        ],
        competition: [
          { id: 5, title: '网络技术大赛', cover_url: null, description: '展示技术实力赢取奖金', gradient: 'linear-gradient(135deg, #FF4D4F, #FF7875)', icon: 'trophy', tag: '进行中', tagColor: '#FF4D4F' },
        ],
        activity: [
          { id: 6, title: '线下实训营', cover_url: null, description: '7天集中培训', gradient: 'linear-gradient(135deg, #13C2C2, #36CFC9)', icon: 'users', tag: '线下', tagColor: '#13C2C2' },
        ],
        employment: [
          { id: 7, title: '网络工程师', cover_url: null, description: 'H3C 合作伙伴招聘', gradient: 'linear-gradient(135deg, #1677FF, #4096FF)', icon: 'briefcase', tag: '急招', tagColor: '#1677FF' },
          { id: 8, title: '安全运维工程师', cover_url: null, description: '深信服生态企业', gradient: 'linear-gradient(135deg, #52C41A, #73D13D)', icon: 'shield', tag: '高薪', tagColor: '#52C41A' },
        ],
      },
      courses: homeCourses as any,
      activities: homeActivities as any,
    } as HomeAggregationResponse
  }
  const res = await get<HomeAggregationResponse>('/api/zones')
  return resolveMedia(res.data)
}

/** GET /api/zones/cert — 认证专区：zone 列表 + 认证项目列表 */
export async function getCertZone(): Promise<CertZoneResponse> {
  if (USE_MOCK) return { zones: [], certifications }
  const res = await get<CertZoneResponse>('/api/zones/cert')
  return resolveMedia(res.data)
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
  return resolveMedia(res.data)
}

/** GET /api/zones/competition — 竞赛专区 */
export async function getCompetitionZone(): Promise<CompetitionZoneResponse> {
  if (USE_MOCK) {
    const all = [...ongoingCompetitions, ...upcomingCompetitions, ...endedCompetitions]
    return {
      zones: [],
      competitions: all.map((c, idx) => ({
        id: idx + 1,
        competition_name: c.title,
        school: '',
        track: null,
        created_at: new Date().toISOString(),
      })),
    }
  }
  const res = await get<CompetitionZoneResponse>('/api/zones/competition')
  return resolveMedia(res.data)
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
  return resolveMedia(res.data)
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
  return resolveMedia(res.data)
}

// ================================================================
// 活动报名 / 竞赛报名 / 就业投递
// ================================================================

/** POST /api/activities/{id}/enroll — 活动报名 */
export async function enrollActivity(
  activityId: number,
  name?: string,
  phone?: string,
  remark?: string,
): Promise<void> {
  if (USE_MOCK) return
  const body: Record<string, unknown> | undefined =
    name || phone || remark ? { name: name || '', phone: phone || '', remark: remark || null } : undefined
  await post(`/api/activities/${activityId}/enroll`, body)
}

/** POST /api/activities/{id}/remind — 活动预约提醒 */
export async function remindActivity(activityId: number): Promise<void> {
  if (USE_MOCK) return
  await post(`/api/activities/${activityId}/remind`)
}

/** POST /api/competition/signup — 竞赛报名 */
export async function signupCompetition(
  competitionName: string, school: string, track?: string,
): Promise<void> {
  if (USE_MOCK) return
  await post('/api/competition/signup', {
    competition_name: competitionName,
    school: school,
    track: track ?? null,
  })
}

/** POST /api/jobs/{id}/apply — 岗位投递 */
export async function applyJob(jobId: number): Promise<void> {
  if (USE_MOCK) return
  await post(`/api/jobs/${jobId}/apply`)
}