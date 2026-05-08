import type { ExamBannerItem, ExamCard, ExamTagFilter } from '@/types'

export const examBannerItems: ExamBannerItem[] = [
  { id: 1, title: 'H3CNE 认证考试季', description: '报名立享8折优惠，通过率高达95%', gradient: 'gradient-blue', icon: 'award', buttonText: '立即查看', buttonColor: '#ffffff' },
  { id: 2, title: '软考中级网络工程师', description: '2024年最新考纲，全套备考资料免费领取', gradient: 'gradient-purple', icon: 'award', buttonText: '立即查看', buttonColor: '#ffffff' },
  { id: 3, title: '华为认证HCIA', description: '零基础入门到精通，实战项目贯穿全程', gradient: 'gradient-orange', icon: 'award', buttonText: '立即查看', buttonColor: '#ffffff' },
]

export const examCards: ExamCard[] = [
  { id: 1, title: 'H3CNE 认证考试', description: '构建中小企业网络，开启网络工程师之路', price: '¥6xx', originalPrice: '¥8xx', duration: '120分钟', questions: '100道题', passingScore: '60分及格', tag: '新华三', tagColor: '#FF4D4F' },
  { id: 2, title: '软考中级网络工程师', description: '国家职业资格认证，评职称必备', price: '¥3xx', originalPrice: '¥4xx', duration: '150分钟', questions: '75道题', passingScore: '45分及格', tag: '软考', tagColor: '#52C41A' },
  { id: 3, title: '华为HCIA认证', description: 'ICT行业入门认证，全球认可', price: '¥5xx', originalPrice: '¥6xx', duration: '90分钟', questions: '60道题', passingScore: '60分及格', tag: '华为', tagColor: '#FF4D4F' },
  { id: 4, title: '深信服SCSA认证', description: '安全行业入门首选认证', price: '¥7xx', originalPrice: '¥9xx', duration: '120分钟', questions: '100道题', passingScore: '60分及格', tag: '深信服', tagColor: '#722ED1' },
  { id: 5, title: '全国计算机等级考试四级', description: '计算机等级最高级，能力证明', price: '¥1xx', originalPrice: '¥2xx', duration: '120分钟', questions: '60道题', passingScore: '60分及格', tag: '软考', tagColor: '#52C41A' },
  { id: 6, title: '深信服安全工程师认证', description: '网络安全行业必备认证', price: '¥8xx', originalPrice: '¥10xx', duration: '150分钟', questions: '80道题', passingScore: '70分及格', tag: '深信服', tagColor: '#722ED1' },
]

export const examTagFilters: ExamTagFilter[] = [
  { label: '全部', activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
  { label: '新华三', activeColor: '#FF4D4F', activeBg: '#FF4D4F', activeText: '#ffffff', inactiveBg: '#FFF2F0' },
  { label: '华为', activeColor: '#FA8C16', activeBg: '#FA8C16', activeText: '#ffffff', inactiveBg: '#FFF7E6' },
  { label: '深信服', activeColor: '#722ED1', activeBg: '#722ED1', activeText: '#ffffff', inactiveBg: '#F9F0FF' },
  { label: '软考', activeColor: '#52C41A', activeBg: '#52C41A', activeText: '#ffffff', inactiveBg: '#F6FFED' },
]
