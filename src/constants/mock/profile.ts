import type { OrderItem, ProfileFunction, ProfileMenuItem } from '@/types'
import { STRINGS } from '@/constants/strings'

export const orderItems: OrderItem[] = [
  { icon: 'file-text', label: STRINGS.ORDERS_STATUS_PENDING, badge: 0 },
  { icon: 'map-pin', label: STRINGS.ORDERS_STATUS_ENROLLED, badge: 0 },
  { icon: 'bell', label: STRINGS.ORDERS_STATUS_CANCELLED, badge: 0 },
]

export const profileFunctions: ProfileFunction[] = []

export const profileGridItems: ProfileMenuItem[] = [
  { icon: 'play-circle', label: STRINGS.PROFILE_GRID_MY_COURSES, route: 'pages/mine/courses' },
  { icon: 'heart', label: STRINGS.PROFILE_GRID_MY_FAVORITES, route: 'pages/mine/collections' },
  { icon: 'star', label: STRINGS.MINE_POINTS_TITLE, route: 'pages/mine/points' },
  { icon: 'file-text', label: STRINGS.MINE_AGREEMENTS_TITLE, route: 'pages/mine/agreements' },
]

export const profileListItems: ProfileMenuItem[] = [
  { icon: 'file-text', label: STRINGS.PROFILE_LIST_ORDERS, route: 'pages/orders/index' },
  { icon: 'search', label: STRINGS.MINE_EXAM_QUERY_TITLE, route: 'pages/mine/exam-query' },
  { icon: 'users', label: STRINGS.PROFILE_LIST_SERVICE, route: 'pages/service/index' },
  { icon: 'send', label: STRINGS.PROFILE_LIST_SHARE, route: 'pages/mine/share' },
]
