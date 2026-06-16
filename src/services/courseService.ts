/**
 * 课程服务 — 对齐 Backend /api/courses 端点
 *
 * 2026-06-16 修正：
 *   - getCourseById 返回 CourseDetail（对齐后端 CourseDetailResponse）
 *   - getCourseCategories 适配后端 string[] 响应
 */
import { courseList, courseCategories, myCourses } from '@/constants/mock'
import { get, post } from '@/utils/request'
import type { CourseBrief, CourseDetail } from '@/types'

/** 全局开关：true=mock，false=真实API */
const USE_MOCK = false

export async function getCourseList() {
  if (USE_MOCK) return courseList
  const res = await get<{ items?: CourseBrief[] }>(`/api/courses`)
  const data = res.data
  return data?.items || data || []
}

export async function getCourseListExpanded() {
  if (USE_MOCK) return courseList
  const res = await get<CourseBrief[]>(`/api/courses`)
  return res.data
}

/** GET /api/courses/categories — 后端返回 string[] */
export async function getCourseCategories(): Promise<string[]> {
  if (USE_MOCK) return courseCategories.map((c: { label: string }) => c.label)
  const res = await get<string[]>(`/api/courses/categories`)
  const raw: string[] = Array.isArray(res.data) ? res.data : []
  return raw
}

/** GET /api/courses/{id} — 后端返回 CourseDetailResponse */
export async function getCourseById(id: number): Promise<CourseDetail | null> {
  if (USE_MOCK) return null
  const res = await get<CourseDetail>(`/api/courses/${id}`)
  return res.data ?? null
}

/** 后端课程报名响应 DTO */
interface CourseEnrollmentItem {
  id: number
  course?: {
    title?: string
    cover_url?: string
    teacher_name?: string
  }
  status?: string
}

/** GET /api/courses/my — 我的课程，适配后端 CourseEnrollmentResponse → MyCourse */
export async function getMyCourses() {
  if (USE_MOCK) return myCourses
  const res = await get<{ items?: CourseEnrollmentItem[] }>(`/api/courses/my`)
  const data = res.data
  const items: CourseEnrollmentItem[] = data?.items || (Array.isArray(data) ? data : [])
  return items.map((item: CourseEnrollmentItem) => ({
    id: String(item.id),
    title: item.course?.title || '',
    cover: item.course?.cover_url || '',
    progress: 0,
    status: (item.status === 'enrolled'
      ? 'active'
      : item.status === 'expired'
        ? 'expired'
        : 'pending') as 'active' | 'expired' | 'pending',
    instructor: item.course?.teacher_name || '',
    totalLessons: 0,
    completedLessons: 0,
  }))
}

/** POST /api/courses/enroll — 课程报名 */
export async function enrollCourse(courseId: number): Promise<void> {
  if (USE_MOCK) return
  await post('/api/courses/enroll', { course_id: courseId })
}