/**
 * Zone 聚合服务
 * 2026-06-03：从 dataService.ts 提取，Zone 模块从 20 个细粒度端点收敛为 6 个聚合端点
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

import { get, post } from '@/utils/request'

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

// ================================================================
// 活动报名 / 竞赛报名 / 就业投递
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
