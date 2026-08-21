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

/** 课程章节 */
export interface CourseChapter {
  id: number
  course_id?: number
  title: string
  duration: number
  sort_order: number
  is_preview: boolean
  can_play: boolean
}

/** 课程购买/报名接口响应 */
export interface CoursePurchaseResponse {
  learning_access: boolean
  payment_required: boolean
  order_id: number | null
}

/** 私有课程资源 */
export interface CourseChapters {
  preview_chapter_count: number
  chapters: CourseChapter[]
}

/** 章节私有播放地址 */
export interface CourseChapterPlayback {
  chapter_id: number
  url: string
  expires_at: number
}

export interface CourseChapterProgress {
  last_chapter_id: number | null
  last_position_seconds: number
  completed_chapter_ids: number[]
}

/** 课程的一次具体上课安排 */
export interface CourseSchedule {
  class_date: string
  start_time: string
  end_time: string
  location?: string | null
}

export interface CourseQuizLibrarySummary {
  id: number
  library_code: string
  name: string
  description: string | null
  cover_url: string | null
  status: 'draft' | 'published' | 'suspended'
  available: boolean
}

/** 课程详情 — 对齐 Backend CourseDetailResponse */
export interface CourseDetail {
  id: number
  title: string
  category: string
  description: string | null
  cover_url: string
  price: number
  price_yuan: string
  teacher_name: string | null
  status: 'draft' | 'published' | 'offline' | 'archived'
  /** 当前用户是否有学习权限 */
  has_access: boolean
  /** 报名记录 ID（已报名时返回） */
  enrollment_id: number | null
  /** 章节列表 */
  chapters: CourseChapter[]
  preview_chapter_count: number
  chapter_count: number
  /** 购买课程后赠送的题库；展示资料始终读取当前绑定状态 */
  included_quiz_libraries: CourseQuizLibrarySummary[]
}
