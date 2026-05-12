import type { ZoneIcon, Message } from '@/types'

export const zoneIcons: ZoneIcon[] = [
  { id: 'exam', name: '认证专区', icon: 'book-open', color: '#1677FF', bg: '#E6F7FF' },
  { id: 'learn', name: '学习专区', icon: 'layout-template', color: '#597EF7', bg: '#F0F5FF' },
  { id: 'compete', name: '竞赛专区', icon: 'trophy', color: '#FA8C16', bg: '#FFF7E6' },
  { id: 'activity', name: '活动专区', icon: 'gift', color: '#722ED1', bg: '#F9F0FF' },
  { id: 'job', name: '就业专区', icon: 'briefcase', color: '#13C2C2', bg: '#E6FFFB' },
]

export const quickQuestions: string[] = [
  '如何报名 H3CNE 认证？',
  '有哪些学习课程推荐？',
  '最近有什么竞赛？',
  '帮我推荐就业方向',
]

export const initialMessages: Message[] = [
  { id: 1, type: 'ai', text: '您好！我是智天远智能助手 👋\n\n我可以帮您查询考试认证、推荐学习课程、了解竞赛活动、对接就业岗位。您可以直接向我提问，也可以点击下方专区入口快速浏览。\n\n请问有什么可以帮您的？' },
]
