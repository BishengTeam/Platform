/**
 * 课程服务
 */
import { courseList, courseCategories, myCourses } from '@/constants/mock'
import { get, post } from '@/utils/request'

/** 全局开关：true=mock，false=真实API */
const USE_MOCK = false

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

export async function getMyCourses() {
  if (USE_MOCK) return myCourses
  const res = await get<any[]>(`/api/courses/my`)
  return res.data
}

/** POST /api/courses/enroll — 课程报名 */
export async function enrollCourse(courseId: number): Promise<void> {
  if (USE_MOCK) return
  await post('/api/courses/enroll', { course_id: courseId })
}
