import { STRINGS } from '@/constants/strings'

export const ROUTES = {
  AUTH: 'pages/auth/index',
  INDEX: 'pages/index/index',
  ZONES: 'pages/zones/index',
  ACTIVITY: 'pages/activity-zone/index',
  SERVICE: 'pages/service/index',
  PROFILE: 'pages/profile/index',
  ORDERS: 'pages/orders/index',
  CERTIFICATES: 'pages/certificates/index',
  FEEDBACK: 'pages/feedback/index',
  NOTIFICATIONS: 'pages/notifications/index',
  REGISTRATION_INDEX: 'pages/registration/index',
  REGISTRATION_FORM: 'pages/registration/form',
  REGISTRATION_CONFIRM: 'pages/registration/confirm',
  PAYMENT_RESULT: 'pages/payment/result',
  AI_CONSULT: 'pages/ai-consult/index',
} as const

export const TAB_BAR_CONFIG = [
  { key: 'pages/index/index', label: STRINGS.TAB_HOME, icon: 'home' },
  { key: 'pages/training/index', label: STRINGS.TAB_TRAINING, icon: 'book-open' },
  { key: 'pages/activity-zone/index', label: STRINGS.TAB_DISCOVER, icon: 'gift' },
  { key: 'pages/profile/index', label: STRINGS.TAB_PROFILE, icon: 'profile' },
]

export const ZONE_ROUTES: Record<string, string> = {
  exam: '/pages/registration/index',
  learn: '/pages/training/index',
  compete: '/pages/competition-zone/index',
  activity: '/pages/activity-zone/index',
  job: '/pages/employment-zone/index',
}

export const ZONE_ROUTE_KEYS = ['exam', 'learn', 'compete', 'activity', 'job'] as const
