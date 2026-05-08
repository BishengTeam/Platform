import type { EmploymentBannerItem, Job, EmploymentTagFilter } from '@/types'

export const employmentBannerItems: EmploymentBannerItem[] = [
  { id: 'profile', title: '好工作 好未来', description: '海量优质岗位，专业就业指导，助你找到心仪工作', gradient: 'gradient-teal', icon: 'briefcase', buttonText: '我的求职', buttonColor: '#ffffff' },
  { id: 1, title: '网络工程师', description: '华为技术有限公司 · 深圳 · 1-3年经验', gradient: 'gradient-red', icon: 'briefcase', buttonText: '立即投递', buttonColor: '#ffffff' },
  { id: 2, title: '网络安全工程师', description: '阿里巴巴集团 · 杭州 · 3-5年经验', gradient: 'gradient-orange', icon: 'briefcase', buttonText: '立即投递', buttonColor: '#ffffff' },
  { id: 3, title: '网络安全顾问', description: '奇安信科技集团 · 北京 · 5-10年经验', gradient: 'gradient-purple', icon: 'briefcase', buttonText: '立即投递', buttonColor: '#ffffff' },
]

export const jobList: Job[] = [
  { id: 1, title: '网络工程师', company: '华为技术有限公司', location: '深圳', salary: '1x-2xK', experience: '1-3年', education: '本科' },
  { id: 2, title: '网络安全工程师', company: '阿里巴巴集团', location: '杭州', salary: '2x-3xK', experience: '3-5年', education: '本科' },
  { id: 3, title: '运维工程师', company: '腾讯科技有限公司', location: '深圳', salary: '1x-3xK', experience: '2-4年', education: '本科' },
  { id: 4, title: 'H3C网络工程师', company: '新华三技术有限公司', location: '杭州', salary: '1x-2xK', experience: '1-3年', education: '大专' },
  { id: 5, title: '网络技术支持工程师', company: '中兴通讯股份有限公司', location: '上海', salary: '1x-1xK', experience: '应届生', education: '本科' },
  { id: 6, title: '网络安全顾问', company: '奇安信科技集团', location: '北京', salary: '2x-4xK', experience: '5-10年', education: '硕士' },
]

export const employmentTagFilters: EmploymentTagFilter[] = [
  { label: '推荐职位', activeColor: '#13C2C2', activeBg: '#13C2C2', activeText: '#ffffff' },
  { label: '实习岗位', activeColor: '#13C2C2', activeBg: '#13C2C2', activeText: '#ffffff' },
  { label: '全职岗位', activeColor: '#13C2C2', activeBg: '#13C2C2', activeText: '#ffffff' },
  { label: '远程岗位', activeColor: '#13C2C2', activeBg: '#13C2C2', activeText: '#ffffff' },
]
