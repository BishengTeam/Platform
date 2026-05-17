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
  { key: 'pages/index/index', label: '对话', icon: 'message-square' },
  { key: 'pages/activity-zone/index', label: '活动', icon: 'gift' },
  { key: 'pages/profile/index', label: '我的', icon: 'profile' },
]

export const ZONE_ROUTES: Record<string, string> = {
  '认证专区': '/pages/registration/index',
  '学习专区': '/pages/study-zone/index',
  '竞赛专区': '/pages/competition-zone/index',
  '活动专区': '/pages/activity-zone/index',
  '就业专区': '/pages/employment-zone/index',
}
