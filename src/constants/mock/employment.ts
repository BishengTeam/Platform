import { STRINGS } from '@/constants/strings'
import type { Job, EmploymentTagFilter } from '@/types'

export const jobList: Job[] = [
  { id: 1, title: '网络工程师', company: '华为技术有限公司', location: '深圳', salary: '1x-2xK', originalPrice: '￥1500', experience: '1-3年', education: '本科' },
  { id: 2, title: '网络安全工程师', company: '阿里巴巴集团', location: '杭州', salary: '2x-3xK', originalPrice: '￥1500', experience: '3-5年', education: '本科' },
  { id: 3, title: '运维工程师', company: '腾讯科技有限公司', location: '深圳', salary: '1x-3xK', experience: '2-4年', education: '本科' },
  { id: 4, title: 'H3C网络工程师', company: '新华三技术有限公司', location: '杭州', salary: '1x-2xK', experience: '1-3年', education: '大专' },
  { id: 5, title: '网络技术支持工程师', company: '中兴通讯股份有限公司', location: '上海', salary: '1x-1xK', experience: '应届生', education: '本科' },
  { id: 6, title: '网络安全顾问', company: '奇安信科技集团', location: '北京', salary: '2x-4xK', experience: '5-10年', education: '硕士' },
]

export const employmentTagFilters: EmploymentTagFilter[] = [
  { label: STRINGS.EMPLOYMENT_TAG_ALL, activeColor: '#13C2C2', activeBg: '#13C2C2', activeText: '#ffffff', inactiveBg: '#E6FFFB' },
  { label: STRINGS.EMPLOYMENT_TAG_RECOMMEND, activeColor: '#13C2C2', activeBg: '#13C2C2', activeText: '#ffffff', inactiveBg: '#E6FFFB' },
  { label: STRINGS.EMPLOYMENT_TAG_INTERN, activeColor: '#13C2C2', activeBg: '#13C2C2', activeText: '#ffffff', inactiveBg: '#E6FFFB' },
  { label: STRINGS.EMPLOYMENT_TAG_FULLTIME, activeColor: '#13C2C2', activeBg: '#13C2C2', activeText: '#ffffff', inactiveBg: '#E6FFFB' },
  { label: STRINGS.EMPLOYMENT_TAG_REMOTE, activeColor: '#13C2C2', activeBg: '#13C2C2', activeText: '#ffffff', inactiveBg: '#E6FFFB' },
]
