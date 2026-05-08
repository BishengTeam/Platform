import type { OrderItem, ProfileFunction } from '@/types'

export const orderItems: OrderItem[] = [
  { icon: 'file-text', label: '待付款', badge: 0 },
  { icon: 'map-pin', label: '已报名', badge: 0 },
  { icon: 'bell', label: '已取消', badge: 0 },
]

export const profileFunctions: ProfileFunction[] = [
  { icon: 'file-text', label: '证书中心', value: '2本' },
  { icon: 'message-square', label: '问题反馈', value: '' },
  { icon: 'bell', label: '消息通知', value: '' },
]
