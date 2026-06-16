/**
 * 课程类型 — 对齐 Backend app/schemas/course.py
 *
 * 2026-06-16：新增 CourseDetail，字段完全对齐后端 CourseDetailResponse。
 * CourseSession / CourseReview / CourseItem 保留仅用于 mock 过渡，后续移除。
 */

/** @deprecated 后端使用 batches (dict)，无 sessions 结构。mock 过渡期保留。 */
export interface CourseSession {
  id: string
  label: string
  price: number
  startDate: string
  endDate: string
}

/** @deprecated 后端无评价模块。mock 过渡期保留。 */
export interface CourseReview {
  id: string
  userId: string
  userName: string
  avatar: string
  rating: number
  content: string
  createdAt: string
}

/** @deprecated 已被 CourseDetail 取代。mock 过渡期保留。 */
export interface CourseItem {
  id: string
  title: string
  description: string
  desc1?: string
  desc2?: string
  cover: string
  price: number
  originalPrice: number
  duration: string
  tag: string
  category: string
  instructor: string
  sessions: CourseSession[]
  rating: number
  reviewCount: number
  reviews: CourseReview[]
}

/** 课程详情 — 对齐 Backend CourseDetailResponse */
export interface CourseDetail {
  id: number
  title: string
  category: string
  description: string | null
  cover_url: string | null
  video_url: string | null
  price: number
  /** 班次信息，JSON 对象 */
  batches: Record<string, unknown> | null
  teacher_name: string | null
  teacher_contact: string | null
}
