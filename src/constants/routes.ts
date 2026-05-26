import { STRINGS } from '@/constants/strings'

export const ROUTES = {
  AUTH: 'pages/auth/index',
  INDEX: 'pages/index/index',
  ZONES: 'pages/zones/index',
  ACTIVITY: 'pages/activity-zone/index',
  SERVICE: 'pages/service/index',
  PROFILE: 'pages/profile/index',
  ORDERS: 'pages/orders/index',
  REGISTRATION_INDEX: 'pages/registration/index',
  REGISTRATION_FORM: 'pages/registration/form',
  REGISTRATION_FORM_SANGFOR: 'pages/registration/form-sangfor',
  REGISTRATION_FORM_NISP: 'pages/registration/form-nisp',
  REGISTRATION_FORM_RENSHE: 'pages/registration/form-renshe',
  REGISTRATION_XUEXIN_GUIDE: 'pages/registration/xuexin-guide',
  REGISTRATION_CONFIRM: 'pages/registration/confirm',
  PAYMENT_RESULT: 'pages/payment/result',
  ORDER_DETAIL: 'pages/order-detail/index',
  AI_CONSULT: 'pages/ai-consult/index',
  COURSE_INDEX: 'pages/course/index',
  COURSE_DETAIL: 'pages/course/detail',
  QUIZ_INDEX: 'pages/quiz/index',
  QUIZ_PRACTICE: 'pages/quiz/practice',
  QUIZ_WRONG_BOOK: 'pages/quiz/wrong-book',
  QUIZ_COLLECTIONS: 'pages/quiz/collections',
  QUIZ_CHECKIN: 'pages/quiz/checkin',
  MINE_COURSES: 'pages/mine/courses',
  MINE_PROFILE: 'pages/mine/profile',
  MINE_POINTS: 'pages/mine/points',
  MINE_AGREEMENTS: 'pages/mine/agreements',
  MINE_COLLECTIONS: 'pages/mine/collections',
  MINE_EXAM_QUERY: 'pages/mine/exam-query',
  MINE_EXAM_INTENTION: 'pages/mine/exam-intention',
  MINE_CONTACT_TEACHERS: 'pages/mine/contact-teachers',
  MINE_SHARE: 'pages/mine/share',
  MINE_DEACTIVATE: 'pages/mine/deactivate',
  LOGIN_POSTER: 'pages/login-poster/index',
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
