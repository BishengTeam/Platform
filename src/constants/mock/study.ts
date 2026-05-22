import { STRINGS } from '@/constants/strings'
import type { StudyBannerItem, Course, StudyTagFilter } from '@/types'

export const studyBannerItems: StudyBannerItem[] = [
  { id: 'profile', title: '学习成就未来', description: '海量优质课程，助你成为网络技术专家', gradient: 'gradient-green', icon: 'book-open', buttonText: STRINGS.STUDY_VIEW_MY, buttonColor: '#ffffff' },
  { id: 1, title: '网络工程师入门到精通', description: '零基础学习网络基础知识，TCP/IP协议，路由交换技术', gradient: 'gradient-red', icon: 'book-open', buttonText: STRINGS.STUDY_ENROLL, buttonColor: '#ffffff' },
  { id: 2, title: 'H3CNE认证全程班', description: '针对华三认证考试的全套课程，包含题库和模拟考试', gradient: 'gradient-blue', icon: 'book-open', buttonText: STRINGS.STUDY_ENROLL, buttonColor: '#ffffff' },
  { id: 3, title: '华为HCIA认证培训', description: '华为官方认证课程，讲师均为华为认证HCIE专家', gradient: 'gradient-orange', icon: 'book-open', buttonText: STRINGS.STUDY_ENROLL, buttonColor: '#ffffff' },
]

export const courseList: Course[] = [
  { id: 1, title: '网络工程师入门到精通', description: '零基础学习网络基础知识，TCP/IP协议，路由交换技术', price: '¥2xx', originalPrice: '¥3xx', duration: '48小时', tag: '热门' },
  { id: 2, title: 'H3CNE认证全程班', description: '针对华三认证考试的全套课程，包含题库和模拟考试', price: '¥4xx', originalPrice: '¥6xx', duration: '36小时', tag: '认证' },
  { id: 3, title: '华为HCIA认证培训', description: '华为官方认证课程，讲师均为华为认证HCIE专家', price: '¥5xx', originalPrice: '¥7xx', duration: '40小时', tag: '推荐' },
  { id: 4, title: '网络安全实战课程', description: '从入门到精通，掌握常见漏洞攻防和安全防护技术', price: '¥6xx', originalPrice: '¥9xx', duration: '60小时', tag: '实战' },
  { id: 5, title: '软考中级网络工程师', description: '国家软考指定培训课程，通过率高达90%', price: '¥3xx', originalPrice: '¥5xx', duration: '32小时', tag: '公职' },
  { id: 6, title: 'Python网络自动化', description: '学习用Python实现网络自动化运维，提升工作效率', price: '¥4xx', originalPrice: '¥6xx', duration: '28小时', tag: '进阶' },
]

export const studyTagFilters: StudyTagFilter[] = [
  { label: STRINGS.STUDY_TAG_ALL, activeColor: '#52C41A', activeBg: '#52C41A', activeText: '#ffffff', inactiveBg: '#F6FFED' },
  { label: STRINGS.STUDY_TAG_BASIC, activeColor: '#52C41A', activeBg: '#52C41A', activeText: '#ffffff', inactiveBg: '#F6FFED' },
  { label: STRINGS.STUDY_TAG_ADVANCED, activeColor: '#52C41A', activeBg: '#52C41A', activeText: '#ffffff', inactiveBg: '#F6FFED' },
  { label: STRINGS.STUDY_TAG_PRACTICAL, activeColor: '#52C41A', activeBg: '#52C41A', activeText: '#ffffff', inactiveBg: '#F6FFED' },
  { label: STRINGS.STUDY_TAG_CERTIFICATION, activeColor: '#52C41A', activeBg: '#52C41A', activeText: '#ffffff', inactiveBg: '#F6FFED' },
]
