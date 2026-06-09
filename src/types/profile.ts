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

/** 对应后端 PUT /api/user/profile 请求体 (UserProfileUpdate schema) */
export interface UserProfileUpdatePayload {
  phone?: string
  email?: string
  gender?: string
  education?: string
  school?: string
  major?: string
  organization?: string
}
