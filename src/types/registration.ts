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
}

export interface RegistrationFormData {
  cert_id: string
  cert_name: string
  real_name: string
  phone: string
  id_card: string
  identity_type: 'personal' | 'enterprise'
  price: number
  coupon_count: number
  enterprise_name: string
}

export interface PaymentResult {
  order_id: string
  status: 'success' | 'fail'
  amount: number
  cert_name: string
}
