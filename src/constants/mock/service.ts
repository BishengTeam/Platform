import type { ContactItem } from '@/types'

export const contactList: ContactItem[] = [
  { icon: 'phone', label: '电话咨询', value: '400-123-4567', action: '呼叫' },
  { icon: 'message-circle', label: '微信客服', value: '扫码添加专属客服', action: '二维码' },
  { icon: 'mail', label: '邮箱咨询', value: 'service@example.com', action: '复制' },
]
