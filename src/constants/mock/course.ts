import type { CourseItem, CourseSession, CourseReview } from '@/types'
import type { TagFilterItem } from '@/types/registration'
import { STRINGS } from '@/constants/strings'

export const courseCategories: TagFilterItem[] = [
  { label: '全部', activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
  { label: STRINGS.STUDY_TAG_BASIC, activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#E8F2FF' },
  { label: STRINGS.STUDY_TAG_ADVANCED, activeColor: '#52C41A', activeBg: '#52C41A', activeText: '#ffffff', inactiveBg: '#F6FFED' },
  { label: STRINGS.STUDY_TAG_PRACTICAL, activeColor: '#FA8C16', activeBg: '#FA8C16', activeText: '#ffffff', inactiveBg: '#FFF7E6' },
]

const sessions: Record<string, CourseSession[]> = {
  'h3cne-rs-plus': [
    { id: 's1', label: '6月班（6.15-8.15）', price: 599, startDate: '2026-06-15', endDate: '2026-08-15' },
    { id: 's2', label: '7月班（7.1-8.30）', price: 599, startDate: '2026-07-01', endDate: '2026-08-30' },
    { id: 's3', label: '8月班（8.1-9.30）', price: 599, startDate: '2026-08-01', endDate: '2026-09-30' },
  ],
  'scsa': [
    { id: 's1', label: '6月班（6.20-8.20）', price: 799, startDate: '2026-06-20', endDate: '2026-08-20' },
    { id: 's2', label: '8月班（8.10-10.10）', price: 799, startDate: '2026-08-10', endDate: '2026-10-10' },
  ],
}

const defaultReviews: CourseReview[] = [
  { id: 'r1', userId: 'u1', userName: '张同学', avatar: '', rating: 5, content: '老师讲得很详细，实验环境也很好，顺利通过了考试！', createdAt: '2026-05-10' },
  { id: 'r2', userId: 'u2', userName: '李工', avatar: '', rating: 4, content: '课程内容覆盖面广，适合有一定基础的学员。', createdAt: '2026-05-05' },
  { id: 'r3', userId: 'u3', userName: '王同学', avatar: '', rating: 5, content: '从零基础到通过认证，感谢老师的耐心指导。', createdAt: '2026-04-28' },
]

export const courseList: CourseItem[] = [
  {
    id: 'course-network-basic',
    title: '网络工程师从入门到精通',
    description: '零基础学习网络基础知识，TCP/IP协议，路由交换技术',
    desc1: '构建中小企业网络',
    desc2: 'H3CNE 64课时',
    cover: '',
    price: 599,
    originalPrice: 799,
    duration: '64课时',
    tag: '基础课程',
    category: 'basic',
    instructor: '赵老师',
    sessions: [],
    rating: 4.7,
    reviewCount: 203,
    reviews: defaultReviews,
  },
  {
    id: 'course-h3cne-adv',
    title: 'H3CNE-RS 认证全程班',
    description: 'H3CNE认证考试全程辅导，含实验实操与考前冲刺',
    desc1: '企业级网络架构与部署',
    desc2: 'H3CNE 128课时',
    cover: '',
    price: 1200,
    originalPrice: 1500,
    duration: '128课时',
    tag: '进阶课程',
    category: 'advanced',
    instructor: '张老师',
    sessions: sessions['h3cne-rs-plus'] || [],
    rating: 4.9,
    reviewCount: 128,
    reviews: defaultReviews,
  },
  {
    id: 'course-security-practice',
    title: '网络安全实战课程',
    description: '渗透测试、漏洞分析、应急响应全流程实战',
    desc1: '安全攻防实战演练',
    desc2: '96课时 · 含实验环境',
    cover: '',
    price: 899,
    originalPrice: 1199,
    duration: '96课时',
    tag: '实战课程',
    category: 'practical',
    instructor: '陈老师',
    sessions: [],
    rating: 4.8,
    reviewCount: 67,
    reviews: defaultReviews,
  },
  {
    id: 'course-network-free',
    title: '计算机网络基础入门',
    description: '适合零基础学员，掌握网络核心概念与协议原理',
    desc1: '零基础友好 · 完全免费',
    desc2: '32课时 · 随到随学',
    cover: '',
    price: 0,
    originalPrice: 0,
    duration: '32课时',
    tag: '基础课程',
    category: 'basic',
    instructor: '赵老师',
    sessions: [],
    rating: 4.6,
    reviewCount: 356,
    reviews: defaultReviews,
  },
]
