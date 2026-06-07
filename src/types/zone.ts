/**
 * Zone 聚合响应类型 — 对应后端 app/schemas/zone.py
 *
 * 后端 Zone 模块已按聚合端点设计实现，前端收敛为 7 个端点调用。
 */

// ============================================================
// 原子类型
// ============================================================

/** Banner 条目 */
export interface BannerBrief {
  id: number
  image_url: string
  jump_link: string | null
  sort: number
}

/** Zone 专区卡片（完整版，各专区端点使用） */
export interface ZoneBrief {
  id: number
  zone_type: string
  title: string
  cover_url: string | null
  description: string | null
  link_url: string | null
  gradient?: string | null
  icon?: string | null
  tag?: string | null
  tagColor?: string | null
  sort_order: number
}

/** 课程简要 */
export interface CourseBrief {
  id: number
  title: string
  category: string
  description: string | null
  cover_url: string | null
  price: number
  teacher_name: string | null
}

/** 竞赛报名简要 */
export interface CompetitionBrief {
  id: number
  competition_name: string
  school: string
  track: string | null
  created_at: string // ISO 8601
}

/** 活动简要 */
export interface ActivityBrief {
  id: number
  title: string
  description: string | null
  cover_url: string | null
  location: string | null
  start_time: string | null // ISO 8601
  end_time: string | null   // ISO 8601
  max_participants: number
}

/** 岗位简要 */
export interface JobBrief {
  id: number
  title: string
  company: string
  location: string | null
  salary_range: string | null
  description: string | null
  requirements: string | null
  contact_info: string | null
}

/** 认证项目 */
export interface CertificationResponse {
  id: number
  name: string
  chinese_name: string
  code: string
  vendor: 'H3C' | '深信服' | 'NISP' | '人社'
  requires_xuexin: boolean
  pay_first: boolean
}

/** 训练/培训简要 */
export interface TrainingBrief {
  id: number
  title: string
  description: string | null
  cover_url: string | null
}

/** 单个专区的聚合数据块 */
export interface ZoneSectionData {
  items: ZoneBrief[]
  courses?: CourseBrief[] | null
  activities?: ActivityBrief[] | null
  certifications?: CertificationResponse[] | null
  trainings?: TrainingBrief[] | null
}

// ============================================================
// 聚合响应体
// ============================================================

/** GET /api/zones 首页聚合 */
export interface HomeAggregationResponse {
  banners: BannerBrief[]
  zones: Record<string, ZoneSectionData> // key = "cert"|"study"|"competition"|"activity"|"employment"
}

// ============================================================
// 扩展类型 — 带 pricing 等表单需要的前端展示字段
// ============================================================

export interface CertificationDetail extends CertificationResponse {
  price: number
  examCode: string
  examDuration: string
  questionCount: number
  passingScore: number
}
