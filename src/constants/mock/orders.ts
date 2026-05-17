import type { Order } from '@/types'

export const orders: Order[] = [
  {
    id: '1',
    title: 'H3CNE 认证考试报名',
    description: '2024年6月考试批次 · 北京考场',
    status: 'pending',
    date: '2024-03-15',
    amount: '¥1xx',
  },
  {
    id: '2',
    title: 'H3CSE 高级认证考试',
    description: '2024年9月考试批次 · 上海考场',
    status: 'pending',
    date: '2024-03-10',
    amount: '¥1xx',
  },
  {
    id: '3',
    title: 'H3CNE 模拟考试',
    description: '在线模拟考试 · 不限地点',
    status: 'enrolled',
    date: '2024-02-20',
    amount: '¥1xx',
  },
  {
    id: '4',
    title: '网络工程师实战训练营',
    description: '7天线下集训 · 广州校区',
    status: 'enrolled',
    date: '2024-02-15',
    amount: '¥2xx',
  },
  {
    id: '5',
    title: 'H3CNE 考前冲刺班',
    description: '3天线上直播 · 无限回放',
    status: 'cancelled',
    date: '2024-01-28',
    amount: '¥5xx',
  },
  {
    id: '6',
    title: '新华三校园招聘内推',
    description: '2024春季校招 · 网络工程师岗位',
    status: 'cancelled',
    date: '2024-01-10',
    amount: '',
  },
]
