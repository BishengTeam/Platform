export interface TagFilterItem {
  label: string
  activeColor: string
  activeBg: string
  activeText: string
  inactiveBg: string
  inactiveStyle?: Record<string, string>
}

export interface Certification {
  id: string
  name: string
  description: string
  price: number
  originalPrice: number
  vendor: string
  category: string
  categoryName: string
  examDuration: string
  questionCount: number
  passingScore: number
  examCode: string
  enterprisePrice?: number
  studentPrice?: number
}

export interface RegistrationFormData {
  cert_id: string
  cert_name: string
  real_name: string
  first_name?: string
  last_name?: string
  gender?: 'male' | 'female'
  phone: string
  email?: string
  id_card: string
  identity_type: 'personal' | 'enterprise'
  price: number
  coupon_count: number
  enterprise_name: string
  education?: string
  organization?: string
  exam_date?: string
  country?: string
  language?: string
  xuexin_code?: string
}

export interface PaymentResult {
  order_id: string
  status: 'success' | 'fail'
  amount: number
  cert_name: string
}

export interface SangforFormData {
  real_name: string
  phone: string
  id_card: string
  identity_type: 'personal' | 'enterprise'
  mailing_address: string
  organization: string
  exam_direction: string
  verification_code: string
  price: number
}

export interface NispFormData {
  name: string
  pinyin: string
  id_card: string
  phone: string
  email: string
  school: string
  major: string
  province: string
  training_type: string
  level: '1' | '2'
  gender?: string
  age?: number
  education?: string
  address?: string
  zip_code?: string
  institution?: string
  price: number
}

export interface RensheFormData {
  real_name: string
  phone: string
  id_card: string
  branch: string
  price: number
}
