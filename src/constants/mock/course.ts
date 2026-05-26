import type { CourseItem, CourseSession, CourseReview } from '@/types'
import type { TagFilterItem } from '@/types/registration'
import { STRINGS } from '@/constants/strings'

export const courseCategories: TagFilterItem[] = [
  { label: STRINGS.COURSE_CATEGORY_ALL, activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
  { label: STRINGS.TAG_H3C, activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#E8F2FF' },
  { label: STRINGS.TAG_SANGFOR, activeColor: '#52C41A', activeBg: '#52C41A', activeText: '#ffffff', inactiveBg: '#F6FFED' },
  { label: STRINGS.TAG_NISP, activeColor: '#FA8C16', activeBg: '#FA8C16', activeText: '#ffffff', inactiveBg: '#FFF7E6' },
  { label: STRINGS.TAG_RENSHE, activeColor: '#E84565', activeBg: '#E84565', activeText: '#ffffff', inactiveBg: '#FFF0F3' },
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
    id: 'course-h3cne', title: 'H3CNE-RS+ 系统培训课程', description: '从零基础到认证通关，含实验实操',
    cover: '', price: 599, originalPrice: 799, duration: '128课时', tag: '华三认证', category: 'h3c',
    instructor: '张老师', sessions: sessions['h3cne-rs-plus'] || [], rating: 4.8, reviewCount: 128, reviews: defaultReviews,
  },
  {
    id: 'course-scsa', title: '深信服安全技术认证培训', description: '网络安全基础与实操，SCSA认证直达',
    cover: '', price: 799, originalPrice: 999, duration: '96课时', tag: '深信服认证', category: 'sangfor',
    instructor: '李老师', sessions: sessions['scsa'] || [], rating: 4.6, reviewCount: 86, reviews: defaultReviews,
  },
  {
    id: 'course-nisp1', title: 'NISP 一级信息安全基础', description: '国家信息安全水平考试一级培训',
    cover: '', price: 299, originalPrice: 399, duration: '48课时', tag: 'NISP认证', category: 'nisp',
    instructor: '王老师', sessions: [{ id: 's1', label: '随报随学', price: 299, startDate: '', endDate: '' }], rating: 4.5, reviewCount: 56, reviews: defaultReviews,
  },
  {
    id: 'course-network', title: '网络工程师入门到精通', description: '零基础学习网络基础知识，TCP/IP协议，路由交换技术',
    cover: '', price: 0, originalPrice: 0, duration: '64课时', tag: '免费课程', category: 'free',
    instructor: '赵老师', sessions: [], rating: 4.7, reviewCount: 203, reviews: defaultReviews,
  },
  {
    id: 'course-cloud', title: '云计算基础与实践', description: '云计算概念、虚拟化技术、OpenStack入门',
    cover: '', price: 399, originalPrice: 599, duration: '72课时', tag: '云计算', category: 'free',
    instructor: '孙老师', sessions: [], rating: 4.3, reviewCount: 45, reviews: defaultReviews,
  },
  {
    id: 'course-security', title: '网络安全攻防实战', description: '渗透测试、漏洞分析、应急响应全流程',
    cover: '', price: 899, originalPrice: 1199, duration: '96课时', tag: '安全技术', category: 'paid',
    instructor: '陈老师', sessions: [], rating: 4.9, reviewCount: 67, reviews: defaultReviews,
  },
]
