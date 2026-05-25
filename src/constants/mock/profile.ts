import type { OrderItem, ProfileFunction, ProfileMenuItem } from '@/types'
import { STRINGS } from '@/constants/strings'

export const orderItems: OrderItem[] = [
  { icon: 'file-text', label: STRINGS.ORDERS_STATUS_PENDING, badge: 0 },
  { icon: 'map-pin', label: STRINGS.ORDERS_STATUS_ENROLLED, badge: 0 },
  { icon: 'bell', label: STRINGS.ORDERS_STATUS_CANCELLED, badge: 0 },
]

export const profileFunctions: ProfileFunction[] = []

export const profileGridItems: ProfileMenuItem[] = [
  { icon: 'shield', label: STRINGS.PROFILE_GRID_CHECKIN, route: 'pages/activity-zone/index' },
  { icon: 'users', label: STRINGS.PROFILE_GRID_GROUP_BUY },
  { icon: 'play-circle', label: STRINGS.PROFILE_GRID_MY_COURSES, route: 'pages/training/index' },
  { icon: 'trophy', label: STRINGS.PROFILE_GRID_MY_FAVORITES },
]

export const profileListItems: ProfileMenuItem[] = [
  { icon: 'file-text', label: STRINGS.PROFILE_LIST_ORDERS, route: 'pages/orders/index' },
  { icon: 'headset', label: STRINGS.PROFILE_LIST_SERVICE, route: 'pages/service/index' },
  { icon: 'send', label: STRINGS.PROFILE_LIST_SHARE },
]
