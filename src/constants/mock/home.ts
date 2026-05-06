import type { ZoneIcon, Message } from '@/types'

export const zoneIcons: ZoneIcon[] = [
  { id: 'exam', name: '考试专区', icon: 'book-open', color: '#1677FF', bg: '#E6F7FF' },
  { id: 'learn', name: '学习专区', icon: 'layout-template', color: '#597EF7', bg: '#F0F5FF' },
  { id: 'compete', name: '竞赛专区', icon: 'trophy', color: '#FA8C16', bg: '#FFF7E6' },
  { id: 'activity', name: '活动专区', icon: 'gift', color: '#722ED1', bg: '#F9F0FF' },
  { id: 'job', name: '就业专区', icon: 'briefcase', color: '#13C2C2', bg: '#E6FFFB' },
]

export const quickQuestions: string[] = [
  '如何报名参加认证？',
  'H3CNE考试费用是多少？',
  '最近有哪些热门竞赛？',
  '如何获取学习资料？',
]

export const initialMessages: Message[] = [
  { id: 1, type: 'ai', text: '你好！我是你的智能助手，有什么我可以帮你的吗？' },
]
