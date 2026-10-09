import type { OrderItem, ProfileFunction, ProfileMenuItem } from '@/types'
import { STRINGS } from '@/constants/strings'

export const orderItems: OrderItem[] = [
  { icon: 'file-text', label: STRINGS.ORDERS_STATUS_PENDING, badge: 0 },
  { icon: 'map-pin', label: STRINGS.ORDERS_STATUS_COMPLETED, badge: 0 },
  { icon: 'bell', label: STRINGS.ORDERS_STATUS_CLOSED, badge: 0 },
]

export const profileFunctions: ProfileFunction[] = []

// 学习相关入口随学习专区在线课程一起暂时下线。
// 金刚区固定 4 列：已上线功能在前，未上线位置用置灰占位卡保持网格完整。
export const profileGridItems: ProfileMenuItem[] = [
  { icon: 'star', label: STRINGS.MINE_POINTS_TITLE, route: 'pages/mine/points', iconBg: '#EFF6FF', iconColor: '#2563EB' },
  { icon: 'gift', label: STRINGS.PROFILE_GRID_COMING_SOON_TITLE, iconBg: '#F2F3F5', iconColor: '#A9AEB8', comingSoon: true },
  { icon: 'sparkles', label: STRINGS.PROFILE_GRID_COMING_SOON_TITLE, iconBg: '#F2F3F5', iconColor: '#A9AEB8', comingSoon: true },
  { icon: 'compass', label: STRINGS.PROFILE_GRID_COMING_SOON_TITLE, iconBg: '#F2F3F5', iconColor: '#A9AEB8', comingSoon: true },
]

// 功能列表分两组卡片：业务与记录 / 服务与工具。
export const profileListGroups: ProfileMenuItem[][] = [
  [
    { icon: 'file-text', label: STRINGS.PROFILE_LIST_ORDERS, route: 'pages/orders/index', iconBg: '#EFF6FF', iconColor: '#2563EB' },
    { icon: 'award', label: STRINGS.MINE_VIDEO_CODES_TITLE, route: 'pages/mine/video-codes', iconBg: '#FFF7ED', iconColor: '#EA580C' },
    { icon: 'award', label: STRINGS.PROFILE_LIST_REGISTRATIONS, route: 'pages/mine/registrations', iconBg: '#F5F3FF', iconColor: '#7C3AED' },
    { icon: 'search', label: STRINGS.MINE_EXAM_QUERY_TITLE, route: 'pages/mine/exam-query', iconBg: '#F0FDFA', iconColor: '#0D9488' },
  ],
  [
    { icon: 'check-circle-2', label: STRINGS.PROFILE_GRID_CHECKIN, route: 'pages/quiz/checkin', iconBg: '#F0FDF4', iconColor: '#16A34A' },
    { icon: 'users', label: STRINGS.PROFILE_LIST_SERVICE, route: 'pages/service/index', iconBg: '#EEF2FF', iconColor: '#4F46E5' },
    { icon: 'send', label: STRINGS.PROFILE_LIST_SHARE, route: 'pages/mine/share', iconBg: '#ECFEFF', iconColor: '#0891B2' },
    { icon: 'settings', label: STRINGS.PROFILE_SETTINGS, route: 'pages/mine/profile', iconBg: '#F3F4F6', iconColor: '#4B5563' },
  ],
]
