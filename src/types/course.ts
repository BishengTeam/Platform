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
  title: string
  video_url: string | null
  duration: number | null
  sort_order: number
}

/** 课程购买/报名接口响应 */
export interface CoursePurchaseResponse {
  learning_access: boolean
  payment_required: boolean
  order_id: number | null
}

/** 私有课程资源 */
export interface CourseAsset {
  id: number
  course_id: number
  title: string
  asset_type: string
  sort_order: number
  is_preview: boolean
  content_url: string
}

/** 课程内容（学习页），对齐 Backend CourseContentResponse */
export interface CourseContent {
  course_id: number
  title: string
  learning_access: boolean
  assets: CourseAsset[]
}

/** 私有资源短期播放地址 */
export interface CourseAssetPlayback {
  asset_id: number
  url: string
  expires_at: number
}

/** 课程的一次具体上课安排 */
export interface CourseSchedule {
  class_date: string
  start_time: string
  end_time: string
  location?: string | null
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
  /** 上课安排，键为内部 ID */
  batches: Record<string, CourseSchedule> | null
  teacher_name: string | null
  teacher_contact: string | null
  /** 当前用户是否有学习权限 */
  has_access: boolean
  /** 报名记录 ID（已报名时返回） */
  enrollment_id: number | null
  /** 章节列表 */
  chapters: CourseChapter[]
  /** 试看时长（秒） */
  free_preview_seconds: number | null
}
