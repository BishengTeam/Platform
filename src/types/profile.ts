export interface OrderItem {
  icon: string
  label: string
  badge: number
}

export interface ProfileFunction {
  icon: string
  label: string
  value: string
}

export interface ProfileMenuItem {
  icon: string
  label: string
  route?: string
}

/** 对应后端 GET /api/user/profile 返回值 (UserProfileDetail schema) */
export interface UserProfileDetail {
  id: number
  openid: string
  phone: string | null
  email: string | null
  real_name: string | null
  id_card: string | null
  user_type: string | null
  gender: string | null
  education: string | null
  school: string | null
  major: string | null
  organization: string | null
  identity_status: string | null
  created_at: string
  /** 明文手机号（仅已实名时返回） */
  phone_raw: string | null
  /** 明文身份证号（仅已实名时返回） */
  id_card_raw: string | null
  /** 姓名拼音 */
  pinyin: string | null
  /** 名（拼音） */
  first_name: string | null
  /** 姓（拼音） */
  last_name: string | null
  /** 年龄（从身份证号推算） */
  age: number | null
  /** 国家 */
  country: string
  /** 语言 */
  language: string
}

/** 对应后端 PUT /api/user/profile 请求体 (UserProfileUpdate schema — 重构后仅 Level-1 字段) */
export interface UserProfileUpdatePayload {
  nickname?: string
  email?: string
  phone?: string
}

// ================================================================
// 重构后类型：GET /api/user/profile 聚合返回结构
// ================================================================

/** Level 1 — 用户可自由修改 */
export interface UserProfileL1 {
  nickname: string | null
  email: string | null
  phone: string | null
}

/** Level 2 — 实名信息（需审核） */
export interface UserRealnameL2 {
  user_type: 'student' | 'enterprise' | 'social' | null
  real_name: string | null
  id_card_number: string | null
  gender: string | null
  age: number | null
  status: string | null
  reject_reason: string | null
  verified_at: string | null
  /** 明文身份证号 — 仅已实名时返回，用于报名表单自动填表 */
  id_card_raw: string | null
}

/** Level 2 — 学生信息（需审核，仅 user_type=student） */
export interface UserStudentL2 {
  education: string | null
  school: string | null
  major: string | null
  student_card_oss: string | null
  status: string | null
  reject_reason: string | null
  verified_at: string | null
}

/** Level 2 — 企业信息（需审核，仅 user_type=enterprise） */
export interface UserEnterpriseL2 {
  organization: string | null
  status: string | null
  reject_reason: string | null
  verified_at: string | null
}

/** GET /api/user/profile 聚合返回值 */
export interface UserProfileAggregated {
  profile: UserProfileL1
  realname: UserRealnameL2
  student?: UserStudentL2
  enterprise?: UserEnterpriseL2
  level2_edit_count: number
  level2_edit_reset: string | null
}

// ================================================================
// 新增 Service 函数的请求 / 响应类型
// ================================================================

/** PUT /api/user/identity — 修改实名信息 */
export interface UpdateIdentityPayload {
  user_type?: 'student' | 'enterprise'
  real_name?: string
  id_card_number?: string
  id_card_front_oss?: string
  id_card_back_oss?: string
}

/** POST /api/user/student — 首次提交学生信息 */
export interface SubmitStudentPayload {
  education: string
  school: string
  major: string
  student_card_oss?: string
}

/** PUT /api/user/student — 修改学生信息 */
export interface UpdateStudentPayload {
  education?: string
  school?: string
  major?: string
  student_card_oss?: string
}

/** POST /api/user/enterprise — 首次提交企业信息 */
export interface SubmitEnterprisePayload {
  organization: string
}

/** PUT /api/user/enterprise — 修改企业信息 */
export interface UpdateEnterprisePayload {
  organization?: string
}
