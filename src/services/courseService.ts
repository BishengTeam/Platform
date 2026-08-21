/**
 * 课程服务 — 对齐 Backend /api/courses 新契约。
 */
import { get, post, resolveUrl } from '@/utils/request'
import type {
  CourseBrief,
  CourseChapterPlayback,
  CourseChapters,
  CourseDetail,
  CourseChapterProgress,
  CoursePurchaseResponse,
} from '@/types'

export async function getCourseList(): Promise<CourseBrief[]> {
  const res = await get<{ items?: CourseBrief[] }>('/api/courses')
  return res.data?.items ?? []
}

export const getCourseListExpanded = getCourseList

export async function getCourseCategories(): Promise<string[]> {
  const res = await get<string[]>('/api/courses/categories')
  return Array.isArray(res.data) ? res.data : []
}

export async function getCourseById(id: number): Promise<CourseDetail | null> {
  const res = await get<CourseDetail>(`/api/courses/${id}`)
  return res.data ?? null
}

export async function getCourseChapters(courseId: number): Promise<CourseChapters | null> {
  const res = await get<CourseChapters>(`/api/courses/${courseId}/chapters`)
  return res.data ?? null
}

export async function getChapterPlaybackUrl(
  courseId: number,
  chapterId: number,
): Promise<CourseChapterPlayback> {
  const res = await post<CourseChapterPlayback>(
    `/api/courses/${courseId}/chapters/${chapterId}/playback-url`,
    undefined,
    false,
  )
  if (res.code !== 0 || !res.data) {
    throw new Error(res.message || '课程播放地址获取失败')
  }
  return { ...res.data, url: resolveUrl(res.data.url) }
}

export async function getCourseProgress(courseId: number): Promise<CourseChapterProgress | null> {
  const res = await get<CourseChapterProgress>(`/api/courses/${courseId}/progress`)
  return res.data ?? null
}

export async function saveCourseProgress(
  courseId: number,
  chapterId: number,
  lastPositionSeconds: number,
  isCompleted = false,
): Promise<void> {
  await post(`/api/courses/${courseId}/progress`, {
    chapter_id: chapterId,
    last_position_seconds: Math.max(0, Math.floor(lastPositionSeconds)),
    is_completed: isCompleted,
  })
}

export async function purchaseCourse(courseId: number): Promise<CoursePurchaseResponse> {
  const res = await post<CoursePurchaseResponse>(`/api/courses/${courseId}/purchase`)
  if (res.code !== 0 || !res.data) {
    throw new Error(res.message || '课程购买请求失败')
  }
  return res.data
}

const POLL_INTERVAL_MS = 2000
const POLL_MAX_ATTEMPTS = 30

export async function pollCourseAccess(courseId: number): Promise<boolean> {
  for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt += 1) {
    const course = await getCourseById(courseId)
    if (course?.has_access) return true
    if (attempt < POLL_MAX_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  }
  return false
}

interface CourseEnrollmentItem {
  id: number
  course?: {
    title?: string
    cover_url?: string
    teacher_name?: string
  }
  status?: string
}

function mapEnrollmentStatus(status?: string): 'active' | 'expired' | 'pending' | 'completed' | 'cancelled' {
  switch (status) {
    case 'enrolled':
    case 'completed':
      return 'active'
    case 'expired':
      return 'expired'
    case 'pending_payment':
      return 'pending'
    case 'refunded':
    case 'cancelled':
      return 'cancelled'
    default:
      return 'pending'
  }
}

export async function getMyCourses() {
  const res = await get<{ items?: CourseEnrollmentItem[] }>('/api/courses/my')
  const items = res.data?.items ?? []
  return items.map(item => ({
    id: String(item.id),
    title: item.course?.title || '',
    cover: item.course?.cover_url || '',
    progress: 0,
    status: mapEnrollmentStatus(item.status),
    instructor: item.course?.teacher_name || '',
    totalLessons: 0,
    completedLessons: 0,
  }))
}
