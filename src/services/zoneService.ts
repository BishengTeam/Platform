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
  competitionBannerItems,
  ongoingCompetitions,
  upcomingCompetitions,
  endedCompetitions,
  contactList,
  orderItems,
  profileFunctions,
  examBannerItems,
} from '@/constants/mock'

/** 从竞赛 mock 数据派生 CompetitionBrief 列表（用于聚合端点覆盖前） */
function mockCompetitionBriefs(): import('@/types').CompetitionBrief[] {
  const all = [...ongoingCompetitions, ...upcomingCompetitions]
  return all.map(c => ({
    id: c.id,
    competition_name: c.title,
    school: '',
    track: null,
    created_at: c.startTime,
  })) as import('@/types').CompetitionBrief[]
}

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
  ZoneSectionData,
  TrainingBrief,
  CourseBrief,
  ActivityBrief,
  CompetitionBrief,
  JobBrief,
  CertificationResponse,
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
        cert: {
          items: [
            { id: 1, zone_type: 'cert', title: 'H3CNE 认证', cover_url: null, description: '新华三网络工程师认证', link_url: null, gradient: 'linear-gradient(135deg, #1677FF, #4096FF)', icon: 'book-open', tag: '热门', tagColor: '#FF4D4F', sort_order: 0 },
            { id: 2, zone_type: 'cert', title: '深信服认证', cover_url: null, description: '安全技术方向认证', link_url: null, gradient: 'linear-gradient(135deg, #52C41A, #73D13D)', icon: 'shield', tag: '推荐', tagColor: '#52C41A', sort_order: 1 },
            { id: 3, zone_type: 'cert', title: 'NISP 认证', cover_url: null, description: '国家信息安全水平考试', link_url: null, gradient: 'linear-gradient(135deg, #FA8C16, #FFC53D)', icon: 'award', tag: '国标', tagColor: '#FA8C16', sort_order: 2 },
          ],
        },
        study: {
          items: [
            { id: 4, zone_type: 'study', title: '网络基础课程', cover_url: null, description: '零基础入门到精通', link_url: null, gradient: 'linear-gradient(135deg, #722ED1, #9254DE)', icon: 'book-open', tag: '入门', tagColor: '#722ED1', sort_order: 0 },
          ],
          courses: homeCourses as any,
        },
        competition: {
          items: [
            { id: 5, zone_type: 'competition', title: '网络技术大赛', cover_url: null, description: '展示技术实力赢取奖金', link_url: null, gradient: 'linear-gradient(135deg, #FF4D4F, #FF7875)', icon: 'trophy', tag: '进行中', tagColor: '#FF4D4F', sort_order: 0 },
          ],
        },
        activity: {
          items: [
            { id: 6, zone_type: 'activity', title: '线下实训营', cover_url: null, description: '7天集中培训', link_url: null, gradient: 'linear-gradient(135deg, #13C2C2, #36CFC9)', icon: 'users', tag: '线下', tagColor: '#13C2C2', sort_order: 0 },
          ],
          activities: homeActivities as any,
        },
        employment: {
          items: [
            { id: 7, zone_type: 'employment', title: '网络工程师', cover_url: null, description: 'H3C 合作伙伴招聘', link_url: null, gradient: 'linear-gradient(135deg, #1677FF, #4096FF)', icon: 'briefcase', tag: '急招', tagColor: '#1677FF', sort_order: 0 },
            { id: 8, zone_type: 'employment', title: '安全运维工程师', cover_url: null, description: '深信服生态企业', link_url: null, gradient: 'linear-gradient(135deg, #52C41A, #73D13D)', icon: 'shield', tag: '高薪', tagColor: '#52C41A', sort_order: 1 },
          ],
        },
      },
    } as HomeAggregationResponse
  }
  const res = await get<HomeAggregationResponse>('/api/zones')
  return resolveMedia(res.data)
}

/** GET /api/courses — 课程列表 */
export async function getCourseList(): Promise<CourseBrief[]> {
  if (USE_MOCK) return []
  const res = await get<any>('/api/courses')
  return res.data?.items || res.data || []
}

/** GET /api/activities — 活动列表 */
export async function getActivityList(): Promise<ActivityBrief[]> {
  if (USE_MOCK) return []
  const res = await get<any>('/api/activities')
  return res.data?.items || res.data || []
}

/** GET /api/jobs — 岗位列表 */
export async function getJobList(): Promise<JobBrief[]> {
  if (USE_MOCK) return []
  const res = await get<any>('/api/jobs')
  return res.data?.items || res.data || []
}

/** GET /api/cert/certifications — 认证列表 */
export async function getCertificationList(): Promise<CertificationResponse[]> {
  if (USE_MOCK) return []
  const res = await get<any>('/api/cert/certifications')
  return res.data?.items || res.data || []
}

// ================================================================
// 活动报名 / 竞赛报名 / 就业投递
// ================================================================

/** POST /api/activities/{activity_id}/enroll — 活动报名 */
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

/** POST /api/activities/{activity_id}/remind — 活动预约提醒 */
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

// ================================================================
// 竞赛列表（Phase 5 补充 — 代替已移除的 getCompetitionZone）
// ================================================================
/** GET /api/competition/tracks → CompetitionBrief[] — 竞赛列表 */
export async function getCompetitionList(): Promise<CompetitionBrief[]> {
  if (USE_MOCK) return mockCompetitionBriefs()
  const res = await get<any>('/api/competition/tracks')
  const raw: any[] = res.data?.items || res.data || []
  return raw.map((item: any) => ({
    id: item.id ?? 0,
    competition_name: item.competition_name || item.name || item.title || '',
    school: item.school || '',
    track: item.track ?? null,
    created_at: item.created_at || item.start_time || '',
  }))
}