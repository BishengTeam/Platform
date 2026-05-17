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

export interface HomeCard {
  id: number
  title: string
  description: string
  gradient: string
  icon: string
  tag: string
  tagColor: string
  tall: boolean
}

export const homeCourses: HomeCard[] = [
  {
    id: 1,
    title: '网络工程师入门到精通',
    description: '零基础学习网络基础知识',
    gradient: 'linear-gradient(135deg, #1677FF, #4096FF)',
    icon: 'book-open',
    tag: '热门',
    tagColor: '#FF4D4F',
    tall: true,
  },
  {
    id: 2,
    title: 'H3CNE认证全程班',
    description: '华三认证考试全套课程',
    gradient: 'linear-gradient(135deg, #52C41A, #73D13D)',
    icon: 'award',
    tag: '认证',
    tagColor: '#1677FF',
    tall: false,
  },
  {
    id: 3,
    title: '网络安全实战课程',
    description: '掌握常见漏洞攻防技术',
    gradient: 'linear-gradient(135deg, #FA8C16, #FFC53D)',
    icon: 'shield',
    tag: '实战',
    tagColor: '#FA8C16',
    tall: false,
  },
  {
    id: 4,
    title: 'Python网络自动化',
    description: '自动化运维提升效率',
    gradient: 'linear-gradient(135deg, #722ED1, #9254DE)',
    icon: 'terminal',
    tag: '进阶',
    tagColor: '#722ED1',
    tall: true,
  },
]

export const homeActivities: HomeCard[] = [
  {
    id: 1,
    title: 'H3CNE线下实训营',
    description: '7天集中培训·北京站',
    gradient: 'linear-gradient(135deg, #13C2C2, #36CFC9)',
    icon: 'users',
    tag: '线下',
    tagColor: '#13C2C2',
    tall: false,
  },
  {
    id: 2,
    title: '网络技术直播大讲堂',
    description: '资深工程师在线分享',
    gradient: 'linear-gradient(135deg, #FF4D4F, #FF7875)',
    icon: 'play-circle',
    tag: '直播',
    tagColor: '#FF4D4F',
    tall: true,
  },
  {
    id: 3,
    title: '2026校园招聘宣讲会',
    description: '名企HR面对面交流',
    gradient: 'linear-gradient(135deg, #FA8C16, #FFC53D)',
    icon: 'briefcase',
    tag: '招聘',
    tagColor: '#FA8C16',
    tall: true,
  },
  {
    id: 4,
    title: '开源技术沙龙·上海站',
    description: '前沿技术分享交流',
    gradient: 'linear-gradient(135deg, #597EF7, #85A5FF)',
    icon: 'coffee',
    tag: '沙龙',
    tagColor: '#597EF7',
    tall: false,
  },
]
