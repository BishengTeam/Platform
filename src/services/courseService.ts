/**
 * 课程服务
 */
import { courseList, courseCategories, myCourses } from '@/constants/mock'
import { get, post } from '@/utils/request'

/** 全局开关：true=mock，false=真实API */
const USE_MOCK = false

export async function getCourseList() {
  if (USE_MOCK) return courseList
  const res = await get<any>(`/api/courses`)
  const data = res.data as any
  return data?.items || data || []
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

export async function getCourseById(id: number) {
  if (USE_MOCK) return courseList.find(c => c.id === id) || null
  const res = await get<any>(`/api/courses/${id}`)
  return res.data
}

/** GET /api/courses/me — 我的课程，适配后端 CourseEnrollmentResponse → MyCourse */
export async function getMyCourses() {
  if (USE_MOCK) return myCourses
  const res = await get<any>(`/api/courses/me`)
  const data = res.data as any
  const items = data?.items || data || []
  return items.map((item: any) => ({
    id: String(item.id),
    title: item.course?.title || '',
    cover: item.course?.cover_url || '',
    progress: 0,
    status: item.status === 'enrolled'
      ? 'active'
      : item.status === 'expired'
        ? 'expired'
        : 'pending',
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
