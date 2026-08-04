/**
 * 课程服务 — 对齐 Backend /api/courses 端点
 *
 * 2026-06-16 修正：
 *   - getCourseById 返回 CourseDetail（对齐后端 CourseDetailResponse）
 *   - getCourseCategories 适配后端 string[] 响应
 */
import { courseList, courseCategories, myCourses } from '@/constants/mock'
import { get, post } from '@/utils/request'
import type { CourseBrief, CourseDetail, CoursePurchaseResponse, CourseContent } from '@/types'

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
  const res = await get<{ items?: CourseBrief[] }>(`/api/courses`)
  return res.data?.items || res.data || []
}

/** GET /api/courses/categories — 后端返回 string[] */
export async function getCourseCategories(): Promise<string[]> {
  if (USE_MOCK) return courseCategories.map((c: { label: string }) => c.label)
  const res = await get<string[]>(`/api/courses/categories`)
  const raw: string[] = Array.isArray(res.data) ? res.data : []
  return raw
}

/** 课程详情 mock 开关 — 配合 zoneService 的 USE_MOCK_COURSE_LIST 使用 */
const USE_MOCK_DETAIL = false

/** GET /api/courses/{id} — 后端返回 CourseDetailResponse */
export async function getCourseById(id: number): Promise<CourseDetail | null> {
  console.log('[getCourseById] called with id:', id, 'USE_MOCK_DETAIL:', USE_MOCK_DETAIL, 'courseList.length:', courseList.length)
  if (USE_MOCK_DETAIL) {
    // getCourseList mock 用 index+1 作为 ID，这里按下标取
    console.log('[getCourseById] mock branch, id:', id)
    if (id < 1 || id > courseList.length) { console.log('[getCourseById] id out of range, returning null'); return null }
    const c = courseList[id - 1]
    return {
      id,
      title: c.title,
      category: c.category,
      description: c.description,
      cover_url: c.cover || null,
      video_url: null,
      price: c.price,
      batches: c.sessions?.length
        ? Object.fromEntries(
            c.sessions.map((schedule) => [
              schedule.id,
              {
                class_date: schedule.startDate,
                start_time: '09:00',
                end_time: '12:00',
                location: null,
              },
            ]),
          )
        : null,
      teacher_name: c.instructor || null,
      teacher_contact: null,
      has_access: false,
      enrollment_id: null,
      chapters: [],
      free_preview_seconds: null,
    }
  }
  const res = await get<CourseDetail>(`/api/courses/${id}`)
  return res.data ?? null
}

/** POST /api/courses/{course_id}/purchase — 课程购买/报名 */
export async function purchaseCourse(courseId: number): Promise<CoursePurchaseResponse> {
  if (USE_MOCK) {
    return { learning_access: true, payment_required: false, order_id: null }
  }
  const res = await post<CoursePurchaseResponse>(`/api/courses/${courseId}/purchase`)
  if (res.code !== 0 || !res.data) {
    throw new Error(res.message || '课程购买请求失败')
  }
  return res.data
}

/** GET /api/courses/{course_id}/content — 课程内容（学习页） */
export async function getCourseContent(courseId: number): Promise<CourseContent | null> {
  if (USE_MOCK) {
    const detail = await getCourseById(courseId)
    return detail
      ? {
          id: detail.id,
          title: detail.title,
          description: detail.description,
          cover_url: detail.cover_url,
          video_url: detail.video_url,
          teacher_name: detail.teacher_name,
          has_access: detail.has_access,
          chapters: detail.chapters,
        }
      : null
  }
  const res = await get<CourseContent>(`/api/courses/${courseId}/content`)
  return res.data ?? null
}

const POLL_INTERVAL_MS = 2000
const POLL_MAX_ATTEMPTS = 30

/** 轮询课程详情，直到 has_access 变为 true */
export async function pollCourseAccess(courseId: number): Promise<boolean> {
  for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt++) {
    const course = await getCourseById(courseId)
    if (course?.has_access) {
      return true
    }
    if (attempt < POLL_MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  }
  return false
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
    status: mapEnrollmentStatus(item.status),
    instructor: item.course?.teacher_name || '',
    totalLessons: 0,
    completedLessons: 0,
  }))
}
