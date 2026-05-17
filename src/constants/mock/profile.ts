import type { OrderItem, ProfileFunction } from '@/types'
import { STRINGS } from '@/constants/strings'

export const orderItems: OrderItem[] = [
  { icon: 'file-text', label: STRINGS.ORDERS_STATUS_PENDING, badge: 0 },
  { icon: 'map-pin', label: STRINGS.ORDERS_STATUS_ENROLLED, badge: 0 },
  { icon: 'bell', label: STRINGS.ORDERS_STATUS_CANCELLED, badge: 0 },
]

export const profileFunctions: ProfileFunction[] = [
  { icon: 'file-text', label: STRINGS.FUNC_LIST_CERTIFICATES, value: '2本' },
  { icon: 'message-square', label: STRINGS.FUNC_LIST_FEEDBACK, value: '' },
  { icon: 'bell', label: STRINGS.FUNC_LIST_NOTIFICATIONS, value: '' },
]
